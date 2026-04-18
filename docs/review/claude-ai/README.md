# Claude AI Review

> Claude Code 공식 문서와 관련 공식 자료를 하네스 관점에서 정리한 리뷰 묶음.
> 목적은 Claude Code를 단순 CLI가 아니라, 도구·컨텍스트·권한·확장 구조를 가진 에이전트 런타임으로 읽는 것이다.

---

## 문서 구성

| # | 문서 | 초점 |
|---|------|------|
| 01 | [How Claude Code Works](01-how-claude-code-works.md) | agentic loop, 도구, 세션, 컨텍스트 전반 |
| 02 | [Features Overview](02-features-overview.md) | 핵심 기능 지형도 |
| 03 | [Claude Directory](03-claude-directory.md) | `.claude/` 디렉터리와 설정 표면 |
| 04 | [Context Window](04-context-window.md) | 컨텍스트 관리와 압축 |
| 05 | [Memory](05-memory.md) | 메모리와 지속 컨텍스트 |
| 06 | [Permission Modes](06-permission-modes.md) | 권한 모드와 안전장치 |
| 07 | [Common Workflows](07-common-workflows.md) | 자주 쓰는 작업 흐름 |
| 08 | [Best Practices](08-best-practices.md) | 운영 원칙과 프롬프트 습관 |
| 09 | [Sub-agents](09-sub-agents.md) | 작업 위임 구조 |
| 10 | [Agent Teams](10-agent-teams.md) | 다중 에이전트 팀 패턴 |
| 11 | [MCP](11-mcp.md) | 외부 도구 연결 구조 |
| 12 | [Discover Plugins](12-discover-plugins.md) | 플러그인 탐색 |
| 13 | [Plugins](13-plugins.md) | 플러그인 구조와 배포 |
| 14 | [Skills](14-skills.md) | skill 개념과 구조 |
| 15 | [Hooks Guide](15-hooks-guide.md) | lifecycle hook 구조 |
| 16 | [Channels](16-channels.md) | 채널 개념 |
| 17 | [Scheduled Tasks](17-scheduled-tasks.md) | 반복 작업 자동화 |
| 18 | [Headless](18-headless.md) | 비대화형 실행 |

추가 자료:

- [api-curated-for-harness.md](api-curated-for-harness.md)
- [extra-llms-txt.md](extra-llms-txt.md)
- [extra-mcp-plugin-integration-guide.md](extra-mcp-plugin-integration-guide.md)
- [extra-mcp-server-build-guide.md](extra-mcp-server-build-guide.md)

---

## 이 묶음의 의미

이 묶음은 현재 하네스 설계의 가장 기본적인 플랫폼 대조군이다.

특히 중요한 축은:

- agentic loop
- permissions / sandboxing
- `.claude/` 설정 표면
- plugins / skills / hooks / MCP
- sub-agents
- headless / scheduled task

즉 Claude AI 리뷰는 "어떻게 Claude Code를 쓰나"보다, **Claude Code가 어떤 구조로 동작하고 무엇을 확장 지점으로 제공하나**를 읽는 자료에 가깝다.

---

## 하네스 관점의 한 줄 정리

> Claude AI 리뷰는 현재 하네스가 직접 얹히는 기반 플랫폼을 해부한 문서 묶음이다.
> rules, hooks, skills, plugins, headless 실행을 설계할 때 가장 먼저 참조해야 하는 1차 기준이다.

---

## 참고

- 스냅샷 마커: [2026.04](2026.04)
- 상위 인덱스: [../README.md](../README.md)
