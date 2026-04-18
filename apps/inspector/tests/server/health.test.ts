import { describe, it, expect, afterEach } from 'vitest';
import { healthRouter } from '../../src/server/routes/health';
import { startTestServer, type TestServer } from '../_fixtures/test-server';
import { createTmpProject, type TmpProject } from '../_fixtures/tmp-project';

describe('GET /api/health', () => {
  let proj: TmpProject;
  let srv: TestServer;
  afterEach(async () => {
    await srv?.close();
    proj?.cleanup();
  });

  it('200 { ok: true, mode: "dev" }', async () => {
    proj = createTmpProject();
    srv = await startTestServer(proj.tracesDir, () => healthRouter);
    const res = await fetch(`${srv.baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, mode: 'dev' });
  });
});
