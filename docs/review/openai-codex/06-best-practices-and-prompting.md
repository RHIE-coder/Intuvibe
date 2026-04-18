# OpenAI Codex - Best Practices and Prompting

> **Site**: https://developers.openai.com/codex
> **Reviewed on**: 2026-04-18
> **Scope**: Best practices, prompting guidance, and what they imply for operating Codex well

---

## 1. OpenAI는 Codex 사용법을 "프롬프트 문장"보다 운영 습관으로 본다

OpenAI 공식 Codex 문서의 `Best practices`와 `Codex Prompting Guide`를 같이 보면, 좋은 사용법을 단순 prompt wording 팁으로 설명하지 않는다. 오히려:

- thread를 어떻게 나눌지
- 언제 subagent를 쓸지
- 어떤 도구를 우선 쓸지
- 어떤 형식으로 작업을 지시할지
- 반복 작업을 어떻게 skill이나 automation으로 승격할지

같은 **운영 습관**으로 설명한다.

이건 중요한 관점이다. Codex의 성능은 한 번의 "좋은 명령문"보다, **작업 구조를 얼마나 잘 잡느냐**에 더 크게 좌우된다는 뜻이기 때문이다.

---

## 2. Best practices에서 읽히는 운영 원칙

OpenAI 공식 `Best practices` 문서에서 특히 눈에 띄는 건 thread, subagent, skill, automation을 한 흐름으로 본다는 점이다.

공식 문서에는 다음 취지의 권장이 들어간다.

- 같은 문제라면 한 thread를 유지하라
- 진짜로 갈라지는 일일 때만 fork 하라
- bounded work는 subagent로 main thread 밖으로 밀어라
- 반복되는 작업은 skill이나 automation으로 승격하라

이건 매우 실무적이다.

즉 Codex 운영은:

- 단일 대화창에 모든 걸 욱여넣는 방식도 아니고
- 모든 걸 새 thread로 쪼개는 방식도 아니다

오히려 **coherent thread 유지 + bounded delegation + stable workflow packaging**의 조합으로 보는 게 맞다.

이 구조는 하네스 설계에도 그대로 적용된다. `bench`, `skills`, `agents`, `automation`을 각각 독립 기능으로 보기보다, **작업 안정화의 서로 다른 단계**로 보는 편이 더 자연스럽다.

---

## 3. Prompting Guide에서 읽히는 핵심

OpenAI의 `Codex Prompting Guide`는 본질적으로 "Codex에게 뭘 말할까"보다, **어떻게 작업 계약을 명확히 만들까**에 가깝다.

가이드에서 일관되게 읽히는 핵심은 이렇다.

### 3-1. 목표와 제약을 분명히 준다

Codex는 막연한 요청도 처리할 수 있지만, 결과 품질은 다음이 분명할수록 좋아진다.

- 원하는 결과
- 범위
- 제약
- 검증 기준

즉 "이거 고쳐줘"보다:

- 무엇을 고칠지
- 어디를 볼지
- 어떤 성공 기준으로 끝낼지

가 명확할수록 훨씬 안정적이다.

### 3-2. 긴 프롬프트는 구조화한다

Codex Prompting Guide는 긴 지시를 한 문단으로 흘리지 않고, 구조화된 형식으로 주는 쪽에 무게를 둔다. 실제로 task, constraints, tools, output format, verification을 분리할수록 행동이 더 안정된다.

이건 결국 prompt engineering이라기보다 **spec writing**에 가깝다.

### 3-3. 도구 사용 우선순위를 명시하면 더 잘 따른다

가이드에는 가능한 경우 전용 tool을 shell보다 우선하고, 계획이나 diff 편집도 특정 tool을 쓰도록 유도하는 예시가 반복해서 나온다. 특히 `apply_patch`와 `update_plan` 같은 명시적 작업 도구를 강하게 추천하는 맥락이 보인다.

즉 Codex는 도구 환경이 있을 때, "무슨 도구를 언제 써야 하는지"를 프롬프트에서 더 명확히 줄수록 더 일관되게 동작한다.

---

## 4. Prompt는 사실상 작업 계약서에 가깝다

Best practices와 Prompting Guide를 함께 보면, 좋은 Codex prompt는 문학적인 문장이 아니라 사실상 아래 항목을 갖춘 작업 계약서에 가깝다.

- **Goal**: 원하는 결과
- **Scope**: 어디까지 포함하는지
- **Constraints**: 건드리면 안 되는 것, 선호하는 방식
- **Verification**: 완료 판정 기준
- **Output shape**: 요약, diff, JSON, 리뷰 포맷 등

이 구조는 하네스 관점에서 특히 중요하다. 현재 `spec`, `plan`, `review`, `qa` 같은 스킬들이 하는 일이 결국 이 작업 계약서를 다른 task shape에 맞게 반복 가능하게 만드는 것이기 때문이다.

즉 Codex prompting best practice는 별도의 감성적 팁이 아니라, **하네스가 구조화하려는 작업 인터페이스 자체**와 연결된다.

---

## 5. thread와 subagent 사용법에서 배우는 점

OpenAI 공식 best practices는 같은 문제를 가능한 한 한 thread 안에 유지하라고 권한다. reasoning trail을 유지하는 것이 도움이 되기 때문이다. 반면 bounded work는 subagent로 위임하라고 한다.

이 차이는 매우 중요하다.

- main thread: 문제 정의, 통합 판단, 최종 결정
- subagent: 조사, 테스트, triage, bounded execution

즉 subagent는 "똑똑한 보조자"라기보다, **main thread의 context 오염을 줄이고 병렬성을 얻기 위한 runtime pattern**이다.

이건 현재 repo의 agent/reviewer 구조와도 잘 맞는다. reviewer persona를 많이 만드는 것만으로 충분하지 않고, 언제 main thread가 직접 판단하고 언제 분리할지를 설계해야 하기 때문이다.

---

## 6. skills와 automations로의 승격이 중요하다

Best practices 문서에서 반복 작업을 skill이나 automation으로 승격하라는 메시지는 매우 중요하다.

이는 곧:

- 한 번 잘 된 prompt는 그냥 채팅 로그에 묻혀선 안 되고
- 재사용 가능한 workflow asset이 되어야 하며
- 더 안정되면 scheduled/background automation으로 승격될 수 있어야 한다

는 뜻이다.

이건 하네스가 지향하는 바와 거의 같다.

- ad-hoc prompt
- reusable skill
- installable plugin
- repeatable automation

으로 올라가는 승격 경로를 명시할수록, 사용자의 숙련도에 덜 의존하는 시스템이 된다.

---

## 7. 현재 repo에 주는 시사점

현재 repo는 이미 다음 자산을 가지고 있다.

- `skills/`
- `agents/`
- `bench/tests`
- `bench/scenarios`
- plugin / marketplace 구조

그래서 OpenAI 공식 guidance를 기준으로 보면 다음이 더 중요해진다.

### 7-1. 스킬은 prompt 템플릿이 아니라 작업 계약 템플릿이어야 한다

단순히 멋진 문구를 담는 게 아니라:

- goal
- scope
- constraints
- verification
- output

을 안정적으로 강제하는 구조여야 한다.

### 7-2. `bench/scenarios`는 prompting 품질까지 검증할 수 있어야 한다

지금은 코드/워크플로우 검증 중심이지만, 더 나아가면 "이 skill prompt가 실제로 의도한 행동을 유도하는가"도 시나리오 레벨에서 볼 수 있다.

### 7-3. 반복 작업을 skill -> automation으로 올리는 경로를 더 분명히 할 수 있다

OpenAI 공식 best practice는 이 승격 경로를 강하게 시사한다. 하네스도 이 흐름을 문서와 구조에서 더 노출할수록 좋아진다.

---

## 8. 설계적으로 배울 점

OpenAI Codex의 `Best practices`와 `Prompting Guide`에서 배울 점은 분명하다.

1. **좋은 prompt는 좋은 작업 계약이다**
   감성적 표현보다 결과, 범위, 제약, 검증이 중요하다.

2. **thread는 문제 단위로 유지한다**
   맥락이 같은 문제는 가능한 한 같은 thread에 둔다.

3. **subagent는 bounded delegation에 쓴다**
   context 분리와 병렬성이 목적이다.

4. **잘 되는 workflow는 skill로 승격한다**
   재사용 가능한 자산으로 만들지 않으면 조직 학습이 안 쌓인다.

5. **더 안정되면 automation으로 승격한다**
   반복 작업은 eventually background work가 된다.

이 다섯 가지는 prompt engineering보다는 **workflow engineering**에 가깝다.

---

## 9. 한 줄 정리

> OpenAI 공식 Codex 가이드는 "어떻게 멋지게 말할까"보다 "어떻게 작업 구조를 안정화할까"에 가깝다.
> 좋은 prompt는 목표·범위·제약·검증을 가진 작업 계약서이고, 잘 되는 작업은 thread 운영, subagent 위임, skill 승격, automation 승격으로 이어져야 한다.

---

## Sources

- https://developers.openai.com/codex/learn/best-practices
- https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide
- https://developers.openai.com/codex
