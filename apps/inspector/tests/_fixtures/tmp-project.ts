// tests 공용 — 임시 프로젝트 디렉토리 + trace fixture 관리.

import { mkdirSync, writeFileSync, appendFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import type { TraceRecord } from '../../src/shared/trace';

export interface TmpProject {
  root: string;
  tracesDir: string;
  writeSession(sessionId: string, records: TraceRecord[]): string;
  appendRecord(sessionId: string, record: TraceRecord): void;
  cleanup(): void;
}

export function createTmpProject(): TmpProject {
  const root = resolve(tmpdir(), `inspector-test-${randomBytes(4).toString('hex')}`);
  const tracesDir = resolve(root, '.harness/state/traces');
  mkdirSync(tracesDir, { recursive: true });

  return {
    root,
    tracesDir,
    writeSession(sessionId, records) {
      const path = resolve(tracesDir, `${sessionId}.jsonl`);
      const body = records.map((r) => JSON.stringify(r)).join('\n') + (records.length ? '\n' : '');
      writeFileSync(path, body);
      return path;
    },
    appendRecord(sessionId, record) {
      const path = resolve(tracesDir, `${sessionId}.jsonl`);
      appendFileSync(path, JSON.stringify(record) + '\n');
    },
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}

export function makeRecord(overrides: Partial<TraceRecord> = {}): TraceRecord {
  return {
    v: 1,
    ts: '2026-04-19T10:00:00.000Z',
    session_id: 's1',
    span_id: 'sp-x',
    parent_span_id: null,
    kind: 'tool_pre',
    source: 'PreToolUse',
    tool: 'Bash',
    data: { input: { command: 'ls' } },
    ...overrides,
  };
}
