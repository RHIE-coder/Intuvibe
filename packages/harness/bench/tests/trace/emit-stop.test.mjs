// bench/tests/trace/emit-stop.test.mjs
//
// Spec: SPEC-trace-wiring (AC-TW12, AC-TW06, AC-TW07)

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, existsSync } from 'node:fs';
import { tmpProject, runWrapper, traceFile, readRecords, wrapperPath } from './_helpers.mjs';

const SCRIPT = wrapperPath('emit-stop');

describe('emit-stop', () => {
  let projectDir;

  beforeEach(() => {
    projectDir = tmpProject();
  });

  afterEach(() => {
    rmSync(projectDir, { recursive: true, force: true });
  });

  it('AC-TW12: Stop payload → kind=stop, source=Stop', () => {
    const r = runWrapper(SCRIPT, projectDir, {
      session_id: 's1',
      stop_hook_active: false,
    });
    assert.equal(r.exitCode, 0);

    const recs = readRecords(traceFile(projectDir, 's1'));
    assert.equal(recs.length, 1);
    assert.equal(recs[0].kind, 'stop');
    assert.equal(recs[0].source, 'Stop');
    assert.equal(recs[0].data.stop_hook_active, false);
  });

  it('stop_hook_active=true 보존 (재진입 표시)', () => {
    const r = runWrapper(SCRIPT, projectDir, {
      session_id: 's2',
      stop_hook_active: true,
    });
    assert.equal(r.exitCode, 0);

    const recs = readRecords(traceFile(projectDir, 's2'));
    assert.equal(recs[0].data.stop_hook_active, true);
  });

  it('stop_hook_active 누락 → false 로 기본화', () => {
    const r = runWrapper(SCRIPT, projectDir, {
      session_id: 's3',
    });
    assert.equal(r.exitCode, 0);

    const recs = readRecords(traceFile(projectDir, 's3'));
    assert.equal(recs[0].data.stop_hook_active, false);
  });

  it('AC-TW06: .harness/ missing → silent-skip', () => {
    const bareDir = tmpProject({ initHarness: false });
    try {
      const r = runWrapper(SCRIPT, bareDir, {
        session_id: 's',
        stop_hook_active: false,
      });
      assert.equal(r.exitCode, 0);
      assert.ok(!existsSync(`${bareDir}/.harness`));
    } finally {
      rmSync(bareDir, { recursive: true, force: true });
    }
  });

  it('AC-TW07: invalid stdin → exit(0)', () => {
    const r = runWrapper(SCRIPT, projectDir, '{broken json');
    assert.equal(r.exitCode, 0);
  });
});
