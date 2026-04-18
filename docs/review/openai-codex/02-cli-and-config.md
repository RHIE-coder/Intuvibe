# OpenAI Codex - CLI and Config

> **Site**: https://developers.openai.com/codex
> **Reviewed on**: 2026-04-18
> **Scope**: CLI, command surface, config surface, and their implications for harness design

---

## 1. 먼저 보이는 것

OpenAI 공식 Codex 문서에서 CLI는 독립 섹션이지만, 전체 구조 안에서는 어디까지나 **여러 실행 표면 중 하나**로 배치된다.

Codex 섹션의 `Using Codex` 아래에는:

- App
- IDE Extension
- CLI
- Web
- Integrations

이 병렬로 놓여 있고, 그 아래 별도 `Configuration` 축으로:

- Config Basics
- Advanced Config
- Config Reference
- Rules
- Hooks
- AGENTS.md
- MCP
- Plugins
- Skills
- Subagents

가 나열된다.

이 구조가 의미하는 건 분명하다.

> OpenAI는 Codex CLI를 단독 도구로 설명하지 않고, **정책과 실행환경이 연결된 Codex surface 하나**로 설명한다.

즉 CLI 사용법보다 더 중요한 것은, CLI가 기대하는 설정 계층과 확장 계층이다.

---

## 2. CLI는 "명령어"보다 "운영 표면"에 가깝다

공식 정보구조상 CLI에는 최소한 아래 하위 문서가 따로 있다.

- CLI Overview
- CLI Features
- Command Line Options
- Slash commands

여기서 읽히는 건 CLI를 단순한 `run one prompt` 도구가 아니라, 다음을 포함한 작업 환경으로 본다는 점이다.

- 대화형 세션
- 명령행 옵션 기반 정책 제어
- slash command 기반 운영 UX
- 다른 surface와 이어지는 공통 개념

실제로 현재 로컬 `codex --help`에서도 이 방향은 일치한다.

- 인터랙티브 실행이 기본
- `resume`, `fork`, `exec`, `review`, `marketplace`, `mcp` 같은 운영 명령이 별도 존재
- `--sandbox`, `--ask-for-approval`, `--full-auto`, `--dangerously-bypass-approvals-and-sandbox` 같이 실행 정책을 바꾸는 옵션이 핵심 위치에 있다

즉 Codex CLI의 본질은 "프롬프트를 CLI로 보낸다"보다, **에이전트를 어떤 안전 정책과 세션 정책 위에서 굴릴지 정한다**에 가깝다.

---

## 3. Config는 부가 기능이 아니라 중심 계층이다

Codex 공식 문서에서 `Configuration`이 따로 분리되어 있고, 그 아래에 단순 `config file`만 있는 게 아니라:

- rules
- hooks
- AGENTS.md
- MCP
- plugins
- skills
- subagents

가 같이 배치된 점이 중요하다.

이건 설정을 단순 preference 저장소가 아니라, **에이전트 행동을 형성하는 운영 계층**으로 본다는 뜻이다.

특히 이 분류는 Claude 사용자에게 익숙한 감각과 비슷하지만, Codex 쪽은 더 명시적으로 아래를 하나의 configuration universe 안에 넣는다.

- 실행 정책
- 확장 정책
- 컨텍스트 주입 규칙
- 자동화 훅
- 위임 구조

이 관점은 하네스 설계에서 매우 중요하다. `plugin.json`, rules 문서, hooks, skills, agents를 따로따로 보지 말고, **하나의 control plane**으로 봐야 한다는 뜻이기 때문이다.

---

## 4. Claude 대비로 보면 더 선명해진다

Claude 사용자는 보통 이런 식으로 적응한다.

- CLI 명령 먼저 익힘
- slash command 익힘
- permissions/sandbox 감각 익힘
- 그 다음 plugin/MCP 쪽으로 감

하지만 Codex 공식 문서 구조는 사실 반대 신호를 준다.

1. CLI는 실행 입구일 뿐
2. 실제 차별점은 config, rules, hooks, plugins, skills, subagents
3. automation과 remote execution까지 포함해 봐야 전체가 보임

즉 Codex 학습 순서는 CLI flag 암기보다:

1. surface map 이해
2. config model 이해
3. safety/approval model 이해
4. extension model 이해
5. automation model 이해

쪽이 더 맞다.

---

## 5. 우리 repo에 바로 연결되는 부분

현재 이 repo의 핵심 관심사는 이미 Codex 공식 분류와 거의 겹친다.

- `.claude-plugin` / marketplace
- `packages/harness/plugin/.claude-plugin/plugin.json`
- rules 문서
- skills
- agents
- hooks
- 테스트와 검증 흐름

그래서 Codex 대응을 할 때도 CLI 치환표만 만들면 부족하다. 더 중요한 건 아래다.

### 5-1. plugin은 config와 분리되지 않는다

Codex 문서 구조에서는 plugins가 config 섹션 안에 있다. 이는 플러그인을 기능 추가물로만 보지 않고, **행동 환경의 일부**로 본다는 뜻이다.

지금 하네스도 같은 철학으로 가는 게 맞다.

### 5-2. rules / hooks / skills / subagents는 하나의 묶음으로 봐야 한다

이 네 가지는 실제로 서로 다른 기능이지만, Codex 문서 구조상 하나의 운영 계층에 있다. 따라서 하네스에서도:

- 규칙은 언제 적용되는가
- 훅은 어떤 이벤트에 걸리는가
- 스킬은 어떤 작업을 유도하는가
- 서브에이전트는 무엇을 분리 위임하는가

를 통합적으로 설명해야 한다.

### 5-3. automation까지 이어져야 완성된다

Codex는 `Non-interactive Mode`, `Codex SDK`, `GitHub Action`을 별도 축으로 둔다. 따라서 하네스 설계도 인터랙티브 사용만이 아니라:

- headless 실행
- CI 연결
- 반복 작업 자동화
- 원격 실행

을 염두에 두고 shape을 잡아야 한다.

---

## 6. 모델 관점에서의 추가 메모

OpenAI 공식 모델 문서에 따르면 `codex-mini-latest`는 **Codex CLI에 특화된 빠른 reasoning 모델**이고, `gpt-5.3-codex`는 현재 **가장 능력 높은 agentic coding model**로 소개된다.

이건 두 가지 해석을 가능하게 한다.

1. Codex CLI 자체는 빠른 반복용 기본 모델 경험을 염두에 둔다.
2. 더 무거운 코딩 작업은 Codex 계열 고성능 모델과 함께 쓰는 방향을 전제한다.

즉 Codex를 단일 모델 경험으로 보기보다, **표면과 모델을 분리한 운영 체계**로 이해하는 편이 맞다.

---

## 7. 한 줄 정리

> OpenAI 공식 문서에서 Codex CLI는 단독 툴이 아니라, App·IDE·Web·Automation과 나란히 놓인 하나의 실행 표면이다.
> 진짜 중심은 CLI flag 자체보다 `config / rules / hooks / MCP / plugins / skills / subagents`가 이루는 **운영 계층**이며, 이 점이 현재 하네스 설계와 가장 강하게 맞닿는다.

---

## Sources

- https://developers.openai.com/codex
- https://developers.openai.com/api/docs/models/codex-mini-latest
- https://developers.openai.com/api/docs/models/gpt-5.3-codex
