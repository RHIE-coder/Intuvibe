// bench/tests/trace/architecture.test.mjs
//
// Spec: SPEC-trace-wiring (AC-TW11)
// 정적 검사 — trace wrapper 들이 trace-emit.mjs 를 subprocess 로 재실행하면
// hook 레이턴시가 2배로 늘어난다 (<20ms p95 목표). writeTraceRecord 를 직접
// import 하는 패턴만 허용한다.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TRACE_DIR = resolve(__dirname, '../../../plugin/scripts/trace');

const SUBPROCESS_PATTERNS = [
  /\bchild_process\b/,
  /\bexecFile\b/,
  /\bexecFileSync\b/,
  /\bexec\b\s*\(/,
  /\bspawn\b\s*\(/,
  /\bspawnSync\b/,
];

describe('trace wrappers architecture', () => {
  const wrappers = readdirSync(TRACE_DIR)
    .filter((n) => n.endsWith('.mjs') && !n.startsWith('_'))
    .map((n) => ({ name: n, path: resolve(TRACE_DIR, n) }));

  it('AC-TW11: wrapper 파일이 최소 5개 존재', () => {
    assert.ok(
      wrappers.length >= 5,
      `expected >=5 wrappers, got ${wrappers.length}: ${wrappers.map((w) => w.name).join(', ')}`,
    );
  });

  for (const w of wrappers) {
    it(`AC-TW11: ${w.name} 이 child_process/exec/spawn 사용하지 않음`, () => {
      const src = readFileSync(w.path, 'utf8');
      for (const p of SUBPROCESS_PATTERNS) {
        assert.ok(
          !p.test(src),
          `${w.name} contains forbidden subprocess pattern: ${p}`,
        );
      }
    });

    it(`AC-TW11: ${w.name} 이 writeTraceRecord 를 import`, () => {
      const src = readFileSync(w.path, 'utf8');
      assert.ok(
        /import\s*\{[^}]*\bwriteTraceRecord\b[^}]*\}\s*from\s*['"].*trace-emit\.mjs['"]/.test(src),
        `${w.name} must import { writeTraceRecord } from trace-emit.mjs`,
      );
    });
  }
});
