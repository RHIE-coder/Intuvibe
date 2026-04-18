// bench/tests/trace/emit-prompt-transformed.test.mjs
//
// Spec: SPEC-trace-wiring (AC-TW05, AC-TW06, AC-TW07)

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, existsSync } from 'node:fs';
import { tmpProject, runWrapper, traceFile, readRecords, wrapperPath } from './_helpers.mjs';

const SCRIPT = wrapperPath('emit-prompt-transformed');

describe('emit-prompt-transformed', () => {
  let projectDir;

  beforeEach(() => {
    projectDir = tmpProject();
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('AC-TW05: UserPromptSubmit payload → kind=prompt_transformed', () => {
    const r = runWrapper(SCRIPT, projectDir, {
      session_id: 's1',
      prompt: '구현 도와줘',
    });
    assert.equal(r.exitCode, 0);

    const recs = readRecords(traceFile(projectDir, 's1'));
    assert.equal(recs.length, 1);
    assert.equal(recs[0].kind, 'prompt_transformed');
    assert.equal(recs[0].source, 'UserPromptSubmit');
    assert.equal(recs[0].data.final, '구현 도와줘');
    assert.deepEqual(recs[0].data.matches, []);
  });

  it('auto-transform lexicon 매치 시 matches 에 보존', () => {
    const r = runWrapper(SCRIPT, projectDir, {
      session_id: 's2',
      prompt: '긴급 배포 해줘',
    });
    assert.equal(r.exitCode, 0);

    const recs = readRecords(traceFile(projectDir, 's2'));
    assert.equal(recs[0].kind, 'prompt_transformed');
    assert.equal(recs[0].data.matches.length, 1);
    assert.equal(recs[0].data.matches[0].keyword, '긴급 배포');
    assert.equal(recs[0].data.matches[0].bypass_flag, 'bypass-qa');
  });

  it('여러 lexicon 키워드가 동시에 매치', () => {
    const r = runWrapper(SCRIPT, projectDir, {
      session_id: 's3',
      prompt: '긴급 배포 해야하고 spec 없이 바로 가자',
    });
    assert.equal(r.exitCode, 0);

    const recs = readRecords(traceFile(projectDir, 's3'));
    const flags = recs[0].data.matches.map((m) => m.bypass_flag);
    assert.ok(flags.includes('bypass-qa'));
    assert.ok(flags.includes('bypass-gates:g1'));
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
    const r = runWrapper(SCRIPT, projectDir, '{broken');
    assert.equal(r.exitCode, 0);
  });
});
