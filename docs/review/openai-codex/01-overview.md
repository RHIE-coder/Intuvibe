# OpenAI Codex - Overview

> **Site**: https://developers.openai.com/codex
> **Source type**: OpenAI official developer docs
> **Reviewed on**: 2026-04-18
> **Scope**: Codex product docs, use cases, and adjacent official docs surfaced from the Codex section

---

## 1. 한눈에 본 구조

OpenAI의 Codex 문서는 단일 CLI 설명서가 아니라, **코딩 에이전트 제품군 전체**를 다루는 허브에 가깝다.

문서 정보구조를 보면 Codex를 아래 축으로 나눈다.

- **Getting Started**: overview, quickstart, pricing, prompting, models, workflows
- **Using Codex**: App, IDE Extension, CLI, Web, Integrations, Codex Security
- **Configuration**: config file, rules, hooks, AGENTS.md, MCP, plugins, skills, subagents
- **Automation**: non-interactive mode, Codex SDK, app server, MCP server, GitHub Action
- **Learn**: best practices, videos, cookbook, building AI teams
- **Use Cases**: 실제 업무 시나리오 라이브러리

핵심은 명확하다.

> OpenAI는 Codex를 "코드를 조금 도와주는 도구"가 아니라, 여러 실행 표면과 자동화 표면을 가진 **agentic coding platform**으로 포지셔닝하고 있다.

---

## 2. 제품 포지셔닝에서 읽히는 것

공식 Codex 섹션은 App, IDE, CLI, Web을 병렬 1급 인터페이스로 둔다. 여기에 GitHub, Slack, Linear 같은 통합과 Security, Governance, Managed configuration까지 붙어 있다.

이 배치는 두 가지를 의미한다.

1. Codex의 중심은 특정 UI가 아니라 **세션/자동화/설정 계층**이다.
2. 개인 개발 도구에서 끝나지 않고, **팀 단위 운영과 관리**를 전제로 문서 구조가 잡혀 있다.

특히 Configuration 아래에 `rules`, `hooks`, `AGENTS.md`, `MCP`, `plugins`, `skills`, `subagents`가 한 묶음으로 들어간 점이 중요하다. 이는 OpenAI가 Codex를 단순 모델 사용법이 아니라, **행동 제어와 실행 환경 구성의 문제**로 본다는 뜻이다.

이 관점은 현재 이 repo의 `packages/harness/plugin` 설계 방향과 꽤 잘 맞는다.

---

## 3. 우리 하네스 관점에서 중요한 포인트

### 3-1. Claude와 유사한 축이 공식화되어 있음

Codex 문서 구조에는 이미 다음 축이 공식 1급 개념으로 있다.

- rules
- hooks
- AGENTS.md
- MCP
- plugins
- skills
- subagents
- non-interactive mode
- GitHub Action

즉, 우리가 하네스에서 중요하게 보는 "행동 강제", "검증 루프", "확장 포인트", "자동화"가 Codex 문서에도 정식 개념으로 잡혀 있다.

### 3-2. CLI만 보면 절반만 본다

Claude에 익숙한 사용자 입장에서는 Codex를 우선 CLI로 보게 되지만, 공식 문서상 Codex는 이미:

- 앱
- IDE 확장
- CLI
- 웹
- 원격/자동화 표면

으로 확장되어 있다.

즉 향후 `harness`가 Codex 대응을 더 진지하게 하려면, 단순 CLI 명령 매핑보다 **설정/정책/자동화 계층 호환성**을 먼저 봐야 한다.

### 3-3. Use cases 섹션이 강하다

Codex use cases에는 단순 코드 작성보다 더 넓은 범위가 있다.

- PR review
- front-end 디자인 구현
- large codebase 이해
- API 업그레이드
- bug triage 자동화
- Slack 기반 task kickoff
- skill 저장
- CLI 생성

즉 Codex는 "코드 생성기"보다 **개발 워크플로우 오케스트레이터**에 가깝게 설명된다.

---

## 4. 현재 repo에 주는 시사점

### 강한 정합성

현재 repo의 관심사:

- plugin marketplace
- plugin manifest
- rules
- hooks
- skills
- agents
- bench/tests
- automation 관점

이 대부분이 Codex 공식 문서의 1급 항목과 직접 겹친다.

### 보강할 지점

반면 우리 쪽은 아직 아래 항목은 상대적으로 약하다.

- App / IDE / Web 표면별 차이 정리
- Security / Governance / Managed configuration 관점
- Non-interactive mode / GitHub Action 중심 자동화 시나리오
- Codex SDK / App Server / MCP Server를 축으로 한 운영 설계

즉 지금 단계에서는 "Codex CLI 대응"만 문서화하기보다, **Codex product surface 전체를 수용하는 구조**로 review를 쌓는 게 맞다.

---

## 5. 추천 후속 리뷰 순서

이 섹션은 시작점으로 좋지만, 실제로 하네스 설계에 반영하려면 다음 문서들을 이어서 봐야 한다.

1. CLI Overview / Features / Command Line Options
2. Config Basics / Advanced Config / Config Reference
3. Rules / Hooks / AGENTS.md
4. MCP / Plugins / Skills / Subagents
5. Non-interactive Mode / GitHub Action
6. Best practices
7. Codex Prompting Guide

이 순서가 좋은 이유는, 사용 표면보다 먼저 **정책과 구성 계층**을 잡아야 하네스 설계에 바로 연결되기 때문이다.

---

## 6. 한 줄 정리

> OpenAI의 Codex 공식 문서는 CLI 설명서가 아니라, App·IDE·CLI·Web·Automation·Config·Security를 포함한 **코딩 에이전트 운영 플랫폼 문서**다.
> 이 repo가 다루는 `rules / hooks / plugins / skills / subagents / automation` 관심사와 직접 겹치므로, Codex는 "지원 대상 플랫폼"이 아니라 **하네스 설계의 기준 비교군**으로 볼 가치가 크다.

---

## Sources

- https://developers.openai.com/codex
- https://developers.openai.com/codex/use-cases
- https://developers.openai.com/api/docs/models/gpt-5.3-codex
