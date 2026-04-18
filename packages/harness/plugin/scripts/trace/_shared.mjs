// scripts/trace/_shared.mjs
//
// Trace wrapper 공용 헬퍼 — stdin hook payload 를 읽는다.
// 모든 trace wrapper 는 이 모듈을 재사용하여 파싱을 일원화한다.

/**
 * Claude Code 가 hook 발화 시 stdin 으로 넘기는 JSON 을 읽는다.
 *
 * 계약:
 *   - stdin 이 비어 있으면 null 반환 (wrapper 는 no-op 처리)
 *   - 잘못된 JSON 이면 null 반환 + stderr 경고. 절대 throw 하지 않음
 *     (trace wrapper 는 exit(0) 만 반환해야 하므로 내부적으로 억누른다)
 *   - 반환값은 원본 payload 객체
 */
export async function readHookPayload(scriptName) {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (e) {
    process.stderr.write(`${scriptName}: stdin JSON 파싱 실패 — ${e.message}\n`);
    return null;
  }
}

/**
 * trace wrapper 의 표준 실행 래퍼.
 *
 * - 내부에서 throw 가 발생해도 stderr 경고만 남기고 exit(0) 보장
 * - "관측이 작업을 막지 않는다" 불변식을 enforce
 */
export async function runTrace(scriptName, handler) {
  try {
    await handler();
  } catch (e) {
    process.stderr.write(`${scriptName}: ${e.message}\n`);
  }
  process.exit(0);
}
