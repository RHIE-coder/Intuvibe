# Compound Engineering - Docs & Knowledge System

> brainstorms/plans/solutions 3종 문서 체계, knowledge compounding loop, schema 설계, deepening workflow

---

## 1. 문서 체계 개요

### 3종 문서 파이프라인

```
docs/brainstorms/  →  docs/plans/  →  (code)  →  docs/solutions/
   WHAT을 만들까?      HOW 만들까?      실행        무엇을 배웠나?
```

| 디렉토리 | 문서 수 | 생성 스킬 | 역할 |
|----------|:-------:|----------|------|
| `docs/brainstorms/` | 20 | ce:brainstorm | 요구사항 정의 (lightweight PRD) |
| `docs/plans/` | 38 | ce:plan | 구현 계획 (Implementation Units) |
| `docs/solutions/` | 20+ | ce:compound | 해결책/학습 기록 (knowledge base) |
| `docs/specs/` | 8 | 수동 | 플랫폼별 포맷 스펙 |

### Knowledge Compounding Loop

```
ce:brainstorm → docs/brainstorms/*-requirements.md
                    ↓ origin: 필드로 연결
ce:plan → docs/plans/*-plan.md
              ↓ plan: 인자로 전달
ce:work → code + PR
              ↓ 문제 해결 직후
ce:compound → docs/solutions/{category}/*.md
                    ↓ learnings-researcher가 읽음
ce:plan (다음 작업) ← Phase 1.1에서 solutions/ 검색
```

**핵심**: solutions/에 축적된 지식이 다음 plan의 Context & Research 섹션으로 자동 투입. 이것이 "compound" (복리 효과)의 핵심 메커니즘.

---

## 2. Brainstorms: 요구사항 문서

### YAML Frontmatter

```yaml
---
date: 2026-03-15
topic: ce-ideate-skill
---
```

**필드**: `date` (YYYY-MM-DD), `topic` (kebab-case slug). 최소한의 메타데이터.

### 문서 구조 (requirements-capture.md 템플릿)

```markdown
# <Topic Title>

## Problem Frame
## Requirements
  R1. ...
  R2. ...
## Success Criteria
## Scope Boundaries
## Key Decisions
## Dependencies / Assumptions
## Outstanding Questions
  ### Resolve Before Planning    ← 진정한 blocker만
  ### Deferred to Planning       ← 기술/연구 질문
## Next Steps
  → /ce:plan for structured implementation planning
```

### 핵심 설계 원칙

1. **Stable R-IDs**: 요구사항에 `R1, R2, R3...` 번호 부여 → plan의 Requirements Trace에서 추적

2. **구현 세부사항 배제**: 스키마, 엔드포인트, 파일 레이아웃, 코드는 brainstorm에 포함하지 않음 (기술적 brainstorm 제외)

3. **Outstanding Questions 이중 분류**:
   - `Resolve Before Planning`: product-level blocker → planning 전에 해결 필수
   - `Deferred to Planning`: 기술/연구 질문 → `[Affects RN][Technical]` 태그

4. **Naming 진화**:
   - 초기: `YYYY-MM-DD-<topic>-brainstorm.md`
   - 현재: `YYYY-MM-DD-<topic>-requirements.md`

### 규모별 차이

| 규모 | Requirements 수 | 특징 |
|:----:|:---------------:|------|
| **Lightweight** | 0 (문서 생략 가능) | 간단한 확인만, 문서 불필요 |
| **Standard** | 10-15 | Problem Frame + 구조화된 Requirements |
| **Deep** | 20-25 | 상세 R-IDs + ASCII diagrams + JSON 스키마 + 분류 표 |

**실제 예시**:
- `ce-ideate-skill-requirements.md`: R1-R25 (25개 요구사항)
- `codex-delegation-requirements.md`: R1-R22 (22개) + ASCII flow + JSON schema + failure table

### Visual Aid 규칙

| 콘텐츠 패턴 | 시각 보조 |
|------------|----------|
| 다단계 사용자 워크플로우 | Mermaid/ASCII flow diagram |
| 3+ 행동 모드/변형 | Markdown 비교 표 |
| 3+ 상호작용 참여자 | Mermaid/ASCII 관계 다이어그램 |
| 여러 경쟁 접근법 | 비교 표 |

**생략 조건**: prose가 이미 명확, 구현 수준 세부사항, 단순/선형 brainstorm

### Non-Software Brainstorming

`references/universal-brainstorming.md`로 라우팅 (Phase 0 domain classification):

```
Quick (명확한 목표):    2-3 교환
Standard (일부 미지수): 4-6 교환, 옵션 비교
Full (모호한 목표):     심층 탐색, 구조화된 수렴
```

**원칙**: "thinking partner, not an answer machine" — 즉시 완전한 솔루션 생성 대신 사용자와 함께 탐색.

---

## 3. Plans: 구현 계획

### YAML Frontmatter (진화)

```yaml
# 초기 (2월)
---
title: PR Triage, Review & Merge
type: feat
date: 2026-02-08
---

# 현재 (3월+)
---
title: "feat: Add ce:ideate open-ended ideation skill"
type: feat
status: completed
date: 2026-03-15
origin: docs/brainstorms/2026-03-15-ce-ideate-skill-requirements.md
deepened: 2026-03-16
---
```

| 필드 | 설명 | 추가 시기 |
|------|------|----------|
| `title` | 계획 제목 (conventional commit 스타일) | 초기 |
| `type` | feat / fix / refactor | 초기 |
| `date` | 작성 날짜 | 초기 |
| `status` | completed / in-progress | 3월+ |
| `origin` | 원본 brainstorm 문서 경로 | 3월+ |
| `deepened` | deepening 수행 날짜 | 3월+ |

### Naming 진화

```
2월: YYYY-MM-DD-<type>-<name>-plan.md
3월+: YYYY-MM-DD-NNN-<type>-<name>-plan.md  (순번 NNN 추가)
```

### 문서 구조

```markdown
# <Title>

## Overview
## Problem Frame                    (origin brainstorm 참조)
## Requirements Trace               ← R1, R2... 체크박스
## Scope Boundaries
## Context & Research
  ### Relevant Code and Patterns
  ### Institutional Learnings        ← docs/solutions/ 참조!
## Key Technical Decisions
## Open Questions
  ### Resolved During Planning
  ### Deferred to Implementation
## [High-Level Technical Design]     (Deep plans만)
## Implementation Units
  - [ ] Unit 1: <title>
    Goal / Requirements / Dependencies / Files /
    Approach / Execution note / Patterns to follow /
    Test scenarios / Verification
  - [ ] Unit 2: ...
## System-Wide Impact
## Risks & Dependencies
## Documentation / Operational Notes
## Sources & References
```

### Requirements Trace: Brainstorm → Plan 연결

```markdown
## Requirements Trace
- [x] R1. Support open-ended ideation without a pre-existing problem
- [x] R2. Generate many candidates before filtering
- [ ] R3. Ground ideas in actual codebase (deferred)
```

**핵심**: brainstorm의 R-ID가 plan에서 체크박스로 추적됨. `status: completed` = 모든 R-ID 완료.

### Institutional Learnings: Solutions → Plan 연결

```markdown
### Institutional Learnings
- `docs/solutions/skill-design/script-first-skill-architecture.md`:
  "Move processing to script when >50 items or deterministic rules"
- `docs/solutions/skill-design/pass-paths-not-content-to-subagents-2026-03-26.md`:
  "Pass file paths, not content, to reduce token usage"
```

**핵심**: `learnings-researcher` 에이전트가 `docs/solutions/`를 검색하여 관련 학습을 plan의 Context 섹션에 주입.

### Implementation Units

```markdown
- [ ] Unit 1: Core Ideation Framework
  **Goal**: Implement basic ideation pipeline
  **Requirements**: R1, R2, R5
  **Dependencies**: None
  **Files**:
    - Create: `plugins/.../skills/ce-ideate/SKILL.md`
    - Create: `plugins/.../skills/ce-ideate/references/post-ideation-workflow.md`
  **Approach**: ...
  **Execution note**: "Run parallel agents for divergent ideation"
  **Patterns to follow**: Script-first architecture
  **Test scenarios**:
    - Happy: basic ideation with 3 frames
    - Edge: empty codebase
    - Error: all agents fail
  **Verification**: Run ce:ideate on test repo
```

### Plan Depth별 Units 수

| Depth | Units 수 | High-Level Tech Design |
|:-----:|:--------:|:---------------------:|
| **Lightweight** | 2-4 | 없음 |
| **Standard** | 3-6 | 선택적 |
| **Deep** | 4-8 | 포함 |

### Plan Deepening Workflow

`references/deepening-workflow.md` — Phase 5.3에서 활성화:

```
각 plan 섹션에 confidence-gap 점수 부여
  → trigger count + risk bonus + critical-section bonus
  → 상위 2-5 섹션 선택 (2+ 점)
  → 섹션별 1-3 research agents 매핑 (최대 8)
  → 결과를 plan에 통합
  → deepened: YYYY-MM-DD 프론트매터 추가
```

**Agent 매핑 (결정적)**:

| Plan 섹션 | 파견 agents |
|-----------|------------|
| Requirements Trace | spec-flow-analyzer, repo-research-analyst |
| Context & Research | learnings-researcher, framework-docs-researcher, best-practices-researcher |
| Key Technical Decisions | architecture-strategist, framework-docs-researcher |
| Implementation Units | repo-research-analyst, pattern-recognition-specialist |
| System-Wide Impact | architecture-strategist + specialists (performance, security, data) |
| Risks & Dependencies | security-sentinel, data-integrity-guardian, deployment-verification |

### Non-Software Planning

`references/universal-planning.md`로 라우팅:

| 연구 필요도 | 신호 | 행동 |
|:----------:|------|------|
| **없음** | 일반적, 시간 무관, 개념적 | 연구 건너뛰고 직접 계획 |
| **권장** | 장소, 날짜, 가격, 일정 | 2-5 병렬 웹 검색 (haiku 모델) |

**출력**: itinerary / syllabus / runbook / project plan / research plan / options menu — 작업 유형에 맞는 포맷.

---

## 4. Solutions: Knowledge Base

### Two-Track Schema

```yaml
# schema.yaml — docs/solutions/ 정규 계약
tracks:
  bug:
    problem_types: [build_error, test_failure, runtime_error, performance_issue,
                    database_issue, security_issue, ui_bug, integration_issue, logic_error]
  knowledge:
    problem_types: [best_practice, documentation_gap, workflow_issue, developer_experience]
```

### Required Fields

| 필드 | 타입 | 두 트랙 모두 필수 |
|------|------|:-----------------:|
| `module` | string | ✅ |
| `date` | YYYY-MM-DD | ✅ |
| `problem_type` | enum (13종) | ✅ |
| `component` | enum (17종) | ✅ |
| `severity` | critical/high/medium/low | ✅ |
| `symptoms` | array (1-5) | Bug만 |
| `root_cause` | enum (17종) | Bug만 |
| `resolution_type` | enum (10종) | Bug만 |

### Component Enum (17종 — Rails 중심)

```
rails_model, rails_controller, rails_view, service_object,
background_job, database, frontend_stimulus, hotwire_turbo,
email_processing, brief_system, assistant, authentication,
payments, development_workflow, testing_framework,
documentation, tooling
```

**참고**: 이 enum은 Every Inc.의 Rails 프로젝트에 특화됨. 하네스 적용 시 프로젝트별 커스터마이징 필요.

### Category → Directory 매핑

| problem_type | Directory |
|-------------|-----------|
| `build_error` | `docs/solutions/build-errors/` |
| `test_failure` | `docs/solutions/test-failures/` |
| `runtime_error` | `docs/solutions/runtime-errors/` |
| `performance_issue` | `docs/solutions/performance-issues/` |
| `integration_issue` | `docs/solutions/integrations/` |
| `developer_experience` | `docs/solutions/developer-experience/` |
| `workflow_issue` | `docs/solutions/workflow/` |
| `best_practice` | `docs/solutions/best-practices/` |
| `documentation_gap` | `docs/solutions/documentation-gaps/` |
| ... | ... |

### Bug Track Template

```markdown
---
title: [Clear problem title]
date: YYYY-MM-DD
module: [Module]
problem_type: [enum]
component: [enum]
symptoms: [array]
root_cause: [enum]
resolution_type: [enum]
severity: [enum]
tags: [keyword-one, keyword-two]
---

# [Title]
## Problem          ← 1-2문장
## Symptoms         ← 관찰 가능한 증상
## What Didn't Work ← 시도했지만 실패한 접근
## Solution         ← 성공한 해결책 + 코드
## Why This Works   ← 근본 원인 설명
## Prevention       ← 재발 방지 실천/테스트/가드레일
## Related Issues
```

### Knowledge Track Template

```markdown
---
title: [Clear title]
date: YYYY-MM-DD
module: [Module]
problem_type: [enum]
component: [enum]
severity: [enum]
applies_when: [array]
tags: [keyword-one, keyword-two]
---

# [Title]
## Context          ← 상황/마찰/갭
## Guidance         ← 실천/패턴/권장 + 코드
## Why This Matters ← 근거와 영향
## When to Apply    ← 적용 조건
## Examples         ← Before/After
## Related
```

### 실제 Solutions 분포

| Category | 파일 수 | 대표 문서 |
|----------|:-------:|----------|
| **skill-design/** | 10 | script-first-skill-architecture, beta-skills-framework, pass-paths-not-content |
| **integrations/** | 4 | agent-browser-chrome-auth, cross-platform-model-normalization |
| **best-practices/** | 2 | codex-delegation-best-practices, conditional-visual-aids |
| **developer-experience/** | 2 | branch-based-plugin-install, local-dev-shell-aliases |
| **workflow/** | 2 | manual-release-github-releases, todo-status-lifecycle |
| **(root level)** | 4 | adding-converter-target-providers, agent-friendly-cli-principles |

### 실제 Solution 분석: Codex Delegation Best Practices

실증적 데이터 기반 학습 문서의 모범 사례:

```
Token Economics (6-iteration evaluation):
┌─────────────┬───────┬──────────┬──────────┬─────────┐
│ Plan size   │ Units │ Delegate │ Standard │ Verdict │
├─────────────┼───────┼──────────┼──────────┼─────────┤
│ Small (bug) │ 1     │ 51k      │ 38k      │ -34%    │
│ Medium      │ 4     │ 54k      │ 53k      │ ≈0%     │
│ Large       │ 7     │ 62k      │ 62k      │ ≈0%     │
│ Extra-large │ 10    │ 54k      │ 62k      │ +13%    │
└─────────────┴───────┴──────────┴──────────┴─────────┘

Crossover: ~5-7 units
Key finding: skill body size is the multiplicative cost driver
  total_token_cost ~ skill_body_lines × tokens_per_line × num_tool_calls

Rule: Move content to reference file if >50 lines AND minority-path
```

### 실제 Solution 분석: Script-First Architecture

```
Token Impact:
┌──────────────────────────────────┬────────┬───────────┐
│ Approach                         │ Tokens │ Reduction │
├──────────────────────────────────┼────────┼───────────┤
│ Model does everything            │ ~100k  │ baseline  │
│ Added "do NOT grep" instruction  │ ~84k   │ 16%       │
│ Script classifies + reference    │ ~38k   │ 62%       │
│ Script classifies + present only │ ~35k   │ 65%       │
└──────────────────────────────────┴────────┴───────────┘

Apply when: >50 items, deterministic rules, frequent execution
```

**핵심**: solutions/의 학습 문서가 구체적 숫자와 조건을 포함 → 다음 plan의 Context에서 인용 가능.

---

## 5. Compounding Loop 상세

### 전체 흐름

```
                     ┌─────────────────────────────────┐
                     │     docs/solutions/ (KB)        │
                     │  skill-design/, integrations/,  │
                     │  best-practices/, workflow/...   │
                     └──────┬───────────────┬──────────┘
                            │               │
                   learnings-researcher     ce:compound-refresh
                   (ce:plan Phase 1.1)     (유지보수)
                            │               │
    ┌───────────┐    ┌──────▼──────┐    ┌───▼───────┐
    │ brainstorm │───▶│    plan     │───▶│   work    │
    │ (WHAT)     │    │ (HOW)      │    │ (DO)      │
    └───────────┘    └────────────┘    └─────┬─────┘
                                              │
                                         문제 해결
                                              │
                                       ┌──────▼──────┐
                                       │  ce:compound │
                                       │ (LEARN)      │
                                       └──────┬──────┘
                                              │
                                              ▼
                                     docs/solutions/
```

### 연결 메커니즘

| 연결 | 메커니즘 | 필드/인자 |
|------|---------|----------|
| brainstorm → plan | YAML frontmatter | `origin: docs/brainstorms/...` |
| plan → work | 스킬 인자 | `ce:work <plan-path>` |
| work → review | 스킬 인자 | `ce:review plan:<path>` |
| review → compound | 트리거 프레이즈 | "that worked", "it's fixed" |
| solutions → plan | learnings-researcher | Phase 1.1 `docs/solutions/` 검색 |
| solutions → review | learnings-researcher | Always-on reviewer |
| solutions → compound-refresh | 수동/자동 호출 | ce:compound Phase 2.5 |

### Discoverability Check

ce:compound와 ce:compound-refresh 모두 실행 후 **Discoverability Check** 수행:

```
AGENTS.md / CLAUDE.md가 docs/solutions/를 에이전트에 노출하는가?
  → 의미적 평가 (문자열 매칭이 아님):
    1. knowledge store 존재를 언급하는가?
    2. 효과적으로 검색할 구조를 제시하는가?
    3. 언제 검색해야 하는지 알려주는가?
  → 미충족 시: 수정 제안 (interactive) 또는 권장사항 보고 (autofix)
```

---

## 6. Compound Refresh: Knowledge 유지보수

### 5가지 유지보수 결과

| Outcome | 의미 | 조건 |
|---------|------|------|
| **Keep** | 여전히 정확 | 코드와 일치 |
| **Update** | 핵심 해결책 맞지만 참조 변경 | 파일명/API 변경 |
| **Consolidate** | 두 문서가 크게 겹침 | 5차원 중 3+ 일치 |
| **Replace** | 오래된 문서가 오해 유발 | 해결책 자체가 변경 |
| **Delete** | 더 이상 유용하지 않음 | 문제 도메인 소멸 |

### Document-Set Analysis (Phase 1.75)

```
Overlap Detection
  → 5차원 비교: problem statement, root cause, solution approach,
    referenced files, prevention rules
  → High overlap (3+) = Consolidate 강한 신호

Supersession Signals
  → "older narrow precursor, newer canonical doc" 패턴

Canonical Doc Identification
  → 가장 최신, 가장 넓은 범위, 가장 정확한 문서

Cross-Doc Conflict Check
  → 모순은 개별 부실보다 긴급
```

### Replace Flow

```
증거 충분?
  ├─ Yes → sub-agent 1개로 새 문서 작성 (schema.yaml + template 사용)
  │         → 기존 문서 삭제
  └─ No  → frontmatter에 stale 표시
           status: stale
           stale_reason: "..."
           stale_date: YYYY-MM-DD
```

**핵심**: Delete ≠ Archive. git history가 archive. `_archived/` 디렉토리 없음.

---

## 7. Superpowers/bkit/Compound 비교

| 측면 | Superpowers | bkit | Compound |
|------|-------------|------|----------|
| **문서화 체계** | 없음 | PDCA docs (01-plan ~ 04-report) | **brainstorms/plans/solutions 3종** |
| **지식 축적** | 없음 | 없음 (audit만) | **docs/solutions/ knowledge base** |
| **문서 간 연결** | 없음 | FSM state | **origin 필드 + R-ID trace + learnings citation** |
| **스키마 정의** | 없음 | 없음 | **schema.yaml (2-track, 13 types, 17 components)** |
| **유지보수** | 없음 | 없음 | **ce:compound-refresh (5 outcomes)** |
| **비소프트웨어** | 없음 | 없음 | **universal-brainstorming/planning** |
| **Deepening** | 없음 | 없음 | **confidence-gap scoring + research dispatch** |

---

## 8. 하네스 설계 시사점

### 채용할 패턴

1. **R-ID Tracing** — 요구사항에 stable ID 부여 → plan에서 체크박스로 추적. 요구사항 누락 방지의 간단하고 효과적인 메커니즘.

2. **Institutional Learnings Citation** — plan 작성 시 기존 solutions/ 자동 검색하여 Context에 주입. "같은 실수 반복 방지"의 핵심.

3. **Two-Track Schema** — bug (진단/해결) vs knowledge (지침/패턴) 구분. 각 트랙에 맞는 필수 필드와 템플릿으로 일관된 품질 보장.

4. **Outstanding Questions 이중 분류** — "Resolve Before Planning" vs "Deferred to Planning". 진정한 blocker와 기술적 질문을 명시적으로 분리.

5. **Discoverability Check** — 지식을 축적하되, 에이전트가 실제로 접근할 수 있는지 검증. AGENTS.md/CLAUDE.md가 knowledge store를 언급하는지 의미적 평가.

6. **Deepening Workflow** — plan 완성 후 confidence-gap 점수 기반으로 targeted research. 전체 재작성 대신 약한 섹션만 강화.

### 주의할 패턴

1. **Rails-Centric Schema** — component enum이 Rails에 특화. 하네스 적용 시 프로젝트 구조에 맞는 component taxonomy 설계 필요.

2. **문서 폭발** — 20 brainstorms + 38 plans + 20 solutions = 78 문서. 시간이 지나면 compound-refresh 부하 증가. solutions 카테고리의 적정 규모 관리 필요.

3. **origin 필드 의존** — brainstorm → plan 연결이 파일 경로에 의존. 파일 이동/이름 변경 시 연결 깨짐. 하지만 git history로 추적 가능하므로 실용적 트레이드오프.

---

**다음 단계**: Step 7 — Testing & Quality (50+ test files, review tiers, confidence calibration) deep dive
