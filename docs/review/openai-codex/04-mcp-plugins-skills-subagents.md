# OpenAI Codex - MCP, Plugins, Skills, and Subagents

> **Site**: https://developers.openai.com/codex
> **Reviewed on**: 2026-04-18
> **Scope**: MCP, plugins, skills, subagents, and their role boundaries in Codex

---

## 1. 네 가지는 모두 확장이지만 성격이 다르다

OpenAI 공식 Codex 문서를 보면 `MCP`, `Plugins`, `Skills`, `Subagents`가 모두 확장 축처럼 보이지만, 실제 역할은 꽤 다르다.

공식 문서를 바탕으로 가장 간단히 구분하면 이렇다.

- **MCP**: Codex에 외부 도구와 컨텍스트를 연결한다.
- **Skills**: 특정 작업을 위한 재사용 가능한 워크플로우를 정의한다.
- **Plugins**: skills, app integrations, MCP servers를 묶어 배포한다.
- **Subagents**: 병렬로 일을 나눠 수행하는 실행 패턴이다.

즉 이들은 모두 "Codex를 확장"하지만 확장 축이 다르다.

- MCP는 **연결 계층**
- Skills는 **행동 계층**
- Plugins는 **패키징 계층**
- Subagents는 **실행 오케스트레이션 계층**

이 구분은 하네스 설계에서 매우 중요하다. 이 경계가 흐려지면 설정, 배포, 위임, 자동화가 한데 섞이기 쉽다.

---

## 2. MCP는 외부 세계를 여는 표준 연결 레이어다

OpenAI 공식 `Model Context Protocol` 문서는 MCP를 "Give Codex access to third-party tools and context"라고 정의한다. 문서 본문에서는 MCP가 third-party documentation이나 browser, Figma 같은 developer tools에 접근하게 해준다고 설명한다.

문서상 핵심 포인트:

- CLI와 IDE extension 둘 다 MCP server를 지원한다.
- config는 `config.toml`에 저장된다.
- 기본 위치는 `~/.codex/config.toml`
- trusted project에서는 `.codex/config.toml`로 project scope도 가능
- STDIO server와 Streamable HTTP server 둘 다 지원한다
- CLI에서 `codex mcp`로 관리한다
- TUI에서는 `/mcp`로 active server를 본다

중요한 건 OpenAI가 MCP를 plugin 하위 개념이 아니라, **독립 configuration 항목**으로 둔다는 점이다. 즉 MCP는 특정 plugin의 내부 구현 디테일이 아니라, Codex 전체가 이해하는 연결 표준이다.

이건 하네스 관점에서 매우 좋은 신호다. 외부 시스템 연결을 ad-hoc 스크립트나 특정 plugin 내부 로직으로 감추는 대신, **공용 인터페이스 계층**으로 빼는 게 더 유지보수에 좋다는 뜻이기 때문이다.

---

## 3. Skills는 워크플로우의 저작 형식이다

OpenAI 공식 `Agent Skills` 문서는 skills를 "task-specific capabilities"로 설명하고, 더 구체적으로는:

> a skill packages instructions, resources, and optional scripts so Codex can follow a workflow reliably

라고 정의한다.

또 문서에서 아주 중요한 문장이 하나 더 있다.

> Skills are the authoring format for reusable workflows. Plugins are the installable distribution unit for reusable skills and apps in Codex.

즉 skill은 배포 단위가 아니라 **워크플로우 설계 단위**다.

문서상 중요한 구조:

- skill은 디렉터리 하나다
- 필수 파일은 `SKILL.md`
- 선택적으로 `scripts/`, `references/`, `assets/`, `agents/openai.yaml` 를 둘 수 있다
- Codex는 metadata만 먼저 읽고 필요할 때만 full `SKILL.md`를 로드한다
- explicit invocation과 implicit invocation 둘 다 가능하다

이 progressive disclosure 구조는 특히 좋다. 워크플로우 자산을 많이 쌓아도 처음부터 모든 지침을 context에 풀로 넣지 않고, 필요할 때만 로드하기 때문이다.

현재 repo의 `packages/harness/plugin/skills/*` 구조와도 매우 잘 맞는다.

---

## 4. Plugins는 설치/배포의 단위다

OpenAI 공식 `Plugins` 문서는 플러그인을 이렇게 설명한다.

> Plugins bundle skills, app integrations, and MCP servers into reusable workflows for Codex.

그리고 plugin이 담을 수 있는 것으로 다음을 명시한다.

- Skills
- Apps
- MCP servers

문서상 눈에 띄는 점:

- Codex app과 CLI 둘 다 plugin directory를 가진다
- CLI에서는 `codex` 실행 후 `/plugins`로 plugin list를 연다
- 설치 후 새 thread에서 plugin을 쓰도록 요청한다
- `@`로 특정 plugin이나 bundled skill을 명시할 수 있다

이 구조는 중요하다. OpenAI는 skill을 개별 install artifact로 보지 않고, **plugin 안에 묶여 배포되는 reusable workflow asset**으로 본다.

즉 skill과 plugin의 관계는:

- skill = 설계/저작
- plugin = 배포/설치

다.

이건 지금 우리가 marketplace, plugin manifest, skills 디렉터리 구조를 고민하는 상황과 직접 연결된다.

---

## 5. Subagents는 확장 포인트가 아니라 실행 패턴이다

OpenAI 공식 `Subagents` 문서는 subagent를 병렬 작업 오케스트레이션으로 설명한다.

핵심 문장:

> Codex can run subagent workflows by spawning specialized agents in parallel and then collecting their results in one response.

그리고 중요한 제약도 같이 적혀 있다.

- 현재 기본 활성화 상태다
- Codex는 **명시적으로 요청했을 때만** subagent를 spawn 한다
- 토큰을 더 많이 쓴다
- sandbox policy를 상속한다
- interactive CLI에서는 비활성 thread에서 approval이 떠오를 수 있다
- `/agent`로 active agent thread를 관리한다

즉 subagent는 MCP나 plugin 같은 "설치형 확장"이 아니다. 오히려:

- 일을 병렬로 쪼개고
- 각 child에게 다른 역할을 주고
- 다시 parent가 결과를 통합하는

**runtime orchestration primitive**에 가깝다.

이 차이를 놓치면, subagent를 plugin이나 skill처럼 "추가 기능"으로 오해하기 쉽다.

---

## 6. 네 계층의 경계를 한 번에 정리하면

Codex 공식 문서를 하네스 관점으로 번역하면 이렇게 정리된다.

### 6-1. MCP

- 외부 시스템과 연결
- 표준 프로토콜
- config 중심
- tool/context ingress

### 6-2. Skills

- 작업 절차를 기술
- instructions-first
- optional scripts/references
- context 효율을 위한 progressive disclosure

### 6-3. Plugins

- skills + apps + MCP servers를 묶음
- 설치와 배포의 단위
- directory / marketplace / install flow와 연결

### 6-4. Subagents

- 병렬 위임과 결과 통합
- 실행 시점 동적 orchestration
- 비용/approval/sandbox 고려가 필요한 runtime primitive

이 네 가지는 서로 보완적이지만, 같은 문제를 푸는 건 아니다.

---

## 7. 현재 repo에 주는 시사점

현재 repo는 이미 이 분리에 꽤 가까운 구조를 갖고 있다.

- `skills/` 가 존재한다
- `agents/` 가 존재한다
- plugin manifest와 marketplace를 다룬다
- 외부 도구 연결과 자동화에 관심이 있다

그래서 Codex 대응 전략도 더 분명해진다.

### 7-1. skill과 plugin을 분리해서 설계해야 한다

OpenAI 문서가 명확히 말하듯, skill은 workflow authoring format이고 plugin은 installable distribution unit이다. 이건 매우 좋은 분리다.

즉 하네스에서도:

- skill을 어떻게 잘 설계할지
- 그 skill을 어떤 plugin 패키지에 넣어 배포할지

를 별개 문제로 보는 게 맞다.

### 7-2. MCP는 plugin 내부 구현보다 상위 연결 계층으로 봐야 한다

plugin이 MCP server를 포함할 수는 있지만, MCP 자체는 Codex가 직접 이해하는 표준 연결 모델이다. 따라서 하네스도 "외부 연결"을 plugin-specific hack로 만들기보다, 가능한 한 MCP 중심으로 사고하는 게 낫다.

### 7-3. subagent는 설치 대상이 아니라 workflow capability다

현재 repo의 `agents/`와 review persona 구조를 생각하면, Codex의 subagent 모델은 꽤 중요한 비교군이다. 다만 여기서 핵심은 agent file을 만드는 것보다, **언제 병렬 위임하고 언제 main thread에 남길지**다.

---

## 8. 설계적으로 배울 점

OpenAI Codex 공식 문서에서 특히 배울 만한 점은 다음과 같다.

1. **Skills와 plugins의 역할을 분리한다**
   워크플로우 설계와 배포 단위를 섞지 않는다.

2. **MCP를 공용 연결 표준으로 둔다**
   외부 도구 접근을 개별 plugin 구현 세부사항으로 가두지 않는다.

3. **Subagent를 명시적 opt-in 병렬 실행으로 둔다**
   무조건 자동 위임하지 않고, 비용과 통제 가능성을 유지한다.

4. **설치형 자산과 실행형 자산을 구분한다**
   plugin은 installable asset, subagent는 runtime behavior다.

이 분리는 하네스가 커질수록 더 중요해진다.

---

## 9. 한 줄 정리

> OpenAI 공식 Codex 문서에서 `MCP`, `Skills`, `Plugins`, `Subagents`는 모두 확장처럼 보이지만 실제로는 각각 연결, 워크플로우 저작, 배포, 병렬 실행을 담당하는 서로 다른 계층이다.
> 하네스 설계도 이 경계를 유지할수록 구조가 덜 꼬이고, marketplace/plugin/skill/agent 설계가 더 명확해진다.

---

## Sources

- https://developers.openai.com/codex/mcp
- https://developers.openai.com/codex/plugins
- https://developers.openai.com/codex/skills
- https://developers.openai.com/codex/subagents
- https://developers.openai.com/codex
