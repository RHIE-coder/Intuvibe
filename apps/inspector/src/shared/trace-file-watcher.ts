// shared/trace-file-watcher.ts — fs.watch → WatcherEvent.
// Store 를 직접 몰라도 되게 callbacks 인터페이스로 의존성 역전.

import { EventEmitter } from 'node:events';
import { readFileSync, readdirSync, statSync, watch, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { TraceRecord } from './trace.js';
import { parseAppended } from './trace-file-reader.js';

export type WatcherEvent =
  | { type: 'record'; session_id: string; record: TraceRecord }
  | { type: 'session_added'; session_id: string };

export interface WatcherCallbacks {
  isKnownSession(sessionId: string): boolean;
  registerSession(sessionId: string): void;
  getFileLength(sessionId: string): number;
  setFileLength(sessionId: string, length: number): void;
  appendRecords(sessionId: string, records: TraceRecord[]): void;
}

export interface TraceFileWatcherOptions {
  // tracesDir 미존재 시 생성 여부를 폴링할 주기(ms).
  pollIntervalMs?: number;
}

export class TraceFileWatcher extends EventEmitter {
  private fsWatcher: ReturnType<typeof watch> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private readonly pollIntervalMs: number;

  constructor(
    private readonly tracesDir: string,
    private readonly cb: WatcherCallbacks,
    options: TraceFileWatcherOptions = {},
  ) {
    super();
    this.pollIntervalMs = options.pollIntervalMs ?? 1000;
  }

  start(): void {
    if (existsSync(this.tracesDir)) {
      this.attachWatch();
      return;
    }
    // 대상 디렉토리가 아직 없으면(대상 프로젝트에서 harness 미실행 등)
    // 생성될 때까지 폴링 대기한 뒤 감시 시작.
    this.pollTimer = setInterval(() => {
      if (!existsSync(this.tracesDir)) return;
      this.clearPoll();
      this.ingestExistingFiles();
      this.attachWatch();
    }, this.pollIntervalMs);
    this.pollTimer.unref();
  }

  stop(): void {
    this.clearPoll();
    this.fsWatcher?.close();
    this.fsWatcher = null;
  }

  private clearPoll(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private attachWatch(): void {
    this.fsWatcher = watch(this.tracesDir, { persistent: false }, (_ev, filename) => {
      if (!filename || !filename.endsWith('.jsonl')) return;
      this.onChange(filename);
    });
  }

  // 폴링이 tracesDir 등장을 감지했을 때, 이미 존재하는 .jsonl 을
  // onChange 로 흘려 session_added 이벤트를 발화시킨다.
  private ingestExistingFiles(): void {
    for (const name of readdirSync(this.tracesDir)) {
      if (!name.endsWith('.jsonl')) continue;
      this.onChange(name);
    }
  }

  private onChange(filename: string): void {
    const sessionId = filename.replace(/\.jsonl$/, '');
    const path = resolve(this.tracesDir, filename);
    if (!existsSync(path)) return;

    if (!this.cb.isKnownSession(sessionId)) {
      this.cb.registerSession(sessionId);
      this.cb.setFileLength(sessionId, statSync(path).size);
      this.emit('event', { type: 'session_added', session_id: sessionId } satisfies WatcherEvent);
      return;
    }

    const raw = readFileSync(path, 'utf8');
    const prevLen = this.cb.getFileLength(sessionId);
    const { records, newLength } = parseAppended(raw, prevLen);
    this.cb.setFileLength(sessionId, newLength);
    if (records.length === 0) return;
    this.cb.appendRecords(sessionId, records);
    for (const record of records) {
      this.emit('event', { type: 'record', session_id: sessionId, record } satisfies WatcherEvent);
    }
  }
}
