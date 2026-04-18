// shared/trace-store.ts — 세션 메모리 캐시. WatcherCallbacks 구현.

import { readdirSync, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SessionSummary } from './session.js';
import { summarize } from './summarize.js';
import type { TraceRecord } from './trace.js';
import { readTraceFile } from './trace-file-reader.js';
import type { WatcherCallbacks } from './trace-file-watcher.js';

interface SessionEntry {
  id: string;
  filePath: string;
  records: TraceRecord[];
  fileLength: number;
}

export class TraceStore implements WatcherCallbacks {
  private readonly sessions = new Map<string, SessionEntry>();

  constructor(private readonly tracesDir: string) {}

  loadAll(): void {
    this.sessions.clear();
    if (!existsSync(this.tracesDir)) return;
    for (const name of readdirSync(this.tracesDir)) {
      if (!name.endsWith('.jsonl')) continue;
      this.registerSession(name.replace(/\.jsonl$/, ''));
    }
  }

  // -------- WatcherCallbacks --------

  isKnownSession(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  registerSession(sessionId: string): void {
    const filePath = resolve(this.tracesDir, `${sessionId}.jsonl`);
    if (!existsSync(filePath)) return;
    const records = readTraceFile(filePath);
    this.sessions.set(sessionId, {
      id: sessionId,
      filePath,
      records,
      fileLength: statSync(filePath).size,
    });
  }

  getFileLength(sessionId: string): number {
    return this.sessions.get(sessionId)?.fileLength ?? 0;
  }

  setFileLength(sessionId: string, length: number): void {
    const entry = this.sessions.get(sessionId);
    if (entry) entry.fileLength = length;
  }

  appendRecords(sessionId: string, records: TraceRecord[]): void {
    const entry = this.sessions.get(sessionId);
    if (!entry) return;
    entry.records.push(...records);
  }

  // -------- Queries --------

  listSummaries(): SessionSummary[] {
    return Array.from(this.sessions.values())
      .map((e) => summarize(e.id, e.records))
      .sort((a, b) => b.started_at.localeCompare(a.started_at));
  }

  getRecords(sessionId: string): TraceRecord[] {
    return this.sessions.get(sessionId)?.records ?? [];
  }

  getSummary(sessionId: string): SessionSummary | null {
    const entry = this.sessions.get(sessionId);
    if (!entry) return null;
    return summarize(entry.id, entry.records);
  }
}
