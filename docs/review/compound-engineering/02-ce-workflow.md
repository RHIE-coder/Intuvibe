# Compound Engineering - CE Workflow

> CE 6단계 워크플로우: ideate → brainstorm → plan → work → review → compound deep dive

---

## 1. 워크플로우 전체 흐름

```
ce:ideate (발견)
  → "어떤 아이디어가 탐색할 가치가 있는가?"
  → docs/ideation/

ce:brainstorm (정의)
  → "WHAT을 만들 것인가?"
  → docs/brainstorms/

ce:plan (계획)
  → "HOW 만들 것인가?"
  → docs/plans/

ce:work (실행)
  → 코드 + 테스트
  → Incremental commits

ce:review (검증)
  → 28 persona 병렬 dispatch
  → Confidence-gated findings

ce:compound (학습)
  → "무엇을 배웠는가?"
  → docs/solutions/
```

---

## 2. ce:ideate — 아이디어 발굴

### 목적

"어떤 아이디어가 탐색할 가치가 있는가?"를 답하는 단계.
**brainstorm 전에** 실행. brainstorm은 하나의 아이디어를 깊이 탐색, ideate는 **여러 아이디어를 넓게 발굴**.

### Phases

```
Phase 0: Resume & Scope
  → 기존 ideation 작업 확인
  → 포커스 / 볼륨 해석 ("top 3", "100 ideas")
  → Issue tracker 연동 감지

Phase 1: Codebase Scan (병렬 에이전트)
  ├── repo-research-analyst → 코드베이스 구조/패턴
  ├── learnings-researcher → 기존 solutions 검색
  ├── issue-intelligence-analyst → GitHub issues 분석
  └── slack-researcher → Slack 컨텍스트 (선택)

Phase 2: Divergent Ideation
  → 3-4 병렬 sub-agents, 다른 프레임으로 아이디어 생성
  → ~30 raw ideas → ~20-25 after dedupe

Phase 3: Adversarial Filtering
  → 생성된 아이디어를 비판적으로 평가
  → "Generate many → critique all → explain survivors"

Phase 4: Present & Handoff
  → 생존한 아이디어 순위화
  → docs/ideation/ 에 아티팩트 저장
  → brainstorm으로 핸드오프
```

### 핵심 원칙

- **Ground before ideating**: 실제 코드베이스를 먼저 스캔
- **Generate many → critique all → explain survivors only**: 나이브 랭킹이 아닌 adversarial filtering
- **Volume control**: "top 3" ~ "100 ideas" 유저 지정 가능

---

## 3. ce:brainstorm — 요구사항 탐색

### 목적

"WHAT을 만들 것인가?"를 정의. 구현 디테일이 아닌 **제품 결정**에 집중.

### Phases

```
Phase 0: Resume / Assess / Route
  → 기존 작업 재개 여부 확인
  → Task domain 분류 (software vs non-software)
  → Brainstorm 필요 여부 판단
  → Scope 평가 (trivial → large)

Phase 1: Understand the Idea
  → Context scanning (코드베이스, 기존 docs)
  → Product pressure testing
  → Collaborative dialogue (한 번에 하나의 질문)

Phase 2: Explore Approaches
  → 2-3가지 접근법 + pros/cons + 추천
  → "What-if" 탐색

Phase 3: Capture Requirements
  → docs/brainstorms/ 에 요구사항 문서 작성
  → Completeness check

Phase 4: Document Review → Handoff
  → document-review 스킬로 리뷰 (7 personas)
  → 다음 단계 옵션 제시 (plan, more brainstorm, skip)
```

### 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **Scope-first assessment** | 먼저 크기를 평가하고, ceremony를 맞춤 |
| **Product decisions, not implementation** | 유저 행동, 범위, 성공 기준에 집중 |
| **YAGNI on carrying cost** | 코딩 노력이 아닌 유지보수 비용에 YAGNI 적용 |
| **One question at a time** | 다중 질문 금지, single-select 선호 |
| **Right-size artifacts** | 작업 복잡도에 맞는 문서 크기 |

### Reference Files

| File | 역할 |
|------|------|
| `handoff.md` | Phase 4 옵션 + closing summary 형식 |
| `requirements-capture.md` | 문서 템플릿, 구조 규칙, 완성도 체크 |
| `universal-brainstorming.md` | 비소프트웨어 브레인스토밍 원칙 |
| `visual-communication.md` | 요구사항 문서 다이어그램 가이드 |

---

## 4. ce:plan — 구현 계획

### 목적

"HOW 만들 것인가?"를 상세화. brainstorm의 WHAT을 실행 가능한 계획으로 변환.

### Phases

```
Phase 0: Input Triage
  → 입력이 plan 문서인지, bare prompt인지 판별
  → 기존 plan deepen vs 새 plan 생성

Phase 1: Read Plan / Clarify
  → Environment setup
  → Todo list 생성
  → 실행 전략 선택

Phase 2: Plan Writing
  → Scope assessment
  → Targeted research (confidence gap scoring)
  → 구조화된 계획 작성

Phase 3: Confidence Check
  → 계획의 confidence gaps 식별
  → Research agents 병렬 dispatch로 보강

Phase 4: Post-Generation
  → Document review (7 personas)
  → Handoff options (work, brainstorm, deepen)
```

### Confidence Gap Scoring (Deepening)

```
계획 작성 후
  → 각 섹션의 confidence gap 식별
  → targeted research dispatch:
    ├── best-practices-researcher → 외부 모범 사례
    ├── framework-docs-researcher → 프레임워크 문서
    ├── learnings-researcher → 기존 solutions
    └── repo-research-analyst → 코드베이스 패턴
  → 연구 결과로 계획 보강
```

### Reference Files

| File | 역할 |
|------|------|
| `deepening-workflow.md` | Confidence gap scoring + research dispatch |
| `plan-handoff.md` | Document review, post-generation 옵션, issue 생성 |
| `universal-planning.md` | 비소프트웨어 도메인 계획 원칙 |
| `visual-communication.md` | 의존성 그래프, 상호작용 다이어그램 |

---

## 5. ce:work — 실행

### 목적

계획을 효율적으로 실행하면서 품질 유지하고 기능 완성.

### Phases

```
Phase 0: Input Triage
  → Complexity 분류: trivial / small / medium / large
  → trivial: 바로 실행 (계획 불필요)
  → large: 계획 필수, 없으면 ce:plan으로 리다이렉트

Phase 1: Quick Start
  → Plan 읽기
  → Environment setup (의존성, 브랜치)
  → Todo list 생성 (없으면)

Phase 2: Execute
  → Task loop:
    1. 태스크 시작 표시
    2. Reference 읽기
    3. 구현
    4. 테스트
    5. Coverage 평가
    6. 태스크 완료 표시
  → Test discovery (기존 테스트 먼저 파악)
  → System-wide test checks
  → Incremental commits (논리적 단위마다)
  → 기존 패턴 따르기

Phase 3: Quality Check
  → 테스트 실행
  → Code review: Tier 2 (기본) or Tier 1
  → Final validation
  → Operational validation plan 준비

Phase 4: Ship It
  → UI 작업이면 스크린샷 캡처
  → git-commit-push-pr 스킬로 커밋/PR
  → Plan status 갱신
  → 유저에게 알림
```

### Review Tier 선택 기준

| Tier | 조건 | 방법 |
|:----:|------|------|
| **Tier 2** (기본) | 대부분의 변경 | `ce:review mode:autofix plan:<path>` |
| **Tier 1** | 4 조건 **모두** 충족 시만 | Inline self-review |

**Tier 1 허용 조건** (모두 충족해야):
1. Purely additive (기존 코드 수정 없음)
2. Single concern (하나의 관심사)
3. Pattern-following (기존 패턴 따름)
4. Plan-faithful (계획에 충실)

### 핵심 원칙

| 원칙 | 설명 |
|------|------|
| **Start fast, execute faster** | 빠르게 시작, 더 빠르게 실행 |
| **The plan is your guide** | 계획이 가이드 |
| **Test as you go** | 구현과 테스트 동시 |
| **Quality is built in** | 리뷰가 내장 |
| **Ship complete features** | 완성된 기능만 출시 |

---

## 6. ce:review — 구조화된 코드 리뷰

### 목적

PR 전에 구조화된 코드 리뷰. **28 persona agents** 병렬 dispatch + confidence-gated findings.

### Modes

| Mode | 설명 |
|------|------|
| `mode:autofix` | 발견 사항 자동 수정 |
| `mode:report-only` | 리포트만 (수정 안 함) |
| `mode:interactive` | 유저와 대화형 리뷰 |
| `mode:headless` | 프로그래매틱 호출용 |

### Execution Flow

```
1. Diff Scope Detection
   → base ref 결정 (default branch or specified)
   → 변경 파일/라인 식별

2. Persona Selection
   → Diff 특성 분석 (크기, 도메인, 위험도)
   → Always-on: 4 personas
   → Conditional: 8 personas (조건 충족 시)
   → Stack-specific: 5 personas (기술 스택에 따라)

3. Parallel Dispatch
   → 선택된 personas를 sub-agent로 병렬 실행
   → 각 persona가 structured JSON findings 반환

4. Merge & Dedup Pipeline
   → 중복 발견 병합
   → Finding classification:
     - Primary: 이번 diff에서 발생
     - Secondary: 관련 컨텍스트
     - Pre-existing: 기존 코드의 문제

5. Confidence Gating
   → >= 0.80: 반드시 보고
   → 0.60-0.79: 보고 (context 포함)
   → < 0.60: 억제

6. Output
   → Severity-grouped findings (pipe-delimited tables)
   → Autofix mode: 즉시 수정 적용
   → Report-only: 리포트만 출력
```

### Persona Catalog (17)

**Always-on (4)**:

| Persona | 역할 |
|---------|------|
| correctness-reviewer | 로직 에러, 엣지 케이스, 상태 버그 |
| testing-reviewer | 테스트 커버리지 갭, 약한 assertion |
| maintainability-reviewer | 커플링, 복잡도, 네이밍, 죽은 코드 |
| project-standards-reviewer | CLAUDE.md / AGENTS.md 준수 |

**Conditional (8)**:

| Persona | 조건 |
|---------|------|
| security-reviewer | auth, payments, user data 변경 |
| performance-reviewer | hot paths, DB queries, N+1 |
| api-contract-reviewer | API 변경 |
| reliability-reviewer | infra, deployment 변경 |
| adversarial-reviewer | diff >= 50줄 OR high-risk domain |
| data-integrity-guardian | DB migration |
| code-simplicity-reviewer | Final pass |
| previous-comments-reviewer | 이전 PR comment 확인 |

**Stack-specific (5)**:

| Persona | 조건 |
|---------|------|
| dhh-rails-reviewer | Rails 코드 |
| kieran-rails-reviewer | Rails 코드 |
| kieran-python-reviewer | Python 코드 |
| kieran-typescript-reviewer | TypeScript 코드 |
| julik-frontend-races-reviewer | JS/Stimulus race conditions |

### Finding Schema (JSON)

```json
{
  "file": "src/auth.ts",
  "line": 42,
  "severity": "high",
  "category": "security",
  "persona": "security-reviewer",
  "confidence": 0.85,
  "finding": "Missing rate limit on login endpoint",
  "suggestion": "Add rate limiter middleware",
  "classification": "primary"
}
```

### Reference Files

| File | 역할 |
|------|------|
| `persona-catalog.md` | 17 personas 상세 정의 |
| `diff-scope.md` | Finding classification tiers |
| `review-output-template.md` | 출력 포맷 규칙 |
| `findings-schema.json` | JSON output 스키마 |
| `subagent-template.md` | Sub-agent dispatch 템플릿 |
| `resolve-base.sh` | Review base 감지 유틸리티 |

---

## 7. ce:compound — 지식 축적

### 목적

**문제 해결 직후** 경험을 문서화하여 팀 지식으로 축적.

"First occurrence takes research. Next occurrences take minutes."

### Execution

```
1. 유저에게 2가지 옵션 제시:
   ├── Full (추천): 연구 + 교차참조 + 리뷰
   └── Lightweight: 단일 패스, 빠름

2. Full workflow:
   → 병렬 sub-agents로 컨텍스트 수집
   → 교차참조 (기존 solutions, 코드, issues)
   → 구조화된 문서 작성
   → 리뷰

3. docs/solutions/{category}/ 에 저장
```

### Solution Document Schema

```yaml
---
title: "Rate limiting bypass in login flow"
date: 2026-04-09
problem_type: security_vulnerability     # 13 enums
component: authentication                # 17 enums
severity: high                          # low/medium/high/critical
resolution_type: code_fix               # required
applies_when: "Login endpoint without rate limit"  # knowledge track
symptoms: "Failed login attempts not throttled"
root_cause: "Missing middleware"         # required
---
```

**2 Tracks**:
- **Bug track**: symptoms + root_cause + resolution_type (required)
- **Knowledge track**: applies_when + symptoms(optional) + root_cause + resolution_type

### ce:compound-refresh — 지식 유지보수

```
기존 solutions 검토
  → 5가지 결과: Keep / Update / Consolidate / Replace / Delete
  → 코드베이스와의 drift 감지
  → Stale 문서 정리
```

**핵심 규칙**: "Match docs to reality, not the reverse."

---

## 8. 보조 워크플로우

### lfg — Full Autonomous

```
/lfg = plan → work → review → resolve-todos → test-browser → feature-video
```

모든 단계 **순서 강제**. Plan 완료 전 work 시작 금지.

### ce:work-beta — Codex Delegation

표준 ce:work + `delegate:codex` 토큰 지원.
Token-conserving code implementation을 위해 Codex에 위임.

### git-commit-push-pr — Adaptive PR

PR 설명을 변경 복잡도에 맞춰 **자동 조절**:

| Change Profile | Description |
|:---------------|:------------|
| Small + simple | 1-2 문장, < 300자 |
| Small + non-trivial | "Problem/Fix" 3-5 문장 |
| Medium feature | Summary + "what changed and why" |
| Large / architectural | 전체 narrative: problem, approach, decisions, rollback |
| Performance | Before/after measurements (markdown table) |

---

## 9. Skill Design Patterns (docs/solutions/skill-design/)

### Beta Skills Framework

```
skills/
├── ce-plan/SKILL.md          # Stable
└── ce-plan-beta/SKILL.md     # Beta (disable-model-invocation: true)
```

- `-beta` suffix로 병렬 운영
- `disable-model-invocation: true`로 자동 트리거 방지
- 안정판과 나란히 비교 가능
- Promotion = orchestration contract change (호출자도 함께 업데이트)

### Script-First Architecture

```
Model이 데이터를 처리하는 것은 token-expensive anti-pattern.
→ Node.js script에 기계적 작업 위임 (parsing, classification)
→ Model은 결과 표시만
→ Token 65% 절감 (100K → 35K)
```

**적용 조건**: 50+ items 처리 OR 파일 > few KB, 규칙이 deterministic, 스킬 빈번 실행.

### Beta Promotion Contract

```
Beta → Stable promotion 시:
  → 스킬 파일 교체 + 모든 호출자 업데이트 (같은 PR)
  → 호출 시 mode flag 명시적 하드코딩
  → Contract test 추가
```

"Silent inheritance of wrong defaults" 방지.

---

## 10. Superpowers / bkit 대비

| 측면 | Superpowers | bkit | Compound |
|------|-------------|------|----------|
| **워크플로우 단계** | 7 (brainstorm→plan→worktree→SDD→TDD→review→finish) | 7 (PM→Plan→Design→Do→Check→Act→Report) | **6** (ideate→brainstorm→plan→work→review→compound) |
| **지식 축적** | X | X (audit만) | **O** (docs/solutions/ + compound-refresh) |
| **Scope matching** | X (모두 동일) | 3단계 (Starter/Dynamic/Enterprise) | **4단계** (trivial/small/medium/large) |
| **리뷰** | 2-Stage (Spec→Quality) | Council 합의 | **28 personas** 병렬 + confidence |
| **문서 리뷰** | X | design-validator (1 agent) | **7 personas** (adversarial, coherence, feasibility...) |
| **Plan deepen** | X | X | **O** (confidence gap → research dispatch) |
| **Beta skills** | X | X | **O** (parallel -beta + promotion) |
| **Handoff** | 스킬 간 강제 순서 | State machine 전이 | **옵션 제시** (유저 선택) |

### 핵심 차이: 강제 vs 선택

- **Superpowers**: "Skip 불가. 모든 단계 강제."
- **bkit**: "Quality gate 통과 필수. 자동화 레벨에 따라."
- **Compound**: **"Scope에 맞춰 ceremony 선택. Trivial이면 skip."**

---

## 11. 하네스 설계 시사점

### 11.1 Knowledge Compounding

ce:compound의 "해결한 문제를 문서화" 패턴은 Superpowers/bkit에 없는 독창적 기능.
팀 지식이 축적되면 동일 문제 재발 시 해결 시간이 극적으로 줄어듦.

**하네스 적용**: docs/solutions/ 패턴 도입. 스킬로 문서화 자동화.

### 11.2 Confidence Gap → Research Dispatch

Plan 작성 후 confidence gap을 식별하고 연구 에이전트를 dispatch하여 보강하는 패턴.
"모르는 것을 아는 것" → "모르는 것을 채우는 것"까지 자동화.

### 11.3 Right-Size Ceremony

작업 크기에 따라 프로세스를 조절하는 것은 Superpowers의 "모두 강제"보다 실용적.
하지만 "trivial이라 skip"의 판단을 LLM에 맡기면 합리화 위험.

**하네스 적용**: Trivial 판단 기준을 명확히 정의 (e.g., 단일 파일, < 20줄, 기존 패턴).

### 11.4 Beta Skills Framework

안정판과 베타를 병렬 운영하여 비교하는 패턴은 스킬 개선에 유용.
Promotion 시 orchestration contract까지 함께 업데이트하는 규칙도 중요.

### 11.5 Script-First for Token Efficiency

기계적 작업을 Node.js script에 위임하여 65% token 절감.
Superpowers의 token efficiency 고민과 bkit의 607 함수 사이의 절충점.

---

**다음 단계**: Step 3 — Agent System (60+ agents, 6 categories, conditional selection, confidence) deep dive
