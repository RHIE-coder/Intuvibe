import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSessionsRouter } from '../../src/server/routes/sessions';
import type {
  ListSessionsResponse,
  GetSessionResponse,
  ErrorResponse,
} from '../../src/shared/protocol';
import { startTestServer, type TestServer } from '../_fixtures/test-server';
import { createTmpProject, makeRecord, type TmpProject } from '../_fixtures/tmp-project';

describe('sessions routes', () => {
  let proj: TmpProject;
  let srv: TestServer;

  beforeEach(() => { proj = createTmpProject(); });
  afterEach(async () => {
    await srv?.close();
    proj.cleanup();
  });

  it('GET /api/sessions — 빈 디렉토리 → []', async () => {
    srv = await startTestServer(proj.tracesDir, (ctx) => createSessionsRouter(ctx));
    const res = await fetch(`${srv.baseUrl}/api/sessions`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as ListSessionsResponse;
    expect(body.sessions).toEqual([]);
  });

  it('GET /api/sessions — 세션 파일들 summary 반환', async () => {
    proj.writeSession('s1', [
      makeRecord({ session_id: 's1', span_id: 'a', ts: '2026-04-19T10:00:00.000Z', kind: 'tool_pre' }),
      makeRecord({ session_id: 's1', span_id: 'b', ts: '2026-04-19T10:00:05.000Z', kind: 'stop', source: 'Stop' }),
    ]);
    proj.writeSession('s2', [
      makeRecord({ session_id: 's2', span_id: 'x', ts: '2026-04-19T11:00:00.000Z' }),
    ]);

    srv = await startTestServer(proj.tracesDir, (ctx) => createSessionsRouter(ctx));
    const res = await fetch(`${srv.baseUrl}/api/sessions`);
    const body = (await res.json()) as ListSessionsResponse;

    expect(body.sessions).toHaveLength(2);
    // started_at 내림차순 정렬 (s2 가 더 최근)
    expect(body.sessions[0].session_id).toBe('s2');
    expect(body.sessions[1].session_id).toBe('s1');
    expect(body.sessions[1].has_stop).toBe(true);
    expect(body.sessions[1].tool_calls).toBe(1);
  });

  it('GET /api/sessions/:id — 존재 → summary + records', async () => {
    proj.writeSession('sess-x', [
      makeRecord({ session_id: 'sess-x', span_id: 'sp-1' }),
      makeRecord({ session_id: 'sess-x', span_id: 'sp-2' }),
    ]);
    srv = await startTestServer(proj.tracesDir, (ctx) => createSessionsRouter(ctx));
    const res = await fetch(`${srv.baseUrl}/api/sessions/sess-x`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as GetSessionResponse;
    expect(body.summary.session_id).toBe('sess-x');
    expect(body.records).toHaveLength(2);
    expect(body.records.map((r) => r.span_id)).toEqual(['sp-1', 'sp-2']);
  });

  it('GET /api/sessions/:id — 존재 안 함 → 404', async () => {
    srv = await startTestServer(proj.tracesDir, (ctx) => createSessionsRouter(ctx));
    const res = await fetch(`${srv.baseUrl}/api/sessions/nope`);
    expect(res.status).toBe(404);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error).toMatch(/session not found/);
  });
});
