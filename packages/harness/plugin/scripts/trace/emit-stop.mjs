// scripts/trace/emit-stop.mjs
//
// [Role] Stop hook → 세션 종료 경계를 traces 에 기록.
//
// Lifecycle 다이어그램에서 Stop 노드의 점등 근거. 세션 실행이
// 정상 종료 / stop_hook_active 재진입 여부까지 기록한다.
// update-workflow.mjs(상태 저장) 보다 먼저 실행되어야 관측 누락이 없다.
//
// [Contract]
// - 모든 경로에서 exit(0).
// - .harness/ 미존재 시 writer 가 silent-skip.
// - 출력 형태: { kind: "stop", source: "Stop", data: { stop_hook_active } }

import { writeTraceRecord } from '../state/trace-emit.mjs';
import { readHookPayload, runTrace } from './_shared.mjs';

const SCRIPT = 'emit-stop';

runTrace(SCRIPT, async () => {
  const payload = await readHookPayload(SCRIPT);
  if (!payload) return;

  writeTraceRecord({
    kind: 'stop',
    source: 'Stop',
    session_id: payload.session_id,
    data: {
      stop_hook_active: payload.stop_hook_active ?? false,
    },
  });
});
