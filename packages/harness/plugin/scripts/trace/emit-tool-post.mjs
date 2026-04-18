// scripts/trace/emit-tool-post.mjs
//
// [Role] PostToolUse wildcard hook → trace-emit writer
//
// tool 실행 이후 발화하는 PostToolUse 이벤트를 tool_post 로 기록한다.
// Inspector 는 같은 tool 호출의 tool_pre ↔ tool_post 를 session_id + tool
// 순서로 pair 로 렌더한다 (P3).
//
// [Contract]
// - 모든 경로에서 exit(0).
// - .harness/ 미존재 시 writer 가 silent-skip.
// - 출력 형태: { kind: "tool_post", source: "PostToolUse", tool, data: {response} }

import { writeTraceRecord } from '../state/trace-emit.mjs';
import { readHookPayload, runTrace } from './_shared.mjs';

const SCRIPT = 'emit-tool-post';

runTrace(SCRIPT, async () => {
  const payload = await readHookPayload(SCRIPT);
  if (!payload) return;

  writeTraceRecord({
    kind: 'tool_post',
    source: 'PostToolUse',
    session_id: payload.session_id,
    tool: payload.tool_name,
    data: {
      input: payload.tool_input ?? null,
      response: payload.tool_response ?? null,
    },
  });
});
