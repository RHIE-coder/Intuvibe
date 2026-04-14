# Superpowers - Subagent Architecture & Role Separation

> Step 4: `dispatching-parallel-agents`, `agents/code-reviewer.md`, `requesting-code-review` 분석

---

## 1. 에이전트 유형 구분

Superpowers는 두 가지 에이전트 개념을 구분한다:

### Skills vs Agents

| 구분 | Skills (`skills/`) | Agents (`agents/`) |
|------|-------------------|-------------------|
| **정의 위치** | `skills/<name>/SKILL.md` | `agents/<name>.md` |
| **역할** | 워크플로우/프로세스 가이드 | 서브에이전트의 **시스템 프롬프트/페르소나** |
| **트리거** | 자동 (1% 규칙) | 다른 스킬이 디스패치 시 사용 |
| **소비자** | 메인 에이전트가 직접 따름 | 서브에이전트에게 주입 |
| **예시** | `test-driven-development`, `writing-plans` | `code-reviewer` |

### 에이전트 정의 형태

**Named Agent** (`agents/code-reviewer.md`):
- frontmatter에 `name`, `description`, `model` 정의
- 재사용 가능한 페르소나
- `Task tool (superpowers:code-reviewer)` 로 디스패치

**Inline Prompt** (스킬 내 프롬프트 템플릿):
- `implementer-prompt.md`, `spec-reviewer-prompt.md` 등
- 스킬에 종속된 일회성 프롬프트
- `Task tool (general-purpose)` + 프롬프트 주입으로 디스패치

---

## 2. code-reviewer Agent 분석

### Frontmatter

```yaml
---
name: code-reviewer
description: |
  Use this agent when a major project step has been completed
  and needs to be reviewed against the original plan and coding standards.
model: inherit
---
```

`model: inherit` — 호출한 에이전트의 모델을 상속.

### 역할 정의 (6가지 책임)

| # | 책임 | 핵심 |
|---|------|------|
| 1 | **Plan Alignment** | 계획 대비 편차 식별, 정당한 개선 vs 문제적 이탈 판단 |
| 2 | **Code Quality** | 에러 핸들링, 타입 안전성, 네이밍, 유지보수성 |
| 3 | **Architecture & Design** | SOLID, 관심사 분리, 확장성 |
| 4 | **Documentation** | 주석, 함수 문서, 코딩 표준 준수 |
| 5 | **Issue Identification** | Critical / Important / Minor 분류 + 액션 가능한 권고 |
| 6 | **Communication Protocol** | 계획 편차 발견 시 확인 요청, 계획 자체 문제 시 업데이트 권고 |

### 리뷰 템플릿 (`requesting-code-review/code-reviewer.md`)

**입력 변수:**
- `{WHAT_WAS_IMPLEMENTED}` — 구현 내용
- `{PLAN_OR_REQUIREMENTS}` — 원래 요구사항
- `{BASE_SHA}` / `{HEAD_SHA}` — git diff 범위
- `{DESCRIPTION}` — 요약

**리뷰 체크리스트:**
- Code Quality: 관심사 분리, 에러 핸들링, DRY, 엣지 케이스
- Architecture: 설계 결정, 확장성, 성능, 보안
- Testing: 실제 로직 테스트 (mock 아닌), 엣지 케이스, 통합 테스트
- Requirements: 모든 요구사항 충족, scope creep 없음
- Production Readiness: 마이그레이션, 하위 호환성, 문서

**출력 포맷:**
```
### Strengths
[구체적으로 잘된 점]

### Issues
#### Critical (Must Fix) — 버그, 보안, 데이터 손실, 기능 고장
#### Important (Should Fix) — 아키텍처, 누락 기능, 테스트 갭
#### Minor (Nice to Have) — 스타일, 최적화, 문서 개선

각 이슈: File:line + 문제 + 이유 + 수정 방법

### Recommendations
### Assessment
**Ready to merge?** [Yes/No/With fixes]
**Reasoning:** [1-2 문장]
```

---

## 3. dispatching-parallel-agents 분석

### 개요

2개 이상의 **독립적인** 태스크를 **병렬로** 서브에이전트에 디스패치하는 패턴.

> "Dispatch one agent per independent problem domain. Let them work concurrently."

### 사용 조건

```
여러 실패/태스크가 있는가?
  → 독립적인가?
    → YES: 병렬 작업 가능한가?
      → YES: Parallel dispatch
      → NO (공유 상태): Sequential agents
    → NO (관련됨): Single agent가 전체 조사
```

### 패턴 (4단계)

**1. Independent Domains 식별**
- 문제별 그룹핑 (파일, 서브시스템, 버그 유형)
- 핵심: 하나를 고치는 것이 다른 것에 영향을 주지 않는가?

**2. Focused Agent Tasks 생성**

각 에이전트에게 제공:
- **Specific scope**: 하나의 테스트 파일 또는 서브시스템
- **Clear goal**: 이 테스트들을 통과시켜라
- **Constraints**: 다른 코드를 변경하지 마라
- **Expected output**: 발견 내용과 수정 내용 요약

**3. Parallel Dispatch**
```typescript
Task("Fix agent-tool-abort.test.ts failures")
Task("Fix batch-completion-behavior.test.ts failures")
Task("Fix tool-approval-race-conditions.test.ts failures")
// 세 개가 동시에 실행
```

**4. Review & Integrate**
- 각 요약 읽기
- 충돌 확인 (같은 코드를 수정했는가?)
- 전체 테스트 스위트 실행
- 통합

### 좋은 프롬프트 vs 나쁜 프롬프트

| 측면 | Bad | Good |
|------|-----|------|
| **범위** | "Fix all the tests" | "Fix agent-tool-abort.test.ts" |
| **컨텍스트** | "Fix the race condition" | 에러 메시지 + 테스트 이름 붙여넣기 |
| **제약** | (없음) → 에이전트가 모든 것 리팩토링 | "Do NOT change production code" |
| **출력** | "Fix it" | "Return summary of root cause and changes" |

### 사용하지 말아야 할 때

- 실패들이 관련됨 (하나 고치면 다른 것도 고쳐질 수 있음)
- 전체 시스템 상태 이해가 필요
- 탐색적 디버깅 (아직 무엇이 고장났는지 모름)
- 공유 상태 (같은 파일 편집, 같은 리소스 사용)

---

## 4. requesting-code-review 분석

### 리뷰 타이밍

**필수:**
- subagent-driven-development의 각 태스크 후
- 주요 기능 완료 후
- main 머지 전

**선택 (권장):**
- 막혔을 때 (새로운 시각)
- 리팩토링 전 (베이스라인 확인)
- 복잡한 버그 수정 후

### 리뷰 흐름

```
1. git SHA 확보 (BASE, HEAD)
2. superpowers:code-reviewer 서브에이전트 디스패치 (템플릿 채워서)
3. 피드백 처리:
   - Critical: 즉시 수정
   - Important: 진행 전 수정
   - Minor: 나중에 기록
   - 리뷰어가 틀렸으면: 기술적 근거로 반박
```

### 워크플로우별 통합

| 워크플로우 | 리뷰 시점 |
|------------|-----------|
| Subagent-Driven Development | 매 태스크 후 (이슈 복합 방지) |
| Executing Plans | 3 태스크 배치 후 |
| Ad-Hoc Development | 머지 전, 막혔을 때 |

---

## 5. 서브에이전트 전체 아키텍처 정리

### 역할 맵

```
Controller (메인 에이전트)
  │
  ├─ Implementer (general-purpose + inline prompt)
  │    - 태스크 구현, TDD, 커밋, 셀프리뷰
  │    - 상태: DONE / DONE_WITH_CONCERNS / NEEDS_CONTEXT / BLOCKED
  │
  ├─ Spec Reviewer (general-purpose + inline prompt)
  │    - 구현이 스펙과 일치하는지 검증
  │    - "불신 기반" — Implementer 보고를 신뢰하지 않음
  │    - 결과: ✅ Spec compliant / ❌ Issues
  │
  ├─ Code Quality Reviewer (superpowers:code-reviewer agent)
  │    - 코드 품질, 아키텍처, 테스트 검증
  │    - Critical / Important / Minor 분류
  │    - 결과: Ready to merge? Yes / No / With fixes
  │
  └─ Parallel Investigation Agents (general-purpose + inline prompt)
       - 독립적 문제 도메인별 1개
       - 동시 실행, 결과 통합
```

### 프롬프트 전달 패턴

| 패턴 | 사용처 | 장점 |
|------|--------|------|
| **Inline prompt** (태스크 텍스트 직접 주입) | Implementer, Spec Reviewer | 컨텍스트 정밀 제어 |
| **Named agent** (agent .md 참조) | Code Quality Reviewer | 재사용성, 일관된 페르소나 |
| **Template + placeholders** | code-reviewer.md | 표준화된 입력 구조 |

### 컨텍스트 격리 원칙

```
"They should never inherit your session's context or history —
 you construct exactly what they need."
```

1. **Controller가 컨텍스트를 큐레이션** — 서브에이전트에게 파일을 읽게 하지 않음
2. **세션 히스토리 상속 없음** — fresh 서브에이전트
3. **Controller의 컨텍스트 보존** — 서브에이전트가 coordination 영역을 오염시키지 않음

### 리뷰 루프 프로토콜

```
Implementer 완료
  → Spec Reviewer 디스패치
    → 이슈 발견?
      → YES: Implementer 수정 → Spec Reviewer 재리뷰 (루프)
      → NO: ✅
  → Code Quality Reviewer 디스패치 (spec 통과 후에만!)
    → 이슈 발견?
      → YES: Implementer 수정 → Code Quality Reviewer 재리뷰 (루프)
      → NO: ✅
  → 태스크 완료
```

**순서 강제**: Spec compliance → Code quality. 역전 불가.

---

## 6. 하네스 설계 시사점

| 관찰 | 시사점 |
|------|--------|
| **Skills vs Agents 구분** | 워크플로우 가이드(Skills)와 서브에이전트 페르소나(Agents)를 분리 |
| **Named Agent + model: inherit** | 에이전트 정의에서 모델 결정을 호출자에게 위임 가능 |
| **Template + placeholder 패턴** | 리뷰 프롬프트의 표준화 — 일관된 입력으로 일관된 출력 |
| **불신 기반 리뷰** | Implementer 보고를 신뢰하지 않는 설계 → 독립 검증의 품질 보장 |
| **3-severity 분류** | Critical(must fix) / Important(should fix) / Minor(nice to have) — 액션 우선순위 명확 |
| **병렬 디스패치 조건** | 독립성 확인 → 공유 상태/관련 실패는 병렬화 금지 |
| **프롬프트 구조 원칙** | Focused + Self-contained + Specific output — 모호한 프롬프트 = 모호한 결과 |
| **컨텍스트 격리** | 서브에이전트는 세션 히스토리를 상속하지 않음 — Controller가 구성 |
| **리뷰 루프** | 승인까지 반복 — "close enough"는 수용하지 않음 |
| **Constraints 명시** | "Do NOT change X" — 서브에이전트의 범위 초과를 방지 |

---

**다음 단계**: Step 5 — `hooks/`, `commands/`, `.claude-plugin/` → 훅/커맨드/플러그인 매니페스트 연동 방식
