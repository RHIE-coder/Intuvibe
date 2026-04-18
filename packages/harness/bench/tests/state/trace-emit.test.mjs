// bench/tests/state/trace-emit.test.mjs
//
// Spec: SPEC-trace-emit (bench/specs/trace-emit.spec.yaml)
// AC-TR01 ~ AC-TR14

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, execFile } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = resolve(__dirname, '../../../plugin/scripts/state/trace-emit.mjs');

function tmpProject({ initHarness = true } = {}) {
  const dir = resolve(tmpdir(), `harness-trace-test-${randomBytes(4).toString('hex')}`);
  mkdirSync(dir, { recursive: true });
  if (initHarness) {
    mkdirSync(resolve(dir, '.harness/state'), { recursive: true });
  }
  return dir;
}

function runCli(projectDir, args, { producer } = {}) {
  const env = {
    ...process.env,
    CLAUDE_PROJECT_DIR: projectDir,
    ...(producer ? { HARNESS_PRODUCER: producer } : {}),
  };
  try {
    const stdout = execFileSync('node', [scriptPath, ...args], {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { exitCode: 0, stdout: stdout.toString(), stderr: '' };
  } catch (e) {
    return {
      exitCode: e.status ?? 1,
      stdout: e.stdout?.toString() ?? '',
      stderr: e.stderr?.toString() ?? '',
    };
  }
}

function runStdin(projectDir, input, { producer } = {}) {
  const env = {
    ...process.env,
    CLAUDE_PROJECT_DIR: projectDir,
    ...(producer ? { HARNESS_PRODUCER: producer } : {}),
  };
  const payload = typeof input === 'string' ? input : JSON.stringify(input);
  try {
    const stdout = execFileSync('node', [scriptPath], {
      env,
      input: payload,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { exitCode: 0, stdout: stdout.toString(), stderr: '' };
  } catch (e) {
    return {
      exitCode: e.status ?? 1,
      stdout: e.stdout?.toString() ?? '',
      stderr: e.stderr?.toString() ?? '',
    };
  }
}

function traceFile(projectDir, sessionId) {
  return resolve(projectDir, '.harness/state/traces', `${sessionId}.jsonl`);
}

function readRecords(filePath) {
  return readFileSync(filePath, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

describe('trace-emit', () => {
  let projectDir;

  beforeEach(() => {
    projectDir = tmpProject();
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  // --- AC-TR01: CLI 인자 기록 ---
  describe('AC-TR01: CLI 인자 기록', () => {
    it('--kind tool_pre --session-id abc --tool Bash → traces/abc.jsonl 생성', () => {
      const r = runCli(projectDir, [
        '--kind', 'tool_pre',
        '--session-id', 'abc',
        '--tool', 'Bash',
      ]);
      assert.equal(r.exitCode, 0);

      const fp = traceFile(projectDir, 'abc');
      assert.ok(existsSync(fp), 'traces/abc.jsonl 존재');

      const recs = readRecords(fp);
      assert.equal(recs.length, 1);
      assert.equal(recs[0].kind, 'tool_pre');
      assert.equal(recs[0].session_id, 'abc');
      assert.equal(recs[0].tool, 'Bash');
    });
  });

  // --- AC-TR02: stdin JSON ---
  describe('AC-TR02: stdin JSON', () => {
    it('stdin JSON → traces/{session_id}.jsonl에 기록', () => {
      const r = runStdin(projectDir, {
        kind: 'tool_pre',
        session_id: 'xyz',
        tool: 'Write',
      });
      assert.equal(r.exitCode, 0);

      const recs = readRecords(traceFile(projectDir, 'xyz'));
      assert.equal(recs.length, 1);
      assert.equal(recs[0].kind, 'tool_pre');
      assert.equal(recs[0].tool, 'Write');
    });
  });

  // --- AC-TR03: ts 자동 주입 ---
  describe('AC-TR03: ts 자동 주입', () => {
    it('ts 미제공 → 유효한 ISO 문자열 자동 주입', () => {
      const r = runCli(projectDir, [
        '--kind', 'tool_pre',
        '--session-id', 's1',
      ]);
      assert.equal(r.exitCode, 0);

      const recs = readRecords(traceFile(projectDir, 's1'));
      const ts = recs[0].ts;
      assert.ok(ts, 'ts 존재');
      assert.ok(!Number.isNaN(new Date(ts).getTime()), 'ts가 유효한 ISO 문자열');
    });
  });

  // --- AC-TR04: span_id 자동 생성 & 고유성 ---
  describe('AC-TR04: span_id 자동 생성', () => {
    it('연속 2회 호출 시 span_id가 서로 다름', () => {
      runCli(projectDir, ['--kind', 'tool_pre', '--session-id', 's2']);
      runCli(projectDir, ['--kind', 'tool_pre', '--session-id', 's2']);

      const recs = readRecords(traceFile(projectDir, 's2'));
      assert.equal(recs.length, 2);
      assert.ok(recs[0].span_id, 'span_id 존재');
      assert.ok(recs[1].span_id, 'span_id 존재');
      assert.notEqual(recs[0].span_id, recs[1].span_id, 'span_id 고유');
      assert.ok(recs[0].span_id.startsWith('span-'), 'span- prefix');
    });
  });

  // --- AC-TR05: v 자동 주입 ---
  describe('AC-TR05: schema version 자동 주입', () => {
    it('v 없이 이벤트 → v=1 자동 주입', () => {
      runCli(projectDir, ['--kind', 'tool_pre', '--session-id', 's3']);
      const recs = readRecords(traceFile(projectDir, 's3'));
      assert.equal(recs[0].v, 1);
    });
  });

  // --- AC-TR06: 동시 호출 flock 직렬화 ---
  describe('AC-TR06: 동시 호출 flock 직렬화', () => {
    it('병렬 10회 → JSONL 줄 수 = 10, 전부 JSON 파싱 성공', async () => {
      const count = 10;
      const env = { ...process.env, CLAUDE_PROJECT_DIR: projectDir };

      const promises = Array.from({ length: count }, () =>
        new Promise((res, rej) => {
          execFile(
            'node',
            [scriptPath, '--kind', 'tool_pre', '--session-id', 'concurrent'],
            { env },
            (err) => {
              if (err && err.code !== 0) rej(err);
              else res();
            },
          );
        }),
      );

      await Promise.all(promises);

      const recs = readRecords(traceFile(projectDir, 'concurrent'));
      assert.equal(recs.length, count, `줄 수 = ${count}`);
      for (const rec of recs) {
        assert.equal(rec.kind, 'tool_pre');
        assert.equal(rec.session_id, 'concurrent');
      }
    });
  });

  // --- AC-TR07: size truncation ---
  describe('AC-TR07: 64KB 초과 시 truncation', () => {
    it('data.input에 80KB 문자열 → data.truncated=true', () => {
      const bigString = 'x'.repeat(80 * 1024);
      const r = runStdin(projectDir, {
        kind: 'tool_pre',
        session_id: 'big',
        tool: 'Bash',
        data: { input: { command: bigString } },
      });
      assert.equal(r.exitCode, 0);

      const recs = readRecords(traceFile(projectDir, 'big'));
      assert.equal(recs.length, 1);
      assert.equal(recs[0].data.truncated, true, 'data.truncated=true');

      const serialized = JSON.stringify(recs[0]);
      assert.ok(serialized.length < 80 * 1024, '레코드 크기가 원본보다 작음');
    });
  });

  // --- AC-TR08: .harness/ 미존재 silent-skip ---
  describe('AC-TR08: .harness/ 미존재 silent-skip', () => {
    it('.harness/ 없는 프로젝트 → exit(0), 파일 생성 없음', () => {
      const barDir = tmpProject({ initHarness: false });
      try {
        const r = runCli(barDir, [
          '--kind', 'tool_pre',
          '--session-id', 'skip',
        ]);
        assert.equal(r.exitCode, 0);
        assert.ok(!existsSync(resolve(barDir, '.harness')), '.harness 생성 안 됨');
      } finally {
        rmSync(barDir, { recursive: true, force: true });
      }
    });
  });

  // --- AC-TR09: session_id 누락 fallback ---
  describe('AC-TR09: session_id 누락 fallback', () => {
    it('session_id 없는 이벤트 → _unknown-session.jsonl', () => {
      const r = runCli(projectDir, ['--kind', 'tool_pre']);
      assert.equal(r.exitCode, 0);

      const fp = traceFile(projectDir, '_unknown-session');
      assert.ok(existsSync(fp), '_unknown-session.jsonl 존재');
      const recs = readRecords(fp);
      assert.equal(recs[0].session_id, '_unknown');
    });
  });

  // --- AC-TR10: 잘못된 JSON ---
  describe('AC-TR10: 잘못된 JSON', () => {
    it('invalid JSON stdin → exit(1) + stderr', () => {
      const r = runStdin(projectDir, '{ not valid json', {});
      assert.equal(r.exitCode, 1);
      assert.ok(r.stderr.length > 0, 'stderr 메시지 존재');
    });
  });

  // --- AC-TR11: producer 환경변수 ---
  describe('AC-TR11: HARNESS_PRODUCER 반영', () => {
    it('HARNESS_PRODUCER=test-producer → producer 필드 반영', () => {
      runCli(
        projectDir,
        ['--kind', 'tool_pre', '--session-id', 's4'],
        { producer: 'test-producer' },
      );
      const recs = readRecords(traceFile(projectDir, 's4'));
      assert.equal(recs[0].producer, 'test-producer');
    });
  });

  // --- AC-TR12: parent_span_id 보존 ---
  describe('AC-TR12: parent_span_id 보존', () => {
    it('parent_span_id 포함 이벤트 → 보존', () => {
      runStdin(projectDir, {
        kind: 'tool_post',
        session_id: 's5',
        parent_span_id: 'parent-xyz',
      });
      const recs = readRecords(traceFile(projectDir, 's5'));
      assert.equal(recs[0].parent_span_id, 'parent-xyz');
    });
  });

  // --- AC-TR13: kind 필수 ---
  describe('AC-TR13: kind 필수', () => {
    it('kind 없는 이벤트 → exit(1)', () => {
      const r = runStdin(projectDir, {
        session_id: 's6',
        tool: 'Bash',
      });
      assert.equal(r.exitCode, 1);
      assert.ok(r.stderr.length > 0);
    });
  });

  // --- AC-TR14: 빈 stdin ---
  describe('AC-TR14: 빈 stdin no-op', () => {
    it('빈 stdin → exit(0), 파일 생성 없음', () => {
      const r = runStdin(projectDir, '');
      assert.equal(r.exitCode, 0);
      const tracesDir = resolve(projectDir, '.harness/state/traces');
      if (existsSync(tracesDir)) {
        const files = readdirSync(tracesDir);
        assert.equal(files.length, 0, 'traces/ 비어 있음');
      }
    });
  });
});
