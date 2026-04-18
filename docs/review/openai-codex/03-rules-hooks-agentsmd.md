# OpenAI Codex - Rules, Hooks, and AGENTS.md

> **Site**: https://developers.openai.com/codex
> **Reviewed on**: 2026-04-18
> **Scope**: Rules, Hooks, AGENTS.md, and what they imply for harness architecture

---

## 1. 세 기능은 따로가 아니라 제어 계층이다

OpenAI 공식 Codex 문서에서 `Rules`, `Hooks`, `AGENTS.md`는 모두 `Configuration` 아래에 나란히 놓여 있다. 이 배치는 우연이 아니다.

- `Rules`: 어떤 명령을 어떤 조건에서 허용할지
- `Hooks`: 어떤 시점에 어떤 결정론적 스크립트를 삽입할지
- `AGENTS.md`: 어떤 지속 지침을 어떤 범위에 주입할지

즉 이 셋은 각각 다른 기능이 아니라, Codex의 **행동 제어 plane**을 이루는 서로 다른 레이어다.

하나로 요약하면 이렇다.

- `AGENTS.md`는 모델에게 **무엇을 우선시할지** 알려준다.
- `Rules`는 런타임이 **무엇을 허용할지** 제한한다.
- `Hooks`는 lifecycle 중간에 **무엇을 검사하거나 주입할지** 결정한다.

이 구조는 현재 우리가 하네스에서 `CLAUDE.md`류 지침, hook 기반 강제, 정책 파일을 분리해 생각하던 흐름과 거의 정확히 대응된다.

---

## 2. Rules는 "권한 정책 코드"에 가깝다

OpenAI 공식 `Rules` 문서는 이를 "Control which commands Codex can run outside the sandbox"라고 정의한다. 핵심은 규칙이 단순 allowlist 텍스트가 아니라, `prefix_rule()` 기반 정책 언어라는 점이다.

문서상 중요한 사실:

- 규칙 파일은 `rules/` 아래의 `.rules` 파일로 관리된다.
- 포맷은 **Starlark** 기반이다.
- `pattern`, `decision`, `justification`, `match`, `not_match`를 지원한다.
- 결정 우선순위는 `forbidden > prompt > allow` 다.
- `match` / `not_match`는 사실상 **inline unit tests** 역할을 한다.

이건 꽤 좋은 설계다. 단순 문자열 허용 목록보다:

- 검증 가능한 정책
- 설명 가능한 정책
- 더 restrictive 한 규칙 우선

을 동시에 제공하기 때문이다.

특히 shell wrapper 처리도 눈에 띈다. 문서에 따르면 `bash -lc "git add . && rm -rf /"` 같은 명령은 안전하게 분해 가능한 경우 개별 명령으로 쪼개서 평가하고, 복잡한 셸 기능이 섞이면 보수적으로 전체를 하나의 invocation으로 취급한다.

이건 하네스 설계 관점에서 매우 중요하다. "안전한 명령 prefix"를 관리하려면 단순 prefix match로 끝나지 않고, **compound shell 해석 전략**까지 포함해야 한다는 뜻이기 때문이다.

---

## 3. Hooks는 강력하지만 아직 불완전하다

OpenAI 공식 `Hooks` 문서는 첫 줄부터 명확하다. Hooks는 "Run deterministic scripts during the Codex lifecycle"이고, 동시에 **experimental**이며 Windows 지원이 꺼져 있다.

문서상 핵심 포인트:

- feature flag가 필요하다: `[features] codex_hooks = true`
- 대표 위치는 `~/.codex/hooks.json`, `<repo>/.codex/hooks.json`
- 여러 `hooks.json`이 있으면 **모두 로드**된다
- 같은 이벤트에 매칭되는 여러 hook은 **병렬 실행**될 수 있다
- hook 입력은 `stdin` JSON으로 들어간다

현재 이벤트 축은 다음과 같다.

- `SessionStart`
- `PreToolUse`
- `PostToolUse`
- `UserPromptSubmit`
- `Stop`

하지만 제약도 명확하다.

- `PreToolUse` / `PostToolUse`는 현재 사실상 **Bash 중심**
- 문서에도 "useful guardrail rather than a complete enforcement boundary"라고 적혀 있다
- MCP, Write, WebSearch 같은 다른 툴은 아직 전부 가로채지 못한다

즉 Hooks는 매우 유용하지만, **정책 집행의 최종 경계**로 믿으면 안 된다. 오히려:

- 지침 주입
- 로깅
- 정적 검사
- 후처리 검토

같은 deterministic augmentation 계층으로 보는 게 맞다.

---

## 4. AGENTS.md는 단일 파일이 아니라 계층형 체인이다

OpenAI 공식 `AGENTS.md` 문서는 단순 "프로젝트 안내 파일"이 아니라, Codex가 시작 시 읽는 **instruction chain**으로 설명된다.

문서상 discovery 규칙은 중요하다.

1. 글로벌 scope:
   `~/.codex/AGENTS.override.md`가 있으면 우선, 없으면 `~/.codex/AGENTS.md`
2. 프로젝트 scope:
   프로젝트 루트에서 현재 디렉터리까지 내려오며 각 디렉터리에서
   `AGENTS.override.md` -> `AGENTS.md` -> fallback filenames 순으로 최대 1개를 채택
3. 병합 순서:
   루트에서 현재 디렉터리 방향으로 이어 붙이고, **더 깊은 디렉터리 파일이 더 늦게 와서 override 효과**를 낸다

추가로 문서상 기본 제한도 명시되어 있다.

- combined size limit: `project_doc_max_bytes`
- 기본값: `32 KiB`
- fallback filename 확장 가능: `project_doc_fallback_filenames`
- `CODEX_HOME` 으로 별도 profile도 가능

이 구조는 매우 실용적이다. 한 장의 거대한 instructions 파일보다:

- 글로벌 기본 작업 방식
- repo-level 규칙
- 서브디렉터리별 특수 규칙

을 자연스럽게 계층화할 수 있기 때문이다.

---

## 5. 세 레이어를 함께 보면 더 명확해진다

Codex 공식 구조를 하네스 관점으로 번역하면 이렇다.

### 5-1. AGENTS.md는 "의도와 기본 습관"

- 테스트를 언제 돌릴지
- 어떤 패키지 매니저를 선호할지
- 어떤 디렉터리에서 어떤 절차를 따를지

같은 규범을 넣는다.

### 5-2. Rules는 "권한 결정"

- 어떤 prefix를 자동 허용할지
- 어떤 명령은 매번 prompt 할지
- 어떤 명령은 금지할지

를 정한다.

### 5-3. Hooks는 "runtime intervention"

- 시작 시 context 주입
- tool 실행 전 차단
- tool 실행 후 검토
- stop 시 추가 패스 강제

를 수행한다.

즉 Codex는 지침, 권한, lifecycle 개입을 분리하고 있다. 이건 좋은 설계다. 세 가지가 서로 다른 failure mode를 막기 때문이다.

---

## 6. 현재 repo에 주는 함의

이 repo는 아직 `AGENTS.md`가 아니라 `CLAUDE.md`와 `.claude/rules/...` 중심이다. 그런데 Codex 리뷰를 기준으로 보면 앞으로의 대응 전략은 꽤 선명하다.

### 6-1. `CLAUDE.md`와 `AGENTS.md`를 개념적으로 분리해서 봐야 한다

지금은 Claude 지침 파일이 사실상 "프로젝트 사용 설명 + 행동 규칙 + 작업 방식"을 한꺼번에 품고 있다. Codex 관점에서는 이걸:

- persistent instructions
- execution policy
- runtime hooks

로 분해해서 생각하는 편이 더 명료하다.

### 6-2. hook은 enforcement가 아니라 augmentation으로 설계해야 한다

OpenAI 공식 문서가 이미 `PreToolUse`를 완전한 경계가 아니라고 못 박고 있다. 따라서 하네스도 hook만 믿고 destructive command 통제를 전부 맡기면 안 된다.

더 안전한 방향은:

- instructions
- policy/rules
- hooks
- verification/tests

를 겹쳐 놓는 것이다.

### 6-3. 디렉터리별 instruction layering은 하네스와 잘 맞는다

`packages/harness/plugin`, `packages/harness/bench`, `packages/harness/dev`처럼 역할이 다르면, Codex식 `AGENTS.md` 계층 모델은 상당히 잘 맞는다.

예를 들면:

- repo root: 공통 작업 규칙
- `packages/harness/plugin/`: 배포본 수정 규칙
- `packages/harness/bench/`: 테스트/시나리오 규칙
- `packages/harness/dev/`: 설계 문서 규칙

이런 식으로 분기할 수 있다.

---

## 7. 설계적으로 배울 점

OpenAI Codex 공식 문서에서 특히 배울 만한 점은 세 가지다.

1. **지침과 권한을 분리한다**
   지침은 AGENTS.md, 권한은 Rules다. 이 분리는 중요하다.

2. **hook은 deterministic script 레이어로 제한한다**
   훅을 만능 자동화로 포장하지 않고, lifecycle script로 규정한다.

3. **instruction discovery를 계층 구조로 만든다**
   글로벌 -> 루트 -> 하위 디렉터리 순서의 체인은 대형 repo에서 특히 강하다.

이 세 가지는 하네스가 Codex 대응을 진지하게 할수록 더 중요해진다.

---

## 8. 한 줄 정리

> OpenAI 공식 문서에서 `AGENTS.md`, `Rules`, `Hooks`는 각각 문서, 정책, 스크립트 기능처럼 보이지만 실제로는 Codex 행동 제어를 구성하는 3층 구조다.
> 하네스 설계도 같은 관점으로 `persistent instructions / execution policy / runtime augmentation`을 분리해보는 것이 가장 자연스럽다.

---

## Sources

- https://developers.openai.com/codex/rules
- https://developers.openai.com/codex/hooks
- https://developers.openai.com/codex/guides/agents-md
- https://developers.openai.com/codex
