// End-to-end: 실제 harness emit-*.mjs 로 .jsonl 을 찍고, Inspector 서버가
// 그것을 /api/sessions, /api/sessions/:id, /api/stream 으로 정확히 노출하는지 검증.
//
// - 하네스 emit 스크립트는 stdin payload 만 가짜이고 파일 쓰기·포맷은 실제 코드.
// - Claude Code 토큰 / 네트워크 / LLM 은 전혀 쓰지 않는다.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import express from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { TraceStore } from '../../src/shared/trace-store';
import { TraceFileWatcher } from '../../src/shared/trace-file-watcher';
import { createSessionsRouter } from '../../src/server/routes/sessions';
import { createStreamRouter } from '../../src/server/routes/stream';
import type {
  GetSessionResponse,
  ListSessionsResponse,
  StreamEvent,
} from '../../src/shared/protocol';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../../..');
const EMIT_DIR = resolve(REPO_ROOT, 'packages/harness/plugin/scripts/trace');

function emitScript(name: string): string {
  return resolve(EMIT_DIR, `${name}.mjs`);
}

function mkTmp(prefix: string): string {
  const dir = resolve(tmpdir(), `${prefix}-${randomBytes(4).toString('hex')}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function runEmit(
  script: string,
  projectDir: string,
  payload: Record<string, unknown>,
  extraEnv: Record<string, string> = {},
): void {
  execFileSync('node', [script], {
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir, ...extraEnv },
    input: JSON.stringify(payload),
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

interface Fixture {
  projectDir: string;
  tracesDir: string;
  pluginRoot: string;
  baseUrl: string;
  store: TraceStore;
  close(): Promise<void>;
}

async function startFixture(): Promise<Fixture> {
  const projectDir = mkTmp('inspector-e2e');
  const tracesDir = resolve(projectDir, '.harness/state/traces');
  mkdirSync(tracesDir, { recursive: true });
  const pluginRoot = mkTmp('inspector-e2e-plugin');

  const store = new TraceStore(tracesDir);
  store.loadAll();
  const watcher = new TraceFileWatcher(tracesDir, store);
  watcher.start();

  const app = express();
  app.use('/api', createSessionsRouter({ store, watcher }));
  app.use('/api', createStreamRouter({ store, watcher }));
  const server: Server = createServer(app);
  await new Promise<void>((r) => server.listen(0, r));
  const { port } = server.address() as AddressInfo;

  return {
    projectDir,
    tracesDir,
    pluginRoot,
    baseUrl: `http://127.0.0.1:${port}`,
    store,
    close: () =>
      new Promise<void>((done) => {
        watcher.stop();
        server.close(() => {
          rmSync(projectDir, { recursive: true, force: true });
          rmSync(pluginRoot, { recursive: true, force: true });
          done();
        });
      }),
  };
}

interface SseReader {
  next(predicate: (ev: StreamEvent) => boolean, timeoutMs?: number): Promise<StreamEvent>;
  close(): Promise<void>;
}

async function openSse(url: string): Promise<SseReader> {
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

describe('e2e: harness emit → Inspector HTTP', () => {
  let fx: Fixture;
  let sse: SseReader | null = null;

  beforeEach(async () => {
    fx = await startFixture();
  });

  afterEach(async () => {
    if (sse) await sse.close();
    sse = null;
    await fx.close();
  });

  it('preload: 6 개 emit → /api/sessions 에 1 개 세션 / 6 records', async () => {
    const sid = 'e2e-preload';

    runEmit(emitScript('emit-session-snapshot'), fx.projectDir, { session_id: sid }, {
      CLAUDE_PLUGIN_ROOT: fx.pluginRoot,
    });
    runEmit(emitScript('emit-prompt'), fx.projectDir, { session_id: sid, prompt: '빨리 고쳐줘' });
    runEmit(emitScript('emit-prompt-transformed'), fx.projectDir, {
      session_id: sid,
      prompt: '빨리 고쳐줘',
    });
    runEmit(emitScript('emit-tool-pre'), fx.projectDir, {
      session_id: sid,
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
    });
    runEmit(emitScript('emit-tool-post'), fx.projectDir, {
      session_id: sid,
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
      tool_response: { stdout: 'a\nb\n', exit_code: 0 },
    });
    runEmit(emitScript('emit-stop'), fx.projectDir, { session_id: sid, stop_hook_active: false });

    // emit 이후에 store 재로드 (preload 시나리오)
    fx.store.loadAll();

    const sessionsRes = await fetch(`${fx.baseUrl}/api/sessions`);
    expect(sessionsRes.status).toBe(200);
    const sessions = (await sessionsRes.json()) as ListSessionsResponse;
    expect(sessions.sessions).toHaveLength(1);
    expect(sessions.sessions[0].session_id).toBe(sid);
    expect(sessions.sessions[0].record_count).toBe(6);

    const detailRes = await fetch(`${fx.baseUrl}/api/sessions/${sid}`);
    expect(detailRes.status).toBe(200);
    const detail = (await detailRes.json()) as GetSessionResponse;
    expect(detail.records).toHaveLength(6);

    const kinds = detail.records.map((r) => r.kind);
    expect(kinds).toEqual([
      'snapshot',
      'prompt',
      'prompt_transformed',
      'tool_pre',
      'tool_post',
      'stop',
    ]);

    // emit-prompt 계약: data.original 보존
    const prompt = detail.records.find((r) => r.kind === 'prompt');
    expect(prompt?.data.original).toBe('빨리 고쳐줘');

    // emit-tool-post 계약: data.response 보존
    const toolPost = detail.records.find((r) => r.kind === 'tool_post');
    expect(toolPost?.data.response).toEqual({ stdout: 'a\nb\n', exit_code: 0 });

    // 모든 레코드 스키마: v=1, ISO ts, span_id prefix
    for (const r of detail.records) {
      expect(r.v).toBe(1);
      expect(r.session_id).toBe(sid);
      expect(r.span_id).toMatch(/^span-[0-9a-f]{12}$/);
      expect(() => new Date(r.ts).toISOString()).not.toThrow();
    }
  });

  it('live tail: 신규 세션 + append 가 SSE 로 push 된다', async () => {
    sse = await openSse(`${fx.baseUrl}/api/stream`);
    await sse.next((e) => e.type === 'heartbeat');
    await new Promise((r) => setTimeout(r, 50)); // watcher arm

    const sid = 'e2e-live';
    runEmit(emitScript('emit-prompt'), fx.projectDir, { session_id: sid, prompt: 'hello' });

    const added = await sse.next((e) => e.type === 'session_added');
    if (added.type !== 'session_added') throw new Error('unreachable');
    expect(added.summary.session_id).toBe(sid);
    expect(added.summary.record_count).toBe(1);

    // watcher 가 새 파일을 등록할 때 fileLength 도 세팅되어 append 가 delta 로 감지됨.
    // 한 줄 더 찍으면 record 이벤트가 와야 한다.
    runEmit(emitScript('emit-stop'), fx.projectDir, { session_id: sid, stop_hook_active: false });

    const rec = await sse.next((e) => e.type === 'record' && e.session_id === sid);
    if (rec.type !== 'record') throw new Error('unreachable');
    expect(rec.record.kind).toBe('stop');
    expect(rec.record.data.stop_hook_active).toBe(false);

    // 최종 상태: HTTP 로도 동일하게 보임
    const detail = (await (await fetch(`${fx.baseUrl}/api/sessions/${sid}`)).json()) as GetSessionResponse;
    expect(detail.records.map((r) => r.kind)).toEqual(['prompt', 'stop']);
  });

  it('emit-prompt-transformed: lexicon 매치가 data.matches 로 실제 기록된다', async () => {
    const sid = 'e2e-lex';
    runEmit(emitScript('emit-prompt-transformed'), fx.projectDir, {
      session_id: sid,
      prompt: '긴급 배포 해줘',
    });
    fx.store.loadAll();

    const detail = (await (await fetch(`${fx.baseUrl}/api/sessions/${sid}`)).json()) as GetSessionResponse;
    expect(detail.records).toHaveLength(1);
    const matches = detail.records[0].data.matches as Array<{ keyword: string; bypass_flag: string }>;
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]).toMatchObject({ keyword: expect.any(String), bypass_flag: expect.any(String) });
  });
});
