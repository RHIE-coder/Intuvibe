// bench/tests/trace/_helpers.mjs
//
// Trace wrapper 테스트 공용 helper.

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLUGIN_SCRIPTS = resolve(__dirname, '../../../plugin/scripts');

export function wrapperPath(name) {
  return resolve(PLUGIN_SCRIPTS, 'trace', `${name}.mjs`);
}

export function tmpProject({ initHarness = true } = {}) {
  const dir = resolve(tmpdir(), `harness-trace-wire-${randomBytes(4).toString('hex')}`);
  mkdirSync(dir, { recursive: true });
  if (initHarness) {
    mkdirSync(resolve(dir, '.harness/state'), { recursive: true });
  }
  return dir;
}

export function runWrapper(scriptPath, projectDir, payload, { pluginRoot, producer } = {}) {
  const env = {
    ...process.env,
    CLAUDE_PROJECT_DIR: projectDir,
    ...(pluginRoot ? { CLAUDE_PLUGIN_ROOT: pluginRoot } : {}),
    ...(producer ? { HARNESS_PRODUCER: producer } : {}),
  };
  const input = payload === null ? '' : (typeof payload === 'string' ? payload : JSON.stringify(payload));
  try {
    const stdout = execFileSync('node', [scriptPath], {
      env,
      input,
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

export function traceFile(projectDir, sessionId) {
  return resolve(projectDir, '.harness/state/traces', `${sessionId}.jsonl`);
}

export function readRecords(filePath) {
  if (!existsSync(filePath)) return [];
  return readFileSync(filePath, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}
