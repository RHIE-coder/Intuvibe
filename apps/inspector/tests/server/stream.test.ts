import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { statSync } from 'node:fs';
import { resolve } from 'node:path';
import { createStreamRouter } from '../../src/server/routes/stream';
import type { StreamEvent } from '../../src/shared/protocol';
import { startTestServer, type TestServer } from '../_fixtures/test-server';
import { createTmpProject, makeRecord, type TmpProject } from '../_fixtures/tmp-project';

interface SseStream {
  next(predicate: (ev: StreamEvent) => boolean, timeoutMs?: number): Promise<StreamEvent>;
  close(): Promise<void>;
}

// SSE 연결 + 프레임 파서. close() 는 body stream 을 취소해 reader.read() 가
// 정상 종료(done=true)로 빠져나오게 한다. AbortSignal 을 쓰면 read() 가
// reject 되어 unhandled rejection 이 발생.
async function openSse(url: string): Promise<SseStream> {
  const res = await fetch(url);
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const queue: StreamEvent[] = [];
  const waiters: Array<(ev: StreamEvent | null) => void> = [];
  let closed = false;

  (async () => {
    while (!closed) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try { chunk = await reader.read(); } catch { break; }
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      while (true) {
        const idx = buffer.indexOf('\n\n');
        if (idx === -1) break;
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (!frame.startsWith('data: ')) continue;
        const ev = JSON.parse(frame.slice(6)) as StreamEvent;
        const w = waiters.shift();
        if (w) w(ev);
        else queue.push(ev);
      }
    }
    waiters.forEach((w) => w(null));
  })();

  return {
    async next(predicate, timeoutMs = 3000) {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        while (queue.length) {
          const ev = queue.shift()!;
          if (predicate(ev)) return ev;
        }
        const ev = await Promise.race([
          new Promise<StreamEvent | null>((r) => waiters.push(r)),
          new Promise<'timeout'>((r) =>
            setTimeout(() => r('timeout'), Math.max(1, deadline - Date.now())),
          ),
        ]);
        if (ev === 'timeout') break;
        if (ev === null) throw new Error('SSE stream ended');
        if (predicate(ev)) return ev;
      }
      throw new Error(`SSE next() timeout (${timeoutMs}ms)`);
    },
    async close() {
      closed = true;
      await reader.cancel().catch(() => {});
    },
  };
}

describe('GET /api/stream (SSE)', () => {
  let proj: TmpProject;
  let srv: TestServer;
  let sse: SseStream | null = null;

  beforeEach(() => { proj = createTmpProject(); });
  afterEach(async () => {
    if (sse) await sse.close();
    sse = null;
    await srv?.close();
    proj.cleanup();
  });

  it('연결 직후 heartbeat 수신 + content-type event-stream', async () => {
    srv = await startTestServer(proj.tracesDir, (ctx) => createStreamRouter(ctx));
    sse = await openSse(`${srv.baseUrl}/api/stream`);
    const ev = await sse.next(() => true);
    expect(ev.type).toBe('heartbeat');
  });

  it('새 세션 파일 생성 → session_added push', async () => {
    srv = await startTestServer(proj.tracesDir, (ctx) => createStreamRouter(ctx));
    sse = await openSse(`${srv.baseUrl}/api/stream`);
    await sse.next((e) => e.type === 'heartbeat');
    await new Promise((r) => setTimeout(r, 50)); // fs.watch arm

    proj.writeSession('new-sess', [makeRecord({ session_id: 'new-sess' })]);

    const ev = await sse.next((e) => e.type === 'session_added');
    if (ev.type !== 'session_added') throw new Error('unreachable');
    expect(ev.summary.session_id).toBe('new-sess');
    expect(ev.summary.record_count).toBe(1);
  });

  it('기존 세션에 append → record push', async () => {
    proj.writeSession('sess-a', [makeRecord({ session_id: 'sess-a', span_id: 'sp-1' })]);

    srv = await startTestServer(proj.tracesDir, (ctx) => createStreamRouter(ctx));
    const path = resolve(proj.tracesDir, 'sess-a.jsonl');
    srv.store.setFileLength('sess-a', statSync(path).size);

    sse = await openSse(`${srv.baseUrl}/api/stream`);
    await sse.next((e) => e.type === 'heartbeat');
    await new Promise((r) => setTimeout(r, 50));

    proj.appendRecord('sess-a', makeRecord({ session_id: 'sess-a', span_id: 'sp-2' }));

    const ev = await sse.next((e) => e.type === 'record');
    if (ev.type !== 'record') throw new Error('unreachable');
    expect(ev.session_id).toBe('sess-a');
    expect(ev.record.span_id).toBe('sp-2');
  });
});
