// bench/tests/trace/emit-tool-post.test.mjs
//
// Spec: SPEC-trace-wiring (AC-TW02, AC-TW06, AC-TW07)

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, existsSync } from 'node:fs';
import { tmpProject, runWrapper, traceFile, readRecords, wrapperPath } from './_helpers.mjs';

const SCRIPT = wrapperPath('emit-tool-post');

describe('emit-tool-post', () => {
  let projectDir;

  beforeEach(() => {
    projectDir = tmpProject();
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('AC-TW02: PostToolUse payload → kind=tool_post, tool_response 보존', () => {
    const r = runWrapper(SCRIPT, projectDir, {
      session_id: 's1',
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
      tool_response: { stdout: 'file1\nfile2\n', exit_code: 0 },
    });
    assert.equal(r.exitCode, 0);

    const recs = readRecords(traceFile(projectDir, 's1'));
    assert.equal(recs.length, 1);
    assert.equal(recs[0].kind, 'tool_post');
    assert.equal(recs[0].source, 'PostToolUse');
    assert.equal(recs[0].tool, 'Bash');
    assert.deepEqual(recs[0].data.response, { stdout: 'file1\nfile2\n', exit_code: 0 });
    assert.deepEqual(recs[0].data.input, { command: 'ls' });
  });

  it('AC-TW06: .harness/ missing → silent-skip', () => {
    const bareDir = tmpProject({ initHarness: false });
    try {
      const r = runWrapper(SCRIPT, bareDir, {
        session_id: 's',
        tool_name: 'Edit',
        tool_response: { success: true },
      });
      assert.equal(r.exitCode, 0);
      assert.ok(!existsSync(`${bareDir}/.harness`));
    } finally {
      rmSync(bareDir, { recursive: true, force: true });
    }
  });

  it('AC-TW07: invalid stdin → exit(0)', () => {
    const r = runWrapper(SCRIPT, projectDir, '{not}valid}');
    assert.equal(r.exitCode, 0);
  });

  it('response=null 허용 (tool_pre 만 있고 tool_post 가 없는 도구)', () => {
    const r = runWrapper(SCRIPT, projectDir, {
      session_id: 'nullresp',
      tool_name: 'Write',
      tool_input: { path: 'foo.txt' },
    });
    assert.equal(r.exitCode, 0);

    const recs = readRecords(traceFile(projectDir, 'nullresp'));
    assert.equal(recs[0].data.response, null);
  });
});
