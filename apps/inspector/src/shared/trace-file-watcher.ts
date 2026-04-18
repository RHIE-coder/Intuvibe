// shared/trace-file-watcher.ts — fs.watch → WatcherEvent.
// Store 를 직접 몰라도 되게 callbacks 인터페이스로 의존성 역전.

import { EventEmitter } from 'node:events';
import { readFileSync, statSync, watch, existsSync } from 'node:fs';
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

export class TraceFileWatcher extends EventEmitter {
  private fsWatcher: ReturnType<typeof watch> | null = null;

  constructor(
    private readonly tracesDir: string,
    private readonly cb: WatcherCallbacks,
  ) {
    super();
  }

  start(): void {
    if (!existsSync(this.tracesDir)) return;
    this.fsWatcher = watch(this.tracesDir, { persistent: false }, (_ev, filename) => {
      if (!filename || !filename.endsWith('.jsonl')) return;
      this.onChange(filename);
    });
  }

  stop(): void {
    this.fsWatcher?.close();
    this.fsWatcher = null;
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
