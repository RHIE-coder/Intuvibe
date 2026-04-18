// scripts/trace/emit-tool-pre.mjs
//
// [Role] PreToolUse wildcard hook → trace-emit writer
//
// Claude Code 가 tool 실행 직전 발화하는 PreToolUse 이벤트를
// 모두 tool_pre trace 레코드로 수집한다.
// Safety/Gate matcher 가 차단하더라도 이 wrapper 는 별도 matcher 블록이라
// 독립적으로 실행되어 "시도" 를 남긴다.
//
// [Contract]
// - 모든 경로에서 exit(0). tool 실행 차단 금지.
// - .harness/ 미존재 시 writer 가 silent-skip.
// - 출력 형태: { kind: "tool_pre", source: "PreToolUse", tool, data: {input} }

import { writeTraceRecord } from '../state/trace-emit.mjs';
import { readHookPayload, runTrace } from './_shared.mjs';

const SCRIPT = 'emit-tool-pre';

runTrace(SCRIPT, async () => {
  const payload = await readHookPayload(SCRIPT);
  if (!payload) return;

  writeTraceRecord({
    kind: 'tool_pre',
    source: 'PreToolUse',
    session_id: payload.session_id,
    tool: payload.tool_name,
    data: { input: payload.tool_input ?? null },
  });
});
