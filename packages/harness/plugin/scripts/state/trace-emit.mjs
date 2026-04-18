// scripts/state/trace-emit.mjs
//
// [Model Limit Assumption]
// LLM은 자신을 감싼 하네스의 실행 타임라인(hook 발화, tool 호출, agent fork,
// worktree 생성)을 스스로 재구성하지 못한다.
// → 세션별 append-only JSONL로 기록하여 apps/inspector가 복원 가능하게 함.
//
// [Stream 구분]
// audit-append.mjs → policy audit (정책 판단)
// event-emit.mjs   → feature lifecycle (도메인 집계)
// trace-emit.mjs   → runtime mechanism (이 파일)  — session-scoped
//
// [Module / CLI dual role]
//   - `writeTraceRecord(partial, options?)` — plugin/scripts/trace/* wrapper 가 import
//   - CLI: `node trace-emit.mjs --kind tool_pre --session-id abc --tool Bash`
//     또는 stdin JSON. CLI 는 writeTraceRecord 위의 얇은 쉘.
//
// [Exit Protocol — CLI]
// exit(0) = 기록 성공, 빈 입력 no-op, 또는 .harness/ 미존재 silent-skip
// exit(1) = 런타임 에러 (잘못된 JSON, 필수 필드 누락, 파일 I/O 실패)

import { mkdirSync, appendFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openSync, flockSync, closeSync } from './flock.mjs';

const HARNESS_DIR = '.harness';
const TRACES_DIR = '.harness/state/traces';
const UNKNOWN_SESSION_FILE = '_unknown-session';
const UNKNOWN_SESSION_VALUE = '_unknown';
const MAX_RECORD_BYTES = 65536;        // 64KB
const FIELD_TRUNCATE_THRESHOLD = 4096; // 4KB per string

const TOP_LEVEL_FIELDS = new Set([
  'v', 'ts', 'session_id', 'turn', 'span_id', 'parent_span_id',
  'kind', 'source', 'tool', 'producer',
]);

/**
 * 고유 span_id (16진수 12자리 + prefix)
 */
function generateSpanId() {
  return 'span-' + randomBytes(6).toString('hex');
}

/**
 * data 트리 내부 큰 문자열 필드를 TRUNCATED 마커로 대체
 */
function truncateTree(v) {
  if (typeof v === 'string' && v.length > FIELD_TRUNCATE_THRESHOLD) {
    return `[TRUNCATED ${v.length} bytes]`;
  }
  if (Array.isArray(v)) return v.map(truncateTree);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = truncateTree(val);
    return out;
  }
  return v;
}

function applyTruncation(record) {
  const serialized = JSON.stringify(record);
  if (serialized.length <= MAX_RECORD_BYTES) return record;

  // 1단계: data 내부 큰 문자열 필드 개별 truncate
  const truncated = { ...record };
  let dataBody = truncateTree(truncated.data ?? {});
  if (typeof dataBody !== 'object' || Array.isArray(dataBody)) {
    dataBody = { value: dataBody };
  }
  dataBody.truncated = true;
  truncated.data = dataBody;

  // 2단계: 여전히 한도 초과면 data 자체를 요약으로 교체
  if (JSON.stringify(truncated).length > MAX_RECORD_BYTES) {
    truncated.data = {
      truncated: true,
      hint: `record exceeded ${MAX_RECORD_BYTES} bytes even after field truncation`,
      original_size: serialized.length,
    };
  }

  return truncated;
}

/**
 * Core writer — wrapper 스크립트가 import 하는 진입점.
 *
 * @param {object} partial  최소 {kind} 필요. session_id/tool/data/source 등 선택
 * @param {object} [options]
 *   - projectDir: CLAUDE_PROJECT_DIR override
 *   - producer:   HARNESS_PRODUCER override
 * @returns {object|null}  기록된 record 또는 null (silent-skip 시)
 * @throws  kind 누락 또는 파일 I/O 실패
 */
export function writeTraceRecord(partial, options = {}) {
  const projectDir = options.projectDir ?? process.env.CLAUDE_PROJECT_DIR ?? '.';
  const producer = options.producer ?? process.env.HARNESS_PRODUCER ?? 'unknown';

  // .harness/ 미존재 — silent-skip.
  // trace wrapper 는 wildcard hook 으로 모든 세션에 발화되므로,
  // 하네스가 설치되지 않은 프로젝트에서는 조용히 무시.
  if (!existsSync(resolve(projectDir, HARNESS_DIR))) {
    return null;
  }

  if (!partial || typeof partial !== 'object') {
    throw new Error('writeTraceRecord: partial record object 필수');
  }
  if (!partial.kind) {
    throw new Error('writeTraceRecord: kind 필드 필수');
  }

  let record = { ...partial };
  if (!record.v) record.v = 1;
  if (!record.ts) record.ts = new Date().toISOString();
  if (!record.span_id) record.span_id = generateSpanId();
  if (!('parent_span_id' in record)) record.parent_span_id = null;
  if (!record.producer) record.producer = producer;

  let fileName;
  if (record.session_id) {
    fileName = `${record.session_id}.jsonl`;
  } else {
    record.session_id = UNKNOWN_SESSION_VALUE;
    fileName = `${UNKNOWN_SESSION_FILE}.jsonl`;
  }

  record = applyTruncation(record);

  const tracesDir = resolve(projectDir, TRACES_DIR);
  const targetPath = resolve(tracesDir, fileName);
  mkdirSync(tracesDir, { recursive: true });

  const fd = openSync(targetPath);
  try {
    flockSync(fd);
    appendFileSync(targetPath, JSON.stringify(record) + '\n', 'utf8');
  } finally {
    closeSync(fd);
  }

  return record;
}

// ---------------------------------------------------------------------------
// CLI layer — writeTraceRecord 위의 얇은 쉘
// ---------------------------------------------------------------------------

/**
 * CLI 인자 파싱 (--key value)
 */
function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, '');
    const val = argv[i + 1];
    if (key && val !== undefined) args[key] = val;
  }
  return args;
}

/**
 * CLI 인자 → record.
 *   알려진 최상위 필드는 record 에 세팅
 *   나머지는 record.data 하위로 모음
 *   하이픈은 언더스코어로 치환 (--session-id → session_id)
 */
function cliToRecord(args) {
  const record = {};
  const data = {};
  let hasData = false;

  for (const [rawKey, rawVal] of Object.entries(args)) {
    const key = rawKey.replace(/-/g, '_');
    if (TOP_LEVEL_FIELDS.has(key)) {
      if (key === 'v' || key === 'turn') record[key] = Number(rawVal);
      else record[key] = rawVal;
    } else {
      data[key] = rawVal;
      hasData = true;
    }
  }

  if (hasData) record.data = data;
  return record;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8').trim();
}

async function cliMain() {
  const cliArgs = parseArgs(process.argv);

  let record;
  if (cliArgs.kind) {
    record = cliToRecord(cliArgs);
  } else {
    const raw = await readStdin();
    if (!raw) process.exit(0); // 빈 입력 no-op (AC-TR14)
    try {
      record = JSON.parse(raw);
    } catch (e) {
      process.stderr.write(`trace-emit: JSON 파싱 실패 — ${e.message}\n`);
      process.exit(1); // AC-TR10
    }
  }

  if (!record.kind) {
    process.stderr.write('trace-emit: kind 필드 필수\n');
    process.exit(1); // AC-TR13
  }

  let written;
  try {
    written = writeTraceRecord(record);
  } catch (e) {
    process.stderr.write(`trace-emit: ${e.message}\n`);
    process.exit(1);
  }

  if (written === null) {
    // silent-skip (.harness/ 미존재) — AC-TR08
    process.exit(0);
  }

  // stdout 에 기록된 레코드 반환 (호출자가 parent_span_id 로 사용 가능)
  process.stdout.write(JSON.stringify(written) + '\n');
  process.exit(0);
}

// CLI 로 직접 실행되는 경우에만 main 실행 (import 시에는 skip)
const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectRun) {
  cliMain().catch((e) => {
    process.stderr.write(`trace-emit: ${e.message}\n`);
    process.exit(1);
  });
}
