// scripts/trace/emit-prompt-transformed.mjs
//
// [Role] UserPromptSubmit 말미 hook → pipeline 종료 후 최종 프롬프트 기록.
//
// quality-check / auto-transform 이 제안한 변환 결과를 수집한다.
// 현재 auto-transform 은 자연어 → bypass flag 제안만 수행(mutation 없음)
// 하므로 final == original 인 경우가 많고, 차이는 matches 로 드러난다.
//
// Inspector 는 emit-prompt(원본) 과 이 레코드(변환 제안 포함) 를
// session_id + turn 으로 pair 하여 diff 뷰를 렌더한다.
//
// [Contract]
// - 모든 경로에서 exit(0).
// - .harness/ 미존재 시 writer 가 silent-skip.
// - auto-transform lexicon 매치는 여기서 재감지 (auto-transform.mjs 의
//   출력 스트림과 독립).

import { writeTraceRecord } from '../state/trace-emit.mjs';
import { readHookPayload, runTrace } from './_shared.mjs';

const SCRIPT = 'emit-prompt-transformed';

// auto-transform.mjs 의 DEFAULT_LEXICON 과 동일 집합.
// 관측은 transform 로직 변화를 쫓아가야 하지만, 런타임 import 대신
// 수동 동기화로 결합도를 낮춘다.  실제 변환은 하지 않고 감지만.
const DEFAULT_LEXICON = {
  'bypass-qa': ['긴급 배포', 'hotfix 배포', '지금 바로 배포', 'QA 없이 배포'],
  'bypass-gates:g1': ['spec 없이', 'spec 건너뛰어'],
  'bypass-gates:g2': ['plan 없이', '계획 건너뛰어'],
  'bypass-review': ['리뷰 스킵', '리뷰 없이', 'QA 바로'],
};

function detectLexiconMatches(prompt) {
  const matches = [];
  for (const [bypassFlag, keywords] of Object.entries(DEFAULT_LEXICON)) {
    for (const kw of keywords) {
      if (prompt.includes(kw)) {
        matches.push({ keyword: kw, bypass_flag: bypassFlag });
      }
    }
  }
  return matches;
}

runTrace(SCRIPT, async () => {
  const payload = await readHookPayload(SCRIPT);
  if (!payload) return;

  const original = payload.prompt ?? '';
  const matches = detectLexiconMatches(original);

  writeTraceRecord({
    kind: 'prompt_transformed',
    source: 'UserPromptSubmit',
    session_id: payload.session_id,
    data: {
      final: original, // auto-transform 은 mutation 하지 않으므로 동일
      matches,
    },
  });
});
