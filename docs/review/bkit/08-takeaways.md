# bkit - Takeaways for Harness Design

> bkit 고유 패턴과 하네스 설계 시사점 종합

---

## 1. Architecture Patterns

### Pattern A: Declarative State Machine

bkit의 핵심은 **PDCA 워크플로우를 선언적 FSM으로 구현**한 것.

```
Transition table (25 entries)
  + Guard functions (11, Boolean)
  + Action functions (17, side effects)
  = 전체 워크플로우 로직
```

**장점**: 전이 규칙이 곧 문서. 행 추가만으로 워크플로우 확장.
**단점**: 607 함수 규모의 복잡도. 설정 간 암묵적 의존.

**하네스 적용**: 핵심 워크플로우만 선언적 FSM으로. 복잡도 제한 필요.

### Pattern B: Guard/Gate 2단 분리

```
Guard: "이 전이가 가능한가?" → Boolean (state machine 수준)
Gate:  "이 결과가 충분한가?" → Score 0-100 (quality 수준)
```

Guard는 전이 가부만, Gate는 품질 평가. 이 분리가 **automation level별 차등 행동**을 가능하게 함:
- 같은 gate 결과(retry)도 L2에서는 유저 확인, L3에서는 자동 재시도.

### Pattern C: Config-Driven Everything

```json
{
  "pdca.matchRateThreshold": 90,
  "quality.thresholds.codeQualityScore": 70,
  "automation.defaultLevel": 2,
  "guardrails.loopBreaker.maxPdcaIterations": 5
}
```

모든 임계값이 `bkit.config.json`에서 주입 → 같은 코드가 Starter(80%)/Dynamic(90%)/Enterprise(100%)로 동작.

**하네스 적용**: 임계값 하드코딩 금지. config로 관리.

### Pattern D: Progressive Automation (L0-L4)

```
L0 (Manual) → L1 (Guided) → L2 (Semi-Auto) → L3 (Auto) → L4 (Full-Auto)
```

신뢰는 **실적으로 획득** (Trust Score 0-100):
- 성공 → +3~5점 → 자동화 확대
- 실패 → -5~15점 → 자동화 축소
- Emergency stop → L1 강제 하락

### Pattern E: Checkpoint-per-Phase

```
모든 phase 전이 → createCheckpoint (SHA-256 integrity)
  → error → saveResumePoint → restoreCheckpoint
  → user rollback → 이전 checkpoint 복원
```

**하네스 적용**: git commit 기반 checkpoint (저장 공간 무관, diff 가시성) + state snapshot 조합.

### Pattern F: Multi-Feature Isolation

```
최대 5개 feature 동시 → 각각 독립 FSM 인스턴스
autoSwitch: 유저 의도에 따라 자동 feature 전환
stale detection: 7일 초과 feature 자동 경고
```

실제 개발에서 여러 feature 병렬은 흔한 시나리오.

---

## 2. Agent System Patterns

### Pattern G: CTO-Led Team Orchestration

```
CTO (opus, 50 turns)
  ├── Plan: leader pattern (CTO 결정)
  ├── Design: leader/council (합의)
  ├── Do: swarm (병렬 실행)
  ├── Check: council (합의 투표)
  └── Act: leader/watchdog (모니터링)
```

**5 Orchestration Patterns**: leader, council, swarm, pipeline, watchdog.
Phase별 + Level별 패턴 매핑.

### Pattern H: Least Privilege for Agents

```
Leader (cto, pm-lead):     Read + Write + Edit + Bash (전체)
Validator (gap-detector):  Read only (판단만, 수정 안 함)
Analyzer (pm-research):    Read + WebSearch (분석만)
Writer (pm-prd):           Read + Write + Edit (문서만, Bash 금지)
Implementer (pdca-iterator): Read + Write + Edit + Bash (전체)
```

`disallowedTools` frontmatter로 역할별 최소 권한 명시.

### Pattern I: Phase-based Team Recomposition

```
Do → Check 전이 시:
  구현 팀 (bkend-expert, frontend-architect)
    → 검증 팀 (gap-detector, code-analyzer, qa-strategist)
```

**구현한 에이전트가 자기 코드를 검증하지 않음** → "불신 기반 리뷰"의 구조적 보장.

### Pattern J: Model Selection by Role

| 역할 | Model | 이유 |
|------|-------|------|
| 리더/의사결정 | opus | 아키텍처 판단 |
| 전문 작업/생성 | sonnet | 비용 효율 |
| 모니터링/반복 | haiku | 저비용 상시 감시 |

**12 opus : 22 sonnet : 2 haiku** — 비용 최적화.

---

## 3. Skill System Patterns

### Pattern K: Workflow/Capability Classification

```
Workflow (11):  프로세스 자동화 → 모델 발전과 무관 → 영구
Capability (17): 도메인 지식 → 모델 내재화 가능 → 시한부
Hybrid (1):     둘 다
```

**Model Parity Test**: `ab-tester.js --parity` → 스킬 없이 85%+ 달성 시 deprecation 후보.

스킬의 수명 관리를 자동화하는 독창적 개념.

### Pattern L: 8-Language Semantic Trigger

```
UserPromptSubmit → intent detection → confidence scoring
  → >= 0.7: 자동 트리거
  → < 0.7 + ambiguity: 명확화 질문
```

EN, KO, JA, ZH, ES, FR, DE, IT — 8개 언어 키워드 매칭.

### Pattern M: Skill-Agent Explicit Binding

```yaml
# Skill frontmatter
agent: bkit:pipeline-guide      # Primary
# or multiple agents per action
agents:
  default: pipeline-guide
  frontend: frontend-architect
  qa: qa-strategist
```

스킬과 에이전트의 연결이 frontmatter에 명시 → 어떤 스킬이 어떤 에이전트를 호출하는지 투명.

---

## 4. Hook & Safety Patterns

### Pattern N: 21-Event Full Hook Utilization

| 핵심 Hook | 용도 | 필수도 |
|-----------|------|:------:|
| SessionStart | 초기화, 대시보드 | ★★★ |
| PreToolUse (Bash) | 파괴적 작업 차단 | ★★★ |
| Stop | Phase 전이, gate 평가 | ★★★ |
| PreCompact | 상태 스냅샷 | ★★★ |
| UserPromptSubmit | Intent detection | ★★☆ |
| TaskCompleted | 자동 진행 | ★★☆ |
| StopFailure | 에러 복구 | ★★☆ |

### Pattern O: Guardrail-as-Code

```javascript
// 8 rules, 각각 severity + default action
G-001: rm -rf           → critical → deny
G-002: git push --force  → critical → deny
G-003: git reset --hard  → high    → ask
...
```

규칙이 코드가 아닌 **데이터**(테이블)로 정의 → 추가/제거/비활성화 가능.

### Pattern P: Context Compaction Defense

```
PreCompact  → 상태 스냅샷 저장 (최근 10개)
PostCompact → 무결성 검증 → 손실 시 Plugin Data에서 복원
```

상태 관리를 한다면 compaction 대응 필수.

### Pattern Q: Audit Trail (2종)

```
1. Action Log (.bkit/audit/YYYY-MM-DD.jsonl)
   → 무엇을 했는가 (16 action types)

2. Decision Trace (.bkit/decisions/YYYY-MM-DD.jsonl)
   → 왜 했는가 (15 decision types + rationale + alternatives)
```

3-level explanation: brief (1문장) → normal (1문단) → detailed (전체 trace).

---

## 5. Testing Patterns

### Pattern R: Skill Eval as Quality Gate

```
스킬 생성 → eval.yaml + prompt + expected 정의
  → runner.js로 자동 평가
  → Capability: output quality (15 criteria)
  → Workflow: process compliance (20 criteria)
```

**스킬마다 평가 기준이 내장** → 스킬 품질의 자동 검증.

### Pattern S: Model Parity for Deprecation

```
ab-tester.js --parity {skill} --model {model}
  → 스킬 ON vs OFF 비교
  → 85%+ 달성 → deprecation recommendation
  → 모델 업그레이드마다 benchmark 실행
```

스킬의 수명 관리를 자동화.

### Pattern T: 12-Category Test Matrix

```
unit → integration → security → regression → performance
→ philosophy → ux → e2e → architecture → controllable-ai
→ behavioral → contract
```

특히 **philosophy tests** (설계 원칙 코드 검증), **contract tests** (Hook/MCP 스키마), **controllable-ai tests** (L0-L4 + Trust Score)는 독창적.

---

## 6. 하네스 적용 우선순위

### Tier 1 — 즉시 적용 (Core Foundation)

| # | 패턴 | 이유 |
|---|------|------|
| 1 | **Guardrail-as-Code** (O) | 파괴적 작업 사전 차단, 최소 G-001~G-004 |
| 2 | **Workflow/Capability Classification** (K) | 스킬 수명 관리의 기반 |
| 3 | **Least Privilege for Agents** (H) | disallowedTools로 역할별 권한 제한 |
| 4 | **Config-Driven Everything** (C) | 임계값 하드코딩 금지, config 관리 |
| 5 | **21-Event Hook Utilization** (N) | SessionStart + PreToolUse(Bash) 최소 활용 |

### Tier 2 — 설계 단계 반영

| # | 패턴 | 이유 |
|---|------|------|
| 6 | **Guard/Gate 2단 분리** (B) | automation level별 차등 행동 기반 |
| 7 | **Audit Trail** (Q) | Action log + Decision trace → Full Visibility |
| 8 | **Context Compaction Defense** (P) | 상태 관리 시 PreCompact/PostCompact 필수 |
| 9 | **Model Selection by Role** (J) | opus/sonnet/haiku 비용 최적화 |
| 10 | **Phase-based Team Recomposition** (I) | 불신 기반 리뷰의 구조적 보장 |
| 11 | **Skill-Agent Explicit Binding** (M) | 스킬↔에이전트 투명한 연결 |

### Tier 3 — 점진적 도입

| # | 패턴 | 이유 |
|---|------|------|
| 12 | **Progressive Automation (L0-L4)** (D) | 초기 L0/L2/L4 3단계로 시작 |
| 13 | **Declarative State Machine** (A) | 핵심 워크플로우만 FSM |
| 14 | **Trust Score** (D) | L0-L4 안정화 후 도입 |
| 15 | **Checkpoint-per-Phase** (E) | git commit + state snapshot 조합 |
| 16 | **Skill Evals + Parity Test** (R/S) | 스킬 수 증가 시 자동화 |
| 17 | **8-Language Semantic Trigger** (L) | 다국어 지원 시 |
| 18 | **Multi-Feature Isolation** (F) | 복잡도 관리가 가능해지면 |
| 19 | **CTO-Led Team Orchestration** (G) | Agent Teams 안정화 후 |
| 20 | **12-Category Test Matrix** (T) | 테스트 성숙 후 |

---

## 7. bkit이 증명한 것

1. **선언적 FSM으로 워크플로우를 관리할 수 있다** — 25 transitions + 11 guards + 17 actions = 전체 PDCA 로직

2. **Progressive Automation이 작동한다** — L0-L4 + Trust Score로 신뢰 기반 자동화 확대/축소

3. **파괴적 작업 차단이 필수다** — 8 guardrail rules (G-001~G-008) + PreToolUse 차단

4. **상태 보존은 선택이 아닌 필수** — Context compaction 대응 (PreCompact/PostCompact)

5. **스킬도 테스트 가능하다** — Skill Evals (30 definitions) + Model Parity Test

6. **불신 기반 리뷰가 효과적이다** — Phase-based Team Recomposition으로 구조적 보장

7. **Audit Trail이 투명성을 보장한다** — Action log + Decision trace + 3-level explanation

8. **Config-driven이 유연성을 준다** — 동일 코드가 Starter/Dynamic/Enterprise로 동작

9. **비용 최적화가 가능하다** — 12 opus : 22 sonnet : 2 haiku 역할별 모델 선택

10. **스킬은 수명이 있다** — Workflow/Capability classification + Parity Test로 자동 deprecation

---

## 8. bkit에 없는 것 (Gap 분석)

| Gap | 설명 | 영향 |
|-----|------|------|
| **합리화 방어** | LLM이 프로세스를 건너뛰는 합리화에 대한 구조적 방어 없음 | 스킬 준수 약화 가능 |
| **지식 축적** | Audit만 있고 검색 가능한 KB 없음 | 같은 실수 반복 가능 |
| **Multi-Platform** | Claude Code 전용 | 사용자 기반 제한 |
| **Token Efficiency** | 607 함수 + 84 모듈의 토큰 비용 | 컨텍스트 부담 |
| **단순함** | 4,028 TC, 12 카테고리 — 높은 학습 곡선 | 채택 장벽 |
| **Confidence Gating** | Quality Gate는 있지만 per-finding 신뢰도 없음 | Review output quality |
| **Zero-Dependency** | Node.js 필수 | 설치 장벽 |

---

## 9. bkit의 핵심 모순 — 복잡도 vs 접근성

### 규모

| 측면 | 수치 |
|------|:----:|
| Skills | 38 |
| Agents | 36 |
| JS 함수 | 607 |
| Lib 모듈 | 84 |
| Hook 이벤트 | 21 |
| Scripts | 42 |
| Test Cases | 4,028 |
| Stars | 485 |

### 복잡도-채택 역설

bkit은 **객관적으로 정교한 시스템**:
- 선언적 FSM, 5단계 자동화, Trust Score, Quality Gates, Audit Trail
- 4,028 TC, 12 카테고리 테스트, Model Parity Test

하지만 GitHub stars는 485.

**원인 분석**:
1. **진입 장벽**: Node.js 필수
2. **플랫폼 제한**: Claude Code only
3. **학습 곡선**: 607 함수 + 84 모듈
4. **"Good enough" 효과**: 더 단순한 도구로 대부분의 유저에게 충분
5. **타이밍**: 후발 진입

### 하네스 설계 시 교훈

**"필요한 만큼만 복잡하게"**:
- bkit의 정교함에서 **패턴을 배우되**
- 복잡도는 **필요가 증명될 때만** 추가

```
시작: 단순함 (stateless, Markdown)
성장: bkit 패턴 점진 도입 (FSM, quality gates, audit)
성숙: bkit 수준의 정교함 (trust score, regression guard)
```

---

## 10. 결론: bkit에서 도출한 설계 원칙

| # | 원칙 | 근거 |
|---|------|------|
| 1 | **Trust is Earned, Not Assumed** | L0-L4 + Trust Score |
| 2 | **Every Decision is Auditable** | Action log + Decision trace |
| 3 | **Destructive Ops are Always Gated** | Guardrail-as-Code (G-001~G-008) |
| 4 | **Implementer ≠ Reviewer** | Phase-based Team Recomposition |
| 5 | **Skills Have Lifecycles** | Workflow/Capability + Parity Test |
| 6 | **State Must Survive Compaction** | PreCompact/PostCompact |
| 7 | **Config-Driven, Not Hardcoded** | bkit.config.json 전체 임계값 관리 |
| 8 | **Guard ≠ Gate** | Boolean 전이 가부 vs Score 품질 평가 분리 |
| 9 | **Least Privilege by Default** | disallowedTools 역할별 권한 |
| 10 | **Progressive Complexity** | 복잡도-채택 역설에서 도출 |

---

**연구 완료**. 이 문서는 bkit 독립 분석이며, 프로젝트 간 통합 비교는 별도 문서에서 진행.
