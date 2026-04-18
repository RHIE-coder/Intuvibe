# OpenAI Codex - Automation and GitHub Action

> **Site**: https://developers.openai.com/codex
> **Reviewed on**: 2026-04-18
> **Scope**: Non-interactive mode, Codex SDK, App Server, GitHub Action, and automation architecture

---

## 1. OpenAI는 Codex를 자동화 가능한 런타임으로 본다

OpenAI 공식 Codex 문서에서 `Automation`은 별도 최상위 축으로 분리되어 있다.

- Non-interactive Mode
- Codex SDK
- App Server
- MCP Server
- GitHub Action

이 구조는 중요하다. OpenAI는 Codex를 단순 인터랙티브 툴로 보지 않고, **스크립트, CI/CD, 제품 임베딩, 프로토콜 서버, GitHub 워크플로우**까지 포함하는 자동화 런타임으로 보고 있다.

즉 Codex의 완전한 활용 범위는:

- 사람이 TUI에서 직접 쓰는 것
- 스크립트가 headless로 호출하는 것
- 애플리케이션 내부에 내장하는 것
- GitHub 이벤트에 반응하게 하는 것

까지 포함한다.

이건 하네스 설계 관점에서 매우 중요하다. 플러그인과 스킬만 잘 만드는 것으로 끝나지 않고, **어떻게 반복 실행되고 자동화되며 외부 시스템에 연결되는지**까지 함께 설계해야 하기 때문이다.

---

## 2. Non-interactive mode는 headless entrypoint다

OpenAI 공식 `Non-interactive mode` 문서는 시작부터 분명하다.

> Use `codex exec` to run Codex in scripts and CI

그리고 본문도 같은 메시지를 반복한다.

> Non-interactive mode lets you run Codex from scripts (for example, continuous integration (CI) jobs) without opening the interactive TUI.

문서상 중요한 포인트:

- headless entrypoint는 `codex exec`
- 기본 sandbox는 read-only
- 자동화에서는 최소 권한 원칙을 권장
- `--json`으로 JSONL event stream을 출력 가능
- `--output-schema` + `-o`로 구조화된 산출물 생성 가능
- `CODEX_API_KEY`는 `codex exec` 에서 지원
- `codex exec resume --last` 로 비대화형 세션도 이어갈 수 있음
- stdin 파이프 기반 workflow를 강하게 지원함

이건 단순 "CLI를 headless로 돌릴 수 있다" 수준이 아니다. 사실상 `codex exec`은 **automation-friendly agent runner**다.

특히 JSONL event stream과 schema-bound output은 중요하다. 에이전트 결과를 사람이 읽는 텍스트에서 끝내지 않고, **파이프라인 입력으로 쓸 수 있는 출력 형식**으로 바꿔주기 때문이다.

---

## 3. Codex SDK는 로컬 에이전트 제어 API다

OpenAI 공식 `Codex SDK` 문서는 SDK를 이렇게 설명한다.

> Programmatically control local Codex agents

그리고 언제 써야 하는지도 꽤 명확하게 적어둔다.

- CI/CD 파이프라인 일부로 Codex를 제어할 때
- 복잡한 엔지니어링 작업을 위해 자체 agent를 만들 때
- 내부 도구와 워크플로우에 Codex를 내장할 때
- 자체 애플리케이션 안에 Codex를 통합할 때

즉 `codex exec`이 shell entrypoint라면, SDK는 **프로그램 제어 entrypoint**다.

이 차이는 중요하다.

- `codex exec`은 빠른 스크립트 자동화
- SDK는 더 구조화된 내장/오케스트레이션

에 가깝다.

하네스 관점에서 보면, 단순한 CI 태스크는 `codex exec`로 충분할 수 있지만, 여러 단계의 상태 관리나 커스텀 UI/서비스와 결합되면 SDK 쪽이 더 자연스럽다.

---

## 4. App Server는 제품 임베딩용 프로토콜 레이어다

OpenAI 공식 `Codex App Server` 문서는 App Server를 이렇게 정의한다.

> Embed Codex into your product with the app-server protocol

그리고 매우 중요한 구분을 하나 둔다.

> If you are automating jobs or running Codex in CI, use the Codex SDK instead.

즉 App Server는 automation runner가 아니라 **rich client integration protocol**이다.

문서상 핵심 포인트:

- `codex app-server`는 Codex rich client를 위한 인터페이스다
- VS Code extension 같은 rich client를 구동하는데 쓰인다
- `stdio`와 `websocket` transport를 지원한다
- 프로토콜은 JSON-RPC 2.0 계열이다
- 요청/응답/notification 기반으로 thread와 turn을 다룬다
- schema generation도 제공한다

이건 단순 API wrapper가 아니다. 대화, 승인, 이벤트 스트리밍, 스레드 상태를 가진 **agent runtime protocol**에 가깝다.

따라서 App Server는:

- 자체 앱/IDE/내부 도구에 Codex UI 경험을 깊게 내장하고 싶을 때
- client/server 분리를 유지하고 싶을 때

적합하다.

반면 CI나 배치 처리에는 과하다.

---

## 5. GitHub Action은 CI용 opinionated 래퍼다

OpenAI 공식 `Codex GitHub Action` 문서는 이를 이렇게 설명한다.

> Trigger Codex actions from GitHub Events

그리고 본문에서는:

> Use the Codex GitHub Action (`openai/codex-action@v1`) to run Codex in CI/CD jobs, apply patches, or post reviews from a GitHub Actions workflow.

라고 적고 있다.

핵심은 이 액션이 직접 모든 걸 새로 정의하는 게 아니라:

- Codex CLI를 설치하고
- API key가 있으면 Responses API proxy를 시작하고
- 지정한 permissions 아래에서 `codex exec`를 실행하는

**GitHub-optimized wrapper**라는 점이다.

즉 GitHub Action은 별도 자동화 모델이 아니라, `codex exec` 기반 자동화를 GitHub Events 문맥에 잘 맞게 감싼 배포 형태다.

이건 실무적으로 매우 좋다. GitHub issue, PR, CI failure, scheduled workflow 같은 트리거를 Codex 실행과 자연스럽게 묶을 수 있기 때문이다.

---

## 6. 네 가지를 한 번에 정리하면

OpenAI 공식 문서를 바탕으로 automation 축을 정리하면 이렇다.

### 6-1. `codex exec`

- headless 실행 entrypoint
- scripts / CI / shell pipelines
- JSONL 출력, schema 출력 가능

### 6-2. `Codex SDK`

- 프로그래밍 제어 entrypoint
- 내부 도구, custom orchestration, app integration

### 6-3. `codex app-server`

- rich client embedding protocol
- thread/turn/event를 다루는 JSON-RPC 계층

### 6-4. `openai/codex-action@v1`

- GitHub Actions 전용 배포 래퍼
- 내부적으로 Codex CLI와 `codex exec` 흐름을 활용

즉 이들은 경쟁 관계가 아니라, 자동화 수준과 통합 수준이 다른 선택지들이다.

---

## 7. 현재 repo에 주는 시사점

현재 repo는 주로 다음에 집중하고 있다.

- plugin/marketplace 구조
- rules/hooks/skills/agents 설계
- bench/tests/scenarios

그런데 Codex 공식 automation 문서를 기준으로 보면, 앞으로 보강할 축은 꽤 선명하다.

### 7-1. 배포 구조만큼 headless 실행 구조가 중요하다

플러그인 구조가 잘 잡혀 있어도, 실제 자동화 사용처가 없다면 활용 폭이 좁다. Codex는 공식적으로 `codex exec`, SDK, GitHub Action까지 제공하므로, 하네스도:

- headless 검증
- CI에서의 리뷰/분석 실행
- 구조화 출력

을 명시적으로 설계할 필요가 있다.

### 7-2. `bench`와 automation이 연결될 수 있다

현재 `bench/tests`와 `bench/scenarios`는 사람이 돌리는 검증 구조에 가깝다. 그런데 Codex의 non-interactive mode를 보면, 일부 흐름은 `codex exec` 기반 시나리오 검증으로도 연결 가능하다.

즉 향후에는:

- deterministic test
- scenario evaluation
- codex-driven review/triage

를 구분해 자동화 레이어를 만들 수 있다.

### 7-3. GitHub Action은 하네스 배포 후 활용 채널이 될 수 있다

Codex GitHub Action은 하네스 사용자에게 중요한 downstream 활용 지점이 될 수 있다. 예를 들어:

- PR 리뷰 자동화
- 실패 로그 triage
- migration 제안
- structured summary 생성

같은 흐름을 Codex 기반으로 제공할 수 있다.

---

## 8. 설계적으로 배울 점

OpenAI Codex 공식 automation 문서에서 배울 점은 분명하다.

1. **인터랙티브와 자동화를 분리한다**
   TUI와 headless entrypoint를 명확히 나눈다.

2. **출력을 기계 친화적으로 만든다**
   JSONL stream, schema-bound output은 자동화에서 매우 중요하다.

3. **통합 수준별 entrypoint를 제공한다**
   `exec`, SDK, app-server, GitHub Action이 각각 다른 수준의 통합 문제를 푼다.

4. **CI를 1급 사용처로 본다**
   자동화는 부가 기능이 아니라 핵심 실행 표면이다.

이건 하네스 설계가 커질수록 반드시 필요해지는 관점이다.

---

## 9. 한 줄 정리

> OpenAI 공식 Codex 문서에서 automation은 부가 기능이 아니라 별도 제품 표면이다.
> `codex exec`은 headless runner, SDK는 프로그래밍 제어 레이어, app-server는 rich client embedding protocol, GitHub Action은 CI용 opinionated wrapper로 구분되며, 하네스도 이 수준 차이를 반영해 자동화 구조를 설계하는 게 맞다.

---

## Sources

- https://developers.openai.com/codex/noninteractive
- https://developers.openai.com/codex/sdk
- https://developers.openai.com/codex/app-server
- https://developers.openai.com/codex/github-action
- https://developers.openai.com/codex
