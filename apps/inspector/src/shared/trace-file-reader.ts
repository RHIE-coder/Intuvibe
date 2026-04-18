// shared/trace-file-reader.ts — JSONL 파일 read + parse.

import { readFileSync, existsSync } from 'node:fs';
import type { TraceRecord } from './trace.js';
import { upcastRecord } from './upcaster.js';

export function readTraceFile(filePath: string): TraceRecord[] {
  if (!existsSync(filePath)) return [];
  const raw = readFileSync(filePath, 'utf8');
  return parseJsonl(raw);
}

export function parseJsonl(raw: string): TraceRecord[] {
  const records: TraceRecord[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj: unknown;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue;
    }
    const rec = upcastRecord(obj);
    if (rec) records.push(rec);
  }
  return records;
}

// 파일 끝에 새로 추가된 범위만 파싱. byte offset diff.
export function parseAppended(raw: string, prevLength: number): {
  records: TraceRecord[];
  newLength: number;
} {
  if (raw.length <= prevLength) {
    return { records: [], newLength: raw.length };
  }
  const delta = raw.slice(prevLength);
  return { records: parseJsonl(delta), newLength: raw.length };
}
