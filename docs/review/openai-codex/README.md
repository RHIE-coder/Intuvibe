# OpenAI Codex Review

> OpenAI 공식 Codex 문서를 기준으로, Codex를 CLI 하나가 아니라 **코딩 에이전트 운영 플랫폼**으로 읽기 위한 리뷰 묶음.
> 목적은 `packages/harness` 설계와의 접점을 찾고, marketplace/plugin/skill/agent/automation 구조를 더 명확히 잡는 것.

---

## 문서 구성

| # | 문서 | 초점 |
|---|------|------|
| 01 | [Overview](01-overview.md) | Codex 전체 문서 구조와 제품 포지셔닝 |
| 02 | [CLI and Config](02-cli-and-config.md) | CLI surface와 config/control plane |
| 03 | [Rules, Hooks, and AGENTS.md](03-rules-hooks-agentsmd.md) | 지침, 권한 정책, runtime hook의 3층 구조 |
| 04 | [MCP, Plugins, Skills, and Subagents](04-mcp-plugins-skills-subagents.md) | 연결, 워크플로우 저작, 배포, 병렬 실행의 역할 구분 |
| 05 | [Automation and GitHub Action](05-automation-and-github-action.md) | headless 실행, SDK, app-server, GitHub CI integration |
| 06 | [Best Practices and Prompting](06-best-practices-and-prompting.md) | 운영 원칙, 프롬프트 구조, thread/subagent/tool usage 지침 |

---

## 지금까지 읽은 핵심

OpenAI 공식 문서를 기준으로 보면 Codex는 단순 CLI가 아니다. 더 정확히는:

- App / IDE / CLI / Web 의 다중 surface
- Config / Rules / Hooks / AGENTS.md 의 제어 계층
- MCP / Plugins / Skills / Subagents 의 확장 계층
- `codex exec` / SDK / app-server / GitHub Action 의 자동화 계층

을 가진 운영 플랫폼에 가깝다.

이 해석은 현재 이 repo의 관심사와 직접 맞닿는다.

- plugin marketplace
- plugin manifest
- rules / hooks
- skills / agents
- bench/tests/scenarios
- headless automation 가능성

즉 Codex는 "지원 대상 CLI"가 아니라, 하네스를 비교하고 수렴시킬 **기준 플랫폼**으로 보는 편이 더 맞다.

---

## 하네스 관점의 요약

현재까지의 리뷰에서 가장 중요한 구조적 교훈은 네 가지다.

1. **지침, 정책, hook을 분리해야 한다**
   `AGENTS.md`, `Rules`, `Hooks`는 서로 다른 failure mode를 다룬다.

2. **skill과 plugin을 분리해야 한다**
   skill은 workflow authoring, plugin은 distribution unit이다.

3. **MCP는 공용 연결 계층으로 봐야 한다**
   외부 도구 접근은 plugin 구현 세부사항보다 상위 표준으로 다루는 편이 낫다.

4. **자동화는 부가 기능이 아니다**
   `codex exec`, SDK, GitHub Action까지 포함해 headless 실행을 1급으로 봐야 한다.

---

## 참고

- 스냅샷 마커: [2026.04](2026.04)
- 주요 출처 허브: https://developers.openai.com/codex
