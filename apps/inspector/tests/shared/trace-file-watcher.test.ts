import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  TraceFileWatcher,
  type WatcherCallbacks,
  type WatcherEvent,
} from '../../src/shared/trace-file-watcher';
import type { TraceRecord } from '../../src/shared/trace';
import { createTmpProject, makeRecord, type TmpProject } from '../_fixtures/tmp-project';

// Minimal in-memory callbacks — watcher 단위 테스트에 실제 store 주입 없이
// 동작 검증 가능하게 한다.
function createCallbacks(): WatcherCallbacks & {
  sessions: Map<string, { length: number; records: TraceRecord[] }>;
} {
  const sessions = new Map<string, { length: number; records: TraceRecord[] }>();
  return {
    sessions,
    isKnownSession: (id) => sessions.has(id),
    registerSession: (id) => sessions.set(id, { length: 0, records: [] }),
    getFileLength: (id) => sessions.get(id)?.length ?? 0,
    setFileLength: (id, len) => {
      const e = sessions.get(id);
      if (e) e.length = len;
    },
    appendRecords: (id, records) => {
      sessions.get(id)?.records.push(...records);
    },
  };
}

function waitForEvent(
  watcher: TraceFileWatcher,
  predicate: (ev: WatcherEvent) => boolean,
  timeoutMs = 2000,
): Promise<WatcherEvent> {
  return new Promise((resolveEv, reject) => {
    const timer = setTimeout(() => {
      watcher.off('event', handler);
      reject(new Error(`watcher event timeout (${timeoutMs}ms)`));
    }, timeoutMs);
    function handler(ev: WatcherEvent) {
      if (predicate(ev)) {
        clearTimeout(timer);
        watcher.off('event', handler);
        resolveEv(ev);
      }
    }
    watcher.on('event', handler);
  });
}

// macOS fs.watch 는 watch() 호출 직후 이벤트 구독이 잠깐 미무장 상태라,
// 바로 파일을 쓰면 첫 이벤트가 유실될 수 있다. 약간의 tick 을 주고 쓰기.
async function startWatcherAndWait(w: TraceFileWatcher): Promise<void> {
  w.start();
  await new Promise((r) => setTimeout(r, 50));
}

describe('TraceFileWatcher', () => {
  let proj: TmpProject;
  beforeEach(() => { proj = createTmpProject(); });
  afterEach(() => { proj.cleanup(); });

  it('start: 디렉토리 없으면 no-op (throw 안 함)', () => {
    const cb = createCallbacks();
    const w = new TraceFileWatcher('/nonexistent/path', cb);
    expect(() => w.start()).not.toThrow();
    w.stop();
  });

  it('새 세션 파일 생성 → session_added 이벤트', async () => {
    const cb = createCallbacks();
    const w = new TraceFileWatcher(proj.tracesDir, cb);
    await startWatcherAndWait(w);
    try {
      const evP = waitForEvent(w, (e) => e.type === 'session_added');
      proj.writeSession('new-sess', [makeRecord({ session_id: 'new-sess' })]);
      const ev = await evP;
      expect(ev).toEqual({ type: 'session_added', session_id: 'new-sess' });
      expect(cb.sessions.has('new-sess')).toBe(true);
    } finally {
      w.stop();
    }
  });

  it('기존 세션에 append → record 이벤트', async () => {
    const initial = makeRecord({ session_id: 'sess-a', span_id: 'sp-1' });
    proj.writeSession('sess-a', [initial]);

    const cb = createCallbacks();
    cb.registerSession('sess-a');
    const path = resolve(proj.tracesDir, 'sess-a.jsonl');
    cb.setFileLength('sess-a', statSync(path).size);

    const w = new TraceFileWatcher(proj.tracesDir, cb);
    await startWatcherAndWait(w);
    try {
      const evP = waitForEvent(w, (e) => e.type === 'record');
      proj.appendRecord('sess-a', makeRecord({ session_id: 'sess-a', span_id: 'sp-2' }));
      const ev = await evP;
      expect(ev.type).toBe('record');
      if (ev.type === 'record') {
        expect(ev.session_id).toBe('sess-a');
        expect(ev.record.span_id).toBe('sp-2');
      }
    } finally {
      w.stop();
    }
  });

  it('stop 후 이벤트 발화 없음', async () => {
    const cb = createCallbacks();
    const w = new TraceFileWatcher(proj.tracesDir, cb);
    w.start();
    w.stop();
    let fired = false;
    w.on('event', () => { fired = true; });
    proj.writeSession('x', [makeRecord({ session_id: 'x' })]);
    await new Promise((r) => setTimeout(r, 200));
    expect(fired).toBe(false);
  });
});
