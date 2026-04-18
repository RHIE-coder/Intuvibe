// bench/tests/trace/emit-tool-pre.test.mjs
//
// Spec: SPEC-trace-wiring (AC-TW01, AC-TW06, AC-TW07, AC-TW08, AC-TW09, AC-TW10)

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, existsSync } from 'node:fs';
import { tmpProject, runWrapper, traceFile, readRecords, wrapperPath } from './_helpers.mjs';

const SCRIPT = wrapperPath('emit-tool-pre');

describe('emit-tool-pre', () => {
  let projectDir;

  beforeEach(() => {
    projectDir = tmpProject();
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('AC-TW01: PreToolUse payload → kind=tool_pre, source=PreToolUse', () => {
    const r = runWrapper(SCRIPT, projectDir, {
      session_id: 's1',
      tool_name: 'Bash',
      tool_input: { command: 'ls' },
    });
    assert.equal(r.exitCode, 0);

    const recs = readRecords(traceFile(projectDir, 's1'));
    assert.equal(recs.length, 1);
    assert.equal(recs[0].kind, 'tool_pre');
    assert.equal(recs[0].source, 'PreToolUse');
    assert.equal(recs[0].tool, 'Bash');
    assert.deepEqual(recs[0].data.input, { command: 'ls' });
  });

  it('AC-TW06: .harness/ missing → silent-skip, no file', () => {
    const bareDir = tmpProject({ initHarness: false });
    try {
      const r = runWrapper(SCRIPT, bareDir, {
        session_id: 'skip',
        tool_name: 'Bash',
        tool_input: { command: 'ls' },
      });
      assert.equal(r.exitCode, 0);
      assert.ok(!existsSync(`${bareDir}/.harness`));
    } finally {
      rmSync(bareDir, { recursive: true, force: true });
    }
  });

  it('AC-TW07: invalid JSON stdin → exit(0) (never block)', () => {
    const r = runWrapper(SCRIPT, projectDir, '{ broken json');
    assert.equal(r.exitCode, 0);
  });

  it('AC-TW07: empty stdin → exit(0)', () => {
    const r = runWrapper(SCRIPT, projectDir, '');
    assert.equal(r.exitCode, 0);
  });

  it('AC-TW08: MCP tool name preserved verbatim', () => {
    const r = runWrapper(SCRIPT, projectDir, {
      session_id: 'mcp1',
      tool_name: 'mcp__paper__get_basic_info',
      tool_input: { scope: 'artboard' },
    });
    assert.equal(r.exitCode, 0);

    const recs = readRecords(traceFile(projectDir, 'mcp1'));
    assert.equal(recs[0].tool, 'mcp__paper__get_basic_info');
    assert.deepEqual(recs[0].data.input, { scope: 'artboard' });
  });

  it('AC-TW09: Task subagent fields preserved', () => {
    const r = runWrapper(SCRIPT, projectDir, {
      session_id: 'task1',
      tool_name: 'Task',
      tool_input: {
        subagent_type: 'Explore',
        prompt: 'find X',
        description: 'search',
      },
    });
    assert.equal(r.exitCode, 0);

    const recs = readRecords(traceFile(projectDir, 'task1'));
    assert.equal(recs[0].tool, 'Task');
    assert.equal(recs[0].data.input.subagent_type, 'Explore');
    assert.equal(recs[0].data.input.prompt, 'find X');
    assert.equal(recs[0].data.input.description, 'search');
  });

  it('AC-TW10: session_id missing → _unknown-session.jsonl', () => {
    const r = runWrapper(SCRIPT, projectDir, {
      tool_name: 'Bash',
      tool_input: { command: 'pwd' },
    });
    assert.equal(r.exitCode, 0);

    const recs = readRecords(traceFile(projectDir, '_unknown-session'));
    assert.equal(recs.length, 1);
    assert.equal(recs[0].session_id, '_unknown');
    assert.equal(recs[0].tool, 'Bash');
  });
});
