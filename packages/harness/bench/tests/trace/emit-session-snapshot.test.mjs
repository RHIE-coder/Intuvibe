// bench/tests/trace/emit-session-snapshot.test.mjs
//
// Spec: SPEC-trace-wiring (AC-TW03, AC-TW06, AC-TW07)

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { tmpProject, runWrapper, traceFile, readRecords, wrapperPath } from './_helpers.mjs';

const SCRIPT = wrapperPath('emit-session-snapshot');

function tmpPluginRoot() {
  const dir = resolve(tmpdir(), `plugin-root-${randomBytes(4).toString('hex')}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('emit-session-snapshot', () => {
  let projectDir;
  let pluginRoot;

  beforeEach(() => {
    projectDir = tmpProject();
    pluginRoot = tmpPluginRoot();
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
    rmSync(pluginRoot, { recursive: true, force: true });
  });

  it('AC-TW03: rules/skills/mcp_servers 수집', () => {
    // rules: .claude/rules/{foo,bar}.md
    mkdirSync(resolve(projectDir, '.claude/rules'), { recursive: true });
    writeFileSync(resolve(projectDir, '.claude/rules/harness.md'), '# harness');
    writeFileSync(resolve(projectDir, '.claude/rules/testing.md'), '# testing');

    // skills: pluginRoot/skills/{skill1,skill2}/SKILL.md
    mkdirSync(resolve(pluginRoot, 'skills/implement'), { recursive: true });
    writeFileSync(resolve(pluginRoot, 'skills/implement/SKILL.md'), '# impl');
    mkdirSync(resolve(pluginRoot, 'skills/review'), { recursive: true });
    writeFileSync(resolve(pluginRoot, 'skills/review/SKILL.md'), '# review');
    // skill without SKILL.md should NOT be listed
    mkdirSync(resolve(pluginRoot, 'skills/incomplete'), { recursive: true });

    // mcp: .claude/settings.json
    mkdirSync(resolve(projectDir, '.claude'), { recursive: true });
    writeFileSync(
      resolve(projectDir, '.claude/settings.json'),
      JSON.stringify({ mcpServers: { paper: {}, telegram: {} } }),
    );

    const r = runWrapper(SCRIPT, projectDir, { session_id: 's1' }, { pluginRoot });
    assert.equal(r.exitCode, 0);

    const recs = readRecords(traceFile(projectDir, 's1'));
    assert.equal(recs.length, 1);
    assert.equal(recs[0].kind, 'snapshot');
    assert.equal(recs[0].source, 'SessionStart');
    assert.deepEqual(recs[0].data.rules, ['harness', 'testing']);
    assert.deepEqual(recs[0].data.skills, ['implement', 'review']);
    assert.deepEqual(recs[0].data.mcp_servers, ['paper', 'telegram']);
  });

  it('rules/skills/mcp 모두 비어있어도 snapshot 생성', () => {
    const r = runWrapper(SCRIPT, projectDir, { session_id: 's2' }, { pluginRoot });
    assert.equal(r.exitCode, 0);

    const recs = readRecords(traceFile(projectDir, 's2'));
    assert.equal(recs.length, 1);
    assert.deepEqual(recs[0].data.rules, []);
    assert.deepEqual(recs[0].data.skills, []);
    assert.deepEqual(recs[0].data.mcp_servers, []);
  });

  it('settings.local.json 이 우선 적용', () => {
    mkdirSync(resolve(projectDir, '.claude'), { recursive: true });
    writeFileSync(
      resolve(projectDir, '.claude/settings.json'),
      JSON.stringify({ mcpServers: { shared: {} } }),
    );
    writeFileSync(
      resolve(projectDir, '.claude/settings.local.json'),
      JSON.stringify({ mcpServers: { local_only: {} } }),
    );

    const r = runWrapper(SCRIPT, projectDir, { session_id: 's3' }, { pluginRoot });
    assert.equal(r.exitCode, 0);

    const recs = readRecords(traceFile(projectDir, 's3'));
    assert.deepEqual(recs[0].data.mcp_servers, ['local_only']);
  });

  it('AC-TW06: .harness/ missing → silent-skip', () => {
    const bareDir = tmpProject({ initHarness: false });
    try {
      const r = runWrapper(SCRIPT, bareDir, { session_id: 's' }, { pluginRoot });
      assert.equal(r.exitCode, 0);
      assert.ok(!existsSync(`${bareDir}/.harness`));
    } finally {
      rmSync(bareDir, { recursive: true, force: true });
    }
  });

  it('AC-TW07: invalid stdin → exit(0), snapshot 기록 시도 (cwd fallback)', () => {
    // invalid JSON 이어도 CLAUDE_PROJECT_DIR 로 fallback 하여 기록 시도
    const r = runWrapper(SCRIPT, projectDir, '{broken', { pluginRoot });
    assert.equal(r.exitCode, 0);
    // invalid JSON 이므로 session_id 가 없어 _unknown-session 에 기록
    const recs = readRecords(traceFile(projectDir, '_unknown-session'));
    assert.equal(recs.length, 1);
    assert.equal(recs[0].kind, 'snapshot');
  });
});
