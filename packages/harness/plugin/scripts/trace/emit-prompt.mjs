// scripts/trace/emit-prompt.mjs
//
// [Role] UserPromptSubmit 선두 hook → pipeline 진입 전 원본 프롬프트 기록.
//
// gate-engine / quality-check / auto-transform 이 프롬프트를 읽거나
// 제안을 생성하기 **전** 에 유저가 입력한 원본을 기록한다.
// 대응 쌍(emit-prompt-transformed) 이 pipeline 종료 후 최종 상태를 기록하여
// Inspector 가 "before → after" diff 를 그린다.
//
// [Contract]
// - 모든 경로에서 exit(0).
// - .harness/ 미존재 시 writer 가 silent-skip.
// - 출력 형태: { kind: "prompt", source: "UserPromptSubmit", data: {original} }

import { writeTraceRecord } from '../state/trace-emit.mjs';
import { readHookPayload, runTrace } from './_shared.mjs';

const SCRIPT = 'emit-prompt';

runTrace(SCRIPT, async () => {
  const payload = await readHookPayload(SCRIPT);
  if (!payload) return;

  writeTraceRecord({
    kind: 'prompt',
    source: 'UserPromptSubmit',
    session_id: payload.session_id,
    data: {
      original: payload.prompt ?? '',
    },
  });
});
