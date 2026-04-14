# Superpowers - Takeaways for Harness Design

> 하네스 설계에 가져갈 패턴과 인사이트 종합

---

## 1. Architecture Patterns

### Pattern A: Skill System = Auto-Triggered Mandatory Workflows

Superpowers의 핵심 혁신은 **스킬이 opt-in이 아닌 강제**라는 점.

**메커니즘:**
- SessionStart hook → `using-superpowers` 스킬 전문을 컨텍스트에 주입
- "1% 규칙": 적용 가능성이 조금이라도 있으면 반드시 invoke
- Commands(명시적 호출) → Skills(자동 트리거)로 전환한 학습 결과

**하네스 적용:**
- 세션 시작 시 "어떤 스킬이 어떤 상황에서 활성화되는가" 규칙을 주입
- 유저가 스킬을 호출하는 게 아니라, 에이전트가 상황을 인식하고 자동 적용

### Pattern B: Controller + Specialized Workers

```
Controller (메인 에이전트)
  ├── 계획을 읽고 컨텍스트를 큐레이션
  ├── 서브에이전트에게 정확한 정보만 전달 (파일 읽기 위임 X)
  ├── 상태 보고 처리 + 리뷰 루프 관리
  └── TodoWrite로 진행 추적

Workers (서브에이전트)
  ├── 격리된 컨텍스트 (세션 히스토리 상속 X)
  ├── 역할별 특화 프롬프트
  ├── 명시적 상태 프로토콜 (DONE/CONCERNS/NEEDS_CONTEXT/BLOCKED)
  └── 에스컬레이션 경로 제공
```

**핵심**: Controller가 컨텍스트를 구성하여 전달. 서브에이전트에게 자율적 탐색을 시키지 않음.

### Pattern C: 2-Stage Review (Spec → Quality)

| 단계 | 관심사 | 태도 |
|------|--------|------|
| Spec Compliance | "맞게 만들었나" (과부족) | **불신 기반** — Implementer 보고 신뢰 X |
| Code Quality | "잘 만들었나" (품질) | 재사용 가능한 named agent |

순서 강제: spec compliance 통과 전에 code quality review 시작 금지.

### Pattern D: Hard Gates & Iron Laws

각 스킬에 위반 불가능한 절대 규칙:

| 스킬 | Iron Law |
|------|----------|
| TDD | "테스트 없이 프로덕션 코드 금지" |
| Debugging | "근본 원인 없이 수정 금지" |
| Verification | "검증 증거 없이 완료 주장 금지" |
| Brainstorming | "승인 없이 구현 금지" |

**설계 원칙**: "Violating the letter of the rules is violating the spirit of the rules."

---

## 2. Prompt Engineering Patterns

### Pattern E: Rationalization Defense

LLM은 규칙을 회피하기 위해 합리화한다. 이를 선제적으로 차단:

1. **Red Flags 테이블** — "이런 생각이 들면 STOP"
2. **합리화 테이블** — Excuse → Reality 매핑
3. **루프홀 명시적 차단** — "참고용 보관 금지", "적응 금지", "삭제는 삭제"
4. **"정신 vs 문자" 선제 차단** — 문자 위반 = 정신 위반

### Pattern F: CSO (Claude Search Optimization)

스킬의 발견 가능성과 올바른 사용을 위한 최적화:

- **Description = 트리거 조건만** (워크플로우 요약 금지)
  - 요약하면 LLM이 본문을 skip하고 description만 따름
- **"Use when..."으로 시작**, 3인칭
- **Token efficiency**: 자주 로드되는 스킬 <200단어
- **Cross-reference**: `@` 로드 금지 (컨텍스트 소모) → `REQUIRED BACKGROUND:` 명시

### Pattern G: Persuasion Principles

N=28,000 AI 대화 연구 기반 (33% → 72% compliance):

| 원칙 | 적용 |
|------|------|
| Authority | "YOU MUST", "No exceptions" — 결정 피로 제거 |
| Commitment | 공표 강제 ("I'm using [Skill]"), 체크리스트 추적 |
| Scarcity | "IMMEDIATELY after", "Before proceeding" |
| Social Proof | "Every time", "Always" — 보편적 표준 확립 |

### Pattern H: Escalation Protocol

서브에이전트가 무리하지 않도록:

```
"Bad work is worse than no work. You will not be penalized for escalating."
```

- NEEDS_CONTEXT: 정보 부족 → 컨텍스트 제공
- BLOCKED: 진행 불가 → 더 강한 모델 / 태스크 분할 / 유저 에스컬레이션
- 3회 수정 실패 → 아키텍처 질문 (더 이상 수정 시도 금지)

---

## 3. Infrastructure Patterns

### Pattern I: Bootstrap via SessionStart Hook

```
세션 시작 → hook 실행 → 핵심 스킬 전문을 <EXTREMELY_IMPORTANT>로 주입
```

- 모든 플랫폼이 같은 목표, 다른 방식으로 구현
- Claude Code: `hookSpecificOutput.additionalContext`
- Cursor: `additional_context`
- OpenCode: 첫 user message prepend (system message bloat 회피)

### Pattern J: Multi-Platform Abstraction

```
하나의 스킬 정의 (Claude Code 도구명 기준)
  → 플랫폼별 tool mapping table
  → 플랫폼별 plugin manifest
  → 기능 차이 시 graceful fallback
```

- Gemini: 서브에이전트 미지원 → executing-plans로 fallback
- Codex: named agent 미지원 → agent .md를 읽어 spawn_agent에 주입

### Pattern K: Zero-Dependency Plugin

- hook 스크립트가 순수 bash (OpenCode JS 예외)
- 외부 런타임 의존 없음
- Cross-platform polyglot (.cmd로 Windows/Unix 동시 지원)

### Pattern L: Model Selection Strategy

| 태스크 복잡도 | 시그널 | 모델 |
|--------------|--------|------|
| Mechanical | 1-2 파일, 명확한 스펙 | cheap/fast |
| Integration | 다중 파일, 통합 | standard |
| Architecture/Review | 설계 판단, 넓은 이해 | most capable |

비용: Controller가 88%, 서브에이전트당 $0.07-0.09. Cache가 91%.

---

## 4. Testing Patterns

### Pattern M: 3-Layer Test Strategy

| Layer | 목적 | 방법 |
|-------|------|------|
| **Triggering** | 자연어로 올바른 스킬 발견 | `claude -p` headless + stream-json 파싱 |
| **Compliance** | 스킬 규칙을 압력 하에서 준수 | Pressure scenario (3+ 압력 조합) + 선택 강제 |
| **Integration** | 실제 프로젝트에서 올바른 동작 | 파일 생성, 테스트 통과, 커밋 히스토리 검증 |

### Pattern N: Pressure Testing for Skills

```
좋은 시나리오 = 3+ 압력 조합 + 명시적 A/B/C 선택
  → "What do you do?" (not "should")
  → 실제 경로, 구체적 시간, 실제 결과
  → 쉬운 탈출 없음

Meta-testing: 실패 시 에이전트에게 스킬 개선 방향 질문
Bulletproof: 최대 압력 하에서 올바른 선택 + 스킬 섹션 인용
```

### Pattern O: TDD for Everything

```
코드       → RED-GREEN-REFACTOR
스킬/프롬프트 → RED(baseline 실패)-GREEN(스킬 작성)-REFACTOR(루프홀 차단)
계획       → self-review (spec coverage, placeholder scan, type consistency)
완료 주장   → verification gate (명령 실행 → 출력 확인 → 그 다음 주장)
```

---

## 5. Workflow Design Patterns

### Pattern P: 7-Stage Pipeline

```
brainstorming → git-worktrees → writing-plans → execution → TDD → review → finish
```

각 단계가 다음 단계의 **전제조건**. Skip 불가.

### Pattern Q: Plan = Self-Contained Contract

- 2-5분 단위 태스크
- 실제 코드 블록 필수, placeholder 절대 금지
- "context도 taste도 없는 주니어"가 따를 수 있어야 함
- 서브에이전트 자율성의 전제: 계획이 100% 자기완결적

### Pattern R: Structured Options (Not Open-Ended)

```
# BAD
"What should I do next?"

# GOOD
"4 options: 1) Merge 2) PR 3) Keep 4) Discard. Which?"
```

에이전트에게도 유저에게도 구조화된 선택지를 제시.

---

## 6. 우리 하네스에 우선 적용할 것

### Tier 1 — 즉시 적용

| # | 패턴 | 이유 |
|---|------|------|
| 1 | **SessionStart Bootstrap** (I) | 모든 것의 기반. 세션 시작 시 핵심 규칙 주입. |
| 2 | **SKILL.md Frontmatter 포맷** (F) | 스킬 정의 표준. name + "Use when..." description. |
| 3 | **Controller + Workers** (B) | 서브에이전트 아키텍처의 핵심. 컨텍스트 큐레이션. |
| 4 | **4-Status Protocol** (H) | DONE/CONCERNS/NEEDS_CONTEXT/BLOCKED — 명확한 인터페이스. |

### Tier 2 — 설계 단계에서 반영

| # | 패턴 | 이유 |
|---|------|------|
| 5 | **2-Stage Review** (C) | Spec compliance → Code quality 분리로 품질 향상. |
| 6 | **Rationalization Defense** (E) | LLM 합리화 대응은 스킬 품질의 핵심. |
| 7 | **3-Layer Testing** (M) | 트리거 + 준수 + 통합으로 완전한 검증. |
| 8 | **Model Selection** (L) | 비용 최적화. 모든 것에 최고 모델 불필요. |

### Tier 3 — 점진적 도입

| # | 패턴 | 이유 |
|---|------|------|
| 9 | **Multi-Platform Abstraction** (J) | 당장은 Claude Code 전용, 나중에 확장. |
| 10 | **Pressure Testing** (N) | 스킬이 충분히 성숙하면 적용. |
| 11 | **Persuasion Principles** (G) | 고급 스킬 설계 시 적용. |

---

## 7. Superpowers가 증명한 것

1. **LLM에게 프로세스를 강제할 수 있다** — 올바른 프롬프트 설계로 142K stars 달성
2. **자동 트리거 > 명시적 호출** — Commands deprecated, Skills 승리
3. **합리화 방어가 가능하다** — Red Flags + 합리화 테이블 + 루프홀 차단
4. **스킬도 TDD로 검증 가능하다** — 프롬프트/문서도 "테스트 가능한 코드"
5. **서브에이전트 아키텍처가 작동한다** — Controller가 컨텍스트 큐레이션, 서브에이전트당 $0.07-0.09
6. **불신 기반 리뷰가 효과적이다** — Implementer 보고 신뢰 X → 독립 검증
7. **Zero-dependency + multi-platform이 가능하다** — 하나의 스킬셋, 6개 플랫폼

---

## 8. Superpowers의 자체 모순 — Token Efficiency 위반

### writing-skills가 정한 기준

```
- getting-started workflows: <150 words
- Frequently-loaded skills:  <200 words
- Other skills:              <500 words (still be concise)
```

### 실제 현황: 14개 스킬 중 11개가 위반

| 스킬 | 단어 | 기준 | 초과 배율 |
|------|------|------|-----------|
| `writing-skills` | 3,212 | <500 | 6.4x |
| `brainstorming` | 1,553 | <200 (자주 로드) | **7.8x** |
| `subagent-driven-development` | 1,528 | <500 | 3x |
| `systematic-debugging` | 1,504 | <500 | 3x |
| `test-driven-development` | 1,496 | <200 (자주 로드) | **7.5x** |
| `dispatching-parallel-agents` | 923 | <500 | 1.8x |
| `receiving-code-review` | 929 | <500 | 1.8x |
| `writing-plans` | 914 | <500 | 1.8x |
| `using-superpowers` | 787 | <200 (매 세션) | **3.9x** |
| `using-git-worktrees` | 784 | <500 | 1.6x |
| `finishing-a-development-branch` | 679 | <500 | 1.4x |
| `verification-before-completion` | 668 | <500 | 1.3x |
| `writing-plans` | 914 | <500 | 1.8x |
| ✅ `executing-plans` | 360 | <500 | 통과 |
| ✅ `requesting-code-review` | 400 | <500 | 통과 |

### 근본 충돌: 합리화 방어 vs Token Efficiency

- **합리화 방어**를 위해 Red Flags 테이블, 합리화 테이블, 루프홀 명시적 차단, flowchart 등을 추가 → 단어 수 폭증
- **Token efficiency**를 위해 자주 로드되는 스킬은 <200 단어 → 합리화 방어 내용을 담을 수 없음

두 목표가 구조적으로 충돌한다. Superpowers는 **합리화 방어를 선택하고 token efficiency를 희생**했다.

### 하네스 설계 시 고려

1. **합리화 방어 내용을 스킬 본문에서 분리** — 별도 참조 파일로 이동, 필요시에만 로드
2. **Lazy loading** — 스킬 본문의 핵심만 로드, Red Flags/합리화 테이블은 위반 감지 시에만 로드
3. **단계적 로딩** — frontmatter + overview만 먼저, 상세 내용은 invoke 시에만
4. Superpowers의 `@` 참조 금지 규칙 자체가 이 문제의 증상 — 컨텍스트 소모를 두려워하면서 본문에 다 넣음
