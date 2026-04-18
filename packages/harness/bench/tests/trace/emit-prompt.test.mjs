// bench/tests/trace/emit-prompt.test.mjs
//
// Spec: SPEC-trace-wiring (AC-TW04, AC-TW06, AC-TW07)

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, existsSync } from 'node:fs';
import { tmpProject, runWrapper, traceFile, readRecords, wrapperPath } from './_helpers.mjs';

const SCRIPT = wrapperPath('emit-prompt');

describe('emit-prompt', () => {
  let projectDir;

  beforeEach(() => {
    projectDir = tmpProject();
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('AC-TW04: UserPromptSubmit payload → kind=prompt, data.original', () => {
    const r = runWrapper(SCRIPT, projectDir, {
      session_id: 's1',
      prompt: '구현 도와줘',
    });
    assert.equal(r.exitCode, 0);

    const recs = readRecords(traceFile(projectDir, 's1'));
    assert.equal(recs.length, 1);
    assert.equal(recs[0].kind, 'prompt');
    assert.equal(recs[0].source, 'UserPromptSubmit');
    assert.equal(recs[0].data.original, '구현 도와줘');
  });

  it('긴 프롬프트 원본 보존 (4KB 이하)', () => {
    const prompt = 'a'.repeat(2000);
    const r = runWrapper(SCRIPT, projectDir, {
      session_id: 's2',
      prompt,
    });
    assert.equal(r.exitCode, 0);

    const recs = readRecords(traceFile(projectDir, 's2'));
    assert.equal(recs[0].data.original, prompt);
  });

  it('AC-TW06: .harness/ missing → silent-skip', () => {
    const bareDir = tmpProject({ initHarness: false });
    try {
      const r = runWrapper(SCRIPT, bareDir, {
        session_id: 's',
        prompt: 'hello',
      });
      assert.equal(r.exitCode, 0);
      assert.ok(!existsSync(`${bareDir}/.harness`));
    } finally {
      rmSync(bareDir, { recursive: true, force: true });
    }
  });

  it('AC-TW07: invalid stdin → exit(0)', () => {
    const r = runWrapper(SCRIPT, projectDir, '{not json}');
    assert.equal(r.exitCode, 0);
  });

  it('prompt 없는 payload → data.original=""', () => {
    const r = runWrapper(SCRIPT, projectDir, {
      session_id: 'empty',
    });
    assert.equal(r.exitCode, 0);

    const recs = readRecords(traceFile(projectDir, 'empty'));
    assert.equal(recs[0].data.original, '');
  });
});
