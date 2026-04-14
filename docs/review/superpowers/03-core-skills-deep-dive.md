# Superpowers - Core Skills Deep Dive

> Step 3: `subagent-driven-development`, `writing-plans`, `test-driven-development` 분석

---

## 1. subagent-driven-development

### 개요

계획의 각 태스크를 **fresh 서브에이전트에 디스패치**하고, 태스크마다 **2단계 리뷰**(spec compliance → code quality)를 수행하는 실행 스킬.

> "Fresh subagent per task + two-stage review (spec then quality) = high quality, fast iteration"

### 사용 조건 (Decision Tree)

```
구현 계획이 있는가?
  → YES: 태스크들이 대부분 독립적인가?
    → YES: 현재 세션에서 실행?
      → YES: subagent-driven-development
      → NO (병렬 세션): executing-plans
    → NO (강하게 결합됨): 수동 실행 또는 brainstorm 먼저
  → NO: brainstorm 먼저
```

### 프로세스 흐름

```
[계획 읽기 → 모든 태스크 추출 → TodoWrite 생성]
  ↓
[Per Task Loop]
  ↓
  1. Implementer 서브에이전트 디스패치 (implementer-prompt.md)
     → 질문 있으면? → 답변 제공 → 재디스패치
     → 질문 없으면? → 구현 + 테스트 + 커밋 + 셀프리뷰
  ↓
  2. Spec Reviewer 서브에이전트 디스패치 (spec-reviewer-prompt.md)
     → 통과? → 3단계로
     → 미통과? → Implementer가 수정 → 재리뷰 (루프)
  ↓
  3. Code Quality Reviewer 서브에이전트 디스패치 (code-quality-reviewer-prompt.md)
     → 통과? → 태스크 완료
     → 미통과? → Implementer가 수정 → 재리뷰 (루프)
  ↓
[모든 태스크 완료]
  ↓
  4. Final Code Reviewer (전체 구현 대상)
  ↓
  5. finishing-a-development-branch 스킬로 이관
```

### 3종 서브에이전트 프롬프트 분석

#### Implementer (`implementer-prompt.md`)

**역할**: 태스크 구현, 테스트 작성, 커밋, 셀프리뷰

**핵심 설계 원칙:**
- **전체 태스크 텍스트를 프롬프트에 직접 포함** — 서브에이전트가 파일을 읽게 하지 않음
- **Scene-setting context 제공** — 태스크가 전체에서 어디에 위치하는지
- **질문 먼저** — 구현 전에 불명확한 점을 질문할 수 있도록 명시적 허용
- **작업 중에도 질문 가능** — "Don't guess or make assumptions"

**상태 보고 (4가지):**

| Status | 의미 | Controller 대응 |
|--------|------|-----------------|
| `DONE` | 정상 완료 | spec review 진행 |
| `DONE_WITH_CONCERNS` | 완료했으나 의심 있음 | 우려사항 먼저 읽고 판단 |
| `NEEDS_CONTEXT` | 정보 부족 | 컨텍스트 제공 후 재디스패치 |
| `BLOCKED` | 진행 불가 | 컨텍스트 문제 → 재디스패치 / 추론 문제 → 더 강한 모델 / 태스크 크기 → 분할 / 계획 오류 → 인간에게 에스컬레이션 |

**에스컬레이션 유도:**
```
"Bad work is worse than no work. You will not be penalized for escalating."
```
- 아키텍처 결정이 필요할 때
- 제공된 코드 넘어 이해가 필요할 때
- 접근법이 맞는지 불확실할 때
- 진전 없이 파일을 계속 읽고 있을 때

**셀프리뷰 체크리스트** (보고 전 자가 수행):
- Completeness: 모든 요구사항 구현?
- Quality: 이름 명확? 유지보수 가능?
- Discipline: YAGNI 준수? 요청된 것만 빌드?
- Testing: 진짜 동작 테스트? (mock 동작 아닌)

#### Spec Reviewer (`spec-reviewer-prompt.md`)

**역할**: 구현이 스펙과 일치하는지 검증 (과부족 확인)

**핵심 설계 — 불신 기반 리뷰:**
```
"The implementer finished suspiciously quickly. Their report may be incomplete,
inaccurate, or optimistic. You MUST verify everything independently."
```

**DO NOT:**
- Implementer의 말을 신뢰
- 완성도 주장을 수용
- 요구사항 해석을 수용

**DO:**
- 실제 코드를 읽고 검증
- 요구사항과 라인별 비교
- 빠진 부분 찾기
- 추가된 불필요한 기능 찾기

**검증 항목:**
1. **Missing requirements** — 빠진 구현
2. **Extra/unneeded work** — 요청 안 한 기능 (over-engineering)
3. **Misunderstandings** — 잘못된 해석

#### Code Quality Reviewer (`code-quality-reviewer-prompt.md`)

**역할**: 구현 품질 검증 (깨끗하고, 테스트되고, 유지보수 가능한지)

**전제**: Spec compliance review 통과 후에만 실행

**추가 검증 항목:**
- 파일별 단일 책임 원칙
- 독립적으로 이해/테스트 가능한 단위 분해
- 계획의 파일 구조 준수
- 새로 만든 파일이 이미 큰지 (기존 파일 크기는 무시)

**결과 포맷**: Strengths, Issues (Critical/Important/Minor), Assessment

### 모델 선택 전략

| 태스크 유형 | 시그널 | 모델 |
|-------------|--------|------|
| Mechanical implementation | 1-2 파일, 명확한 스펙 | cheap/fast 모델 |
| Integration/judgment | 다중 파일, 통합 관심사 | standard 모델 |
| Architecture/design/review | 설계 판단, 넓은 코드베이스 이해 | 최고 성능 모델 |

### Red Flags

- main/master에서 직접 구현 시작 금지
- spec review 또는 code quality review 생략 금지
- **spec compliance 전에 code quality review 시작 금지** (순서 중요)
- 병렬 implementation 서브에이전트 디스패치 금지 (충돌)
- 서브에이전트에게 plan 파일을 읽게 하지 말 것 (전체 텍스트 제공)
- 서브에이전트 질문 무시 금지

---

## 2. writing-plans

### 개요

구현 계획을 **"context도 taste도 없는 열정적인 주니어 엔지니어"가 따를 수 있을 만큼 상세하게** 작성하는 스킬.

> "Assume they are a skilled developer, but know almost nothing about our toolset or problem domain."

### 계획 저장 위치
```
docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md
```

### 계획 문서 헤더 (필수)

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** [한 문장]
**Architecture:** [2-3 문장]
**Tech Stack:** [핵심 기술/라이브러리]
```

### Scope Check
- 스펙이 여러 독립 서브시스템을 다루면 → 서브시스템별 별도 계획으로 분리
- 각 계획은 독립적으로 동작하고 테스트 가능해야 함

### File Structure 먼저
- 태스크 정의 전에 **파일 맵** 작성 (생성/수정될 파일, 각 파일의 책임)
- 단위를 명확한 경계와 인터페이스로 설계
- 작고 집중된 파일 선호 (함께 변경되는 것은 함께 배치)

### 태스크 단위: 2-5분

```
"Write the failing test" — step
"Run it to make sure it fails" — step
"Implement the minimal code" — step
"Run the tests and make sure they pass" — step
"Commit" — step
```

### 태스크 구조 (템플릿)

```markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

- [ ] **Step 1: Write the failing test**
[실제 코드 블록]

- [ ] **Step 2: Run test to verify it fails**
Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

- [ ] **Step 3: Write minimal implementation**
[실제 코드 블록]

- [ ] **Step 4: Run test to verify it passes**
Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

- [ ] **Step 5: Commit**
```

### 절대 금지: Placeholder

다음은 **계획 실패**:
- "TBD", "TODO", "implement later"
- "Add appropriate error handling"
- "Write tests for the above" (실제 테스트 코드 없이)
- "Similar to Task N" (코드를 복붙해야 함 — 엔지니어가 순서대로 읽지 않을 수 있음)
- 코드 변경인데 코드 블록이 없는 스텝
- 어떤 태스크에서도 정의되지 않은 타입/함수/메서드 참조

### Self-Review (계획 완성 후)

1. **Spec coverage**: 스펙의 각 요구사항 → 해당 태스크 매핑 가능?
2. **Placeholder scan**: "No Placeholders" 패턴 검색
3. **Type consistency**: 후반 태스크의 타입/메서드명이 초반 정의와 일치?

### 실행 Handoff

계획 저장 후 2가지 옵션 제안:
1. **Subagent-Driven (추천)** → `subagent-driven-development` 스킬
2. **Inline Execution** → `executing-plans` 스킬 (배치 실행 + 체크포인트)

---

## 3. test-driven-development

### 개요

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

> "If you didn't watch the test fail, you don't know if it tests the right thing."

### Iron Law

테스트 전에 코드를 작성했다면 → **삭제. 처음부터.**
- "참고용"으로 보관 금지
- 테스트 중 "적응" 금지
- 보지도 말 것
- **삭제는 삭제**

### RED-GREEN-REFACTOR 사이클

```
RED: 실패하는 테스트 작성 (하나의 동작)
  → Verify RED: 실행 → 실패 확인 (에러가 아닌 실패) [필수]
    → 테스트가 통과? → 기존 동작을 테스트 중. 테스트 수정.
    → 테스트가 에러? → 에러 수정 후 재실행.

GREEN: 테스트를 통과시키는 최소한의 코드
  → Verify GREEN: 실행 → 통과 확인 + 다른 테스트도 통과 [필수]
    → 실패? → 코드 수정 (테스트 수정 아님)
    → 다른 테스트 실패? → 지금 수정

REFACTOR: 중복 제거, 이름 개선, 헬퍼 추출
  → 테스트가 계속 green인지 확인
  → 동작을 추가하지 말 것
```

### Good Test 기준

| 품질 | Good | Bad |
|------|------|-----|
| Minimal | 하나의 것만 테스트. 이름에 "and" → 분리 | `test('validates email and domain and whitespace')` |
| Clear | 이름이 동작을 설명 | `test('test1')` |
| Shows intent | 원하는 API를 보여줌 | 코드가 뭘 해야 하는지 불명확 |
| Real code | 실제 코드 테스트 | mock 동작 테스트 |

### 합리화 방어 — 핵심 논증

**"테스트를 나중에 쓰면 같은 효과"**
- Tests-after = "이 코드가 뭘 하는가?" (구현에 편향)
- Tests-first = "이 코드가 뭘 해야 하는가?" (요구사항에서 출발)
- 30분 후 테스트 ≠ TDD. Coverage는 얻지만 proof는 잃음.

**"X시간 작업 삭제는 낭비"**
- Sunk cost fallacy. 시간은 이미 지남.
- 신뢰할 수 없는 코드 유지 = 기술 부채.

**"TDD는 독단적, 실용적으로 적응해야"**
- TDD IS 실용적: 커밋 전 버그 발견, 회귀 방지, 동작 문서화, 리팩토링 가능.
- "실용적" 숏컷 = 프로덕션 디버깅 = 더 느림.

### Red Flags (즉시 중지 & 처음부터)

- 테스트 전 코드
- 구현 후 테스트
- 테스트가 즉시 통과
- 테스트 실패 이유 설명 불가
- "나중에" 추가하는 테스트
- "이번만" 합리화
- "이미 수동 테스트 함"
- "정신이지 의식이 아니다"
- "참고용으로 보관"
- "삭제는 낭비"
- "TDD는 독단적"
- "이건 다르다 왜냐하면..."

### 예외 (인간 파트너 승인 필요)
- 일회용 프로토타입
- 생성된 코드
- 설정 파일

---

## 4. 세 스킬의 상호작용

```
writing-plans ──creates──→ Implementation Plan
                               │
                               ├──→ subagent-driven-development (추천)
                               │       │
                               │       ├─ per task: Implementer (TDD 적용)
                               │       ├─ per task: Spec Reviewer
                               │       ├─ per task: Code Quality Reviewer
                               │       └─ final: Full Code Review
                               │
                               └──→ executing-plans (대안)

test-driven-development ──enforced by──→ Implementer 서브에이전트
```

### 핵심 패턴: "Controller + Specialized Workers"

**Controller** (메인 에이전트):
- 계획을 읽고 태스크 추출
- 서브에이전트에게 필요한 컨텍스트를 **직접 구성하여 전달**
- 서브에이전트의 상태 보고를 처리
- 리뷰 루프 관리
- TodoWrite로 진행 추적

**Workers** (서브에이전트):
- 격리된 컨텍스트에서 작업 (세션 히스토리 상속 없음)
- 각자의 역할에 특화된 프롬프트
- 명시적 상태 보고 프로토콜
- 에스컬레이션 경로 제공

---

## 5. 하네스 설계 시사점

| 관찰 | 시사점 |
|------|--------|
| **Controller가 컨텍스트를 큐레이션** | 서브에이전트에게 파일을 읽게 하지 않고 직접 텍스트를 전달 → 정밀한 컨텍스트 제어 |
| **2단계 리뷰 (spec → quality)** | 관심사 분리: "맞게 만들었나" vs "잘 만들었나" → 리뷰 품질 향상 |
| **불신 기반 spec review** | "Implementer 보고를 신뢰하지 말라" → 독립 검증 강제 |
| **4가지 상태 프로토콜** | DONE/DONE_WITH_CONCERNS/NEEDS_CONTEXT/BLOCKED → 명확한 에스컬레이션 경로 |
| **모델 선택 전략** | 태스크 복잡도에 따라 cheap/standard/capable 모델 사용 → 비용 최적화 |
| **에스컬레이션 유도** | "Bad work > no work" → 에이전트가 무리하지 않도록 안전장치 |
| **placeholder 절대 금지** | 서브에이전트 자율성의 전제: 계획이 100% 자기완결적이어야 함 |
| **합리화 방어 테이블** | LLM의 규칙 회피 패턴을 선제적으로 나열하고 반박 |
| **TDD = 스킬에도 적용** | 코드든 문서든 동일한 검증 원칙 |
| **리뷰 루프** | 리뷰어가 이슈 발견 → Implementer 수정 → 재리뷰 → 승인까지 반복 |

---

**다음 단계**: Step 4 — `dispatching-parallel-agents`, `agents/code-reviewer.md` → 서브에이전트 아키텍처와 역할 분리 패턴
