# bkit - PDCA State Machine, Quality Gates, Config System

> State machine 내부 구조, Quality Gate 시스템, 중앙 설정 아키텍처 deep dive

---

## 1. State Machine 아키텍처

### 소스: `lib/pdca/state-machine.js` (v2.0.0)

**완전 선언적 FSM** — transition table + guard functions + action functions.
런타임 로직이 테이블에서 분리되어, 전이 규칙 추가/수정이 코드 변경 없이 가능.

### States (11)

```
idle → pm → plan → design → do → check → act → qa → report → archived → error
```

| State | 역할 |
|-------|------|
| `idle` | 초기/대기 상태 |
| `pm` | Product Management — PRD 생성 (43 frameworks) |
| `plan` | 목표, 범위, 성공 기준 정의 |
| `design` | 아키텍처, 데이터 모델, API 스펙 |
| `do` | 설계 기반 구현 |
| `check` | 설계-구현 gap analysis |
| `act` | 자동 수정 (Evaluator-Optimizer) |
| `qa` | QA 단계 (v2.1.1 추가, Chrome MCP 활용) |
| `report` | 완료 보고, lessons learned |
| `archived` | 완료 후 아카이브 |
| `error` | 에러 상태 (어떤 상태에서든 진입 가능) |

**v2.1.1 추가**: `qa` state — Chrome MCP 가용 여부를 체크하여 자동 QA 수행.

### Events (18+)

```
START, PM_DONE, PLAN_COMPLETE, DESIGN_APPROVED, DO_COMPLETE,
CHECK_PASS, CHECK_FAIL, ITERATE, ITERATE_DONE,
QA_START, QA_PASS, QA_FAIL, QA_RETRY,
REPORT_DONE, ARCHIVE,
ERROR, RECOVER, RESUME
```

**패턴**: Phase 완료 → `{PHASE}_DONE/COMPLETE/APPROVED` 이벤트 → 다음 상태 전이.

### Transitions (25)

핵심 전이 경로:

```
idle    → pm       [START]
pm      → plan     [PM_DONE]        guard: guardDeliverableExists
plan    → design   [PLAN_COMPLETE]  guard: guardDeliverableExists
design  → do       [DESIGN_APPROVED] guard: guardDesignApproved
do      → check    [DO_COMPLETE]    guard: guardDoComplete
check   → report   [CHECK_PASS]     guard: guardMatchRatePass
check   → act      [CHECK_FAIL]     guard: guardCanIterate
act     → check    [ITERATE_DONE]   action: incrementIteration
check   → qa       [QA_START]       guard: guardQaAvailable
qa      → report   [QA_PASS]        guard: guardQaPass
qa      → qa       [QA_RETRY]       guard: guardQaMaxRetryReached (반전)
qa      → act      [QA_FAIL]
report  → archived [ARCHIVE]        action: archiveDocuments
*       → error    [ERROR]          action: saveResumePoint
error   → *        [RECOVER]        action: restoreCheckpoint
```

**설계 포인트**: 
- Check → Act → Check 루프가 max 5회로 제한 (guardCanIterate)
- Error에서 어떤 상태로든 복귀 가능 (RECOVER + restoreCheckpoint)
- QA는 선택적 — Chrome MCP 가용 시에만 활성화

---

## 2. Guard Functions (11)

Guards = 전이의 전제조건. Boolean 반환.

| Guard | 체크 대상 | 실패 시 |
|-------|----------|---------|
| `guardDeliverableExists` | 해당 phase의 문서/산출물 존재 여부 | 전이 차단 |
| `guardDesignApproved` | 설계 문서 승인 상태 | do로 진입 불가 |
| `guardDoComplete` | 구현 완료 (파일 존재 + 기본 검증) | check로 진입 불가 |
| `guardMatchRatePass` | `matchRate >= config.matchRateThreshold` (기본 90%) | report로 못 감 → act로 |
| `guardCanIterate` | `iterations < config.maxIterations` (기본 5) | 더 이상 반복 불가 → 강제 report |
| `guardStaleFeature` | 마지막 활동 > 7일 | 경고/자동 아카이브 |
| `guardQaAvailable` | Chrome MCP 서버 가용 여부 | QA skip → 바로 report |
| `guardQaPass` | `qaPassRate >= 95% && qaCriticalCount === 0` | QA 재시도/실패 |
| `guardQaMaxRetryReached` | QA 재시도 횟수 초과 | QA 종료 → act로 |
| `guardNotArchived` | archived 상태가 아닌지 확인 | 아카이브된 feature 수정 방지 |
| `guardResumeValid` | 저장된 resume point 유효성 | 복구 불가 → idle로 |

### Guard 설계 원칙

1. **Config-driven thresholds** — 임계값이 모두 `bkit.config.json`에서 로드. 코드 수정 없이 조정 가능.
2. **Fail-safe** — guard가 에러 발생 시 `false` 반환 (전이 차단 = 안전한 방향).
3. **Context 기반** — guard 함수에 `(context, config)` 전달. context는 feature별 상태.

---

## 3. Action Functions (17)

Actions = 전이 시 실행되는 부수효과.

| Action | 실행 시점 | 효과 |
|--------|----------|------|
| `initFeature` | idle → pm | feature metadata 초기화 (name, timestamps, phase history) |
| `recordTimestamp` | 모든 전이 | phase 진입/이탈 시간 기록 |
| `createCheckpoint` | phase 전이마다 | 현재 상태의 스냅샷 저장 (rollback 용) |
| `recordMatchRate` | check 진입 | gap analysis 결과 (matchRate) 기록 |
| `incrementIteration` | act → check | iteration counter 증가 |
| `archiveDocuments` | report → archived | 문서를 archive 경로로 이동 |
| `saveResumePoint` | → error | 에러 직전 상태 저장 (복구용) |
| `restoreCheckpoint` | error → * | checkpoint에서 상태 복원 |
| `initQaPhase` | → qa | QA context 초기화 |
| `recordQaResult` | qa 내 전이 | QA 결과 (passRate, criticalCount) 기록 |
| `generateQaReport` | qa → report | QA 보고서 생성 |
| `resetIterations` | pm → plan (새 사이클) | iteration counter 리셋 |
| `updatePhaseMetadata` | 모든 전이 | phase별 메타데이터 갱신 |
| `notifyPhaseChange` | 모든 전이 | UI/audit 로그에 phase 변경 알림 |
| `enforceLimit` | feature 생성 | 동시 활성 feature 제한 (기본 5) |
| `completeFeature` | → archived | feature를 완료 상태로 마킹 |
| `abandonFeature` | 유저 요청 | feature를 중단 상태로 마킹 |

### 핵심 패턴: Checkpoint-per-Phase

```
모든 phase 전이 → createCheckpoint action 자동 실행
  → error 발생 시 → saveResumePoint → 복구 시 restoreCheckpoint
  → 유저 rollback 요청 시 → 이전 checkpoint로 복원
```

**Superpowers와의 차이**: Superpowers는 상태 관리 없음 (stateless). bkit은 모든 전이를 추적하고 rollback 가능.

---

## 4. Context Management

### createContext(featureName)

```javascript
{
  feature: 'auth-system',
  currentState: 'idle',
  matchRate: null,
  iterations: 0,
  qaPassRate: null,
  qaCriticalCount: null,
  qaRetryCount: 0,
  phaseHistory: [],
  checkpoints: [],
  resumePoint: null,
  metadata: { createdAt, updatedAt, level }
}
```

### syncContext()

`$CLAUDE_PLUGIN_DATA/pdca-state/{feature}.json`에 저장/로드.

**설계 포인트**: Plugin data 디렉토리 활용 → Claude Code 세션 간 상태 지속.

### Multi-Feature Support

```
최대 5개 feature 동시 활성 (bkit.config.json → multiFeature.maxActiveFeatures)
각 feature가 독립 context → 독립 state machine 인스턴스
autoSwitch: true → 유저 의도에 따라 자동 feature 전환
```

---

## 5. Quality Gate System

### 소스: `lib/quality/gate-manager.js` (v2.0.0)

### Gate Definitions (8 phases)

| Gate | Phase | Pass 조건 | Retry 조건 | Fail 조건 |
|------|-------|-----------|-----------|-----------|
| PM Gate | pm → plan | PRD 존재 + 완성도 확인 | 부분 작성 | PRD 없음 |
| Plan Gate | plan → design | Plan doc 검증됨 | 일부 미비 | Plan doc 없음 |
| Design Gate | design → do | Design doc 승인됨 | 수정 필요 | Design doc 없음 |
| Do Gate | do → check | 구현 존재 + 기본 검증 | 일부 미완성 | 구현 없음 |
| Check Gate | check → report | **matchRate >= threshold** | 70-89% | < 70% |
| Iterate Gate | check → act | matchRate < threshold + iterations < max | — | max iterations 도달 |
| QA Gate | qa → report | passRate >= 95% + criticals = 0 | 재시도 가능 | max retry 도달 |
| Report Gate | report → archived | 보고서 완성 | — | 보고서 없음 |

### Metrics (10개)

| ID | Metric | 설명 | 기본 임계값 |
|----|--------|------|-------------|
| M1 | matchRate | 설계-구현 일치율 | 90% |
| M2 | codeQualityScore | 코드 품질 점수 | 70 |
| M3 | designCompleteness | 설계 완성도 | — |
| M4 | conventionCompliance | 코딩 컨벤션 준수율 | — |
| M5 | apiComplianceRate | API 스펙 준수율 | — |
| M6 | qaPassRate | QA 통과율 | 95% |
| M7 | qaCriticalCount | 치명적 이슈 수 | 0 |
| M8 | runtimeErrorCount | 런타임 에러 수 | — |
| M9 | iterationEfficiency | 반복 효율성 | — |
| M10 | regressionRate | 회귀 발생률 | — |

### Level별 임계값 Override

| Level | matchRate | codeQualityScore | 비고 |
|-------|:---------:|:-----------------:|------|
| **Starter** | 80% | 기본 | 진입 장벽 낮춤 |
| **Dynamic** | 90% | 70 | 기본값 |
| **Enterprise** | 100% | 80 | 최대 엄격 |

### Automation-Aware Resolution

Gate 결과는 automation level에 따라 다르게 처리:

```
L0-L1 (guide):    pass → proceed, retry → 유저에게 안내, fail → 유저에게 안내
L2 (semi):        pass → 자동 진행, retry → 유저 확인 요청, fail → 유저에게 안내
L3-L4 (full):     pass → 자동 진행, retry → 자동 재시도, fail → 에스컬레이션
```

**핵심**: 같은 gate 결과도 automation level에 따라 행동이 달라진다. Gate는 판단만, 행동은 automation controller가 결정.

---

## 6. Feature Lifecycle Management

### 소스: `lib/pdca/lifecycle.js` (v2.0.0)

### Lifecycle Flow

```
initializeFeature(name, level)
  → phase transitions (with metadata tracking)
  → shouldAutoArchive() check (report + matchRate >= 90%)
  → archiveFeature() OR abandonFeature()
  → cleanup (stale detection + limit enforcement)
```

### Stale Feature Detection

```javascript
detectStaleFeatures(threshold = 7 * 24 * 60 * 60 * 1000)  // 7일
  → 마지막 활동 > threshold인 feature 목록 반환
  → cleanupStaleFeatures(dryRun = true)로 미리보기 가능
```

### Feature Timeline

```javascript
getFeatureTimeline(featureName)
  → [
      { phase: 'plan', enteredAt, exitedAt, duration },
      { phase: 'design', enteredAt, exitedAt, duration },
      ...
    ]
```

**활용**: 각 phase에 얼마나 시간이 걸렸는지 추적 → 병목 식별.

### 동시 Feature 제한

```
enforceLimit(maxActive = 5)
  → 활성 feature가 max 초과 시 → 가장 오래된 것 경고
  → 새 feature 생성 차단 (생성은 아카이브 후 가능)
```

---

## 7. PDCA Module 전체 구조

### 소스: `lib/pdca/index.js` — 12 서브시스템, 100+ exports

| 서브시스템 | Exports | 역할 |
|-----------|:-------:|------|
| **Tier** | 8 | 언어 tier 감지 + PDCA 가이던스 |
| **Level** | 7 | 복잡도별 phase 요구사항 (Starter/Dynamic/Enterprise) |
| **Phase** | 9 | PDCA phase 관리 + 전이 |
| **Status** | 24 | Feature 상태 추적, 영속화, 히스토리, 라이프사이클 |
| **Automation** | 14 | 자동화 레벨 감지, 자동 진행, hook context |
| **Executive Summary** | 3 | 요약 생성 + 포매팅 |
| **Template Validator** | 6 | 문서 유형 감지 + 검증 |
| **State Machine** | 16 | Transitions, events, guards, actions, context |
| **Full-Auto Do** | 6 | 설계 스펙 기반 자동 구현 실행 |
| **Feature Manager** | 16 | 멀티 feature 추적, 잠금, 충돌 감지 |
| **Batch Orchestrator** | 6 | 배치 계획 실행 + 상태 모니터링 |
| **Session Guide** | 8 | 세션 컨텍스트 분석 + 플래닝 |

### 계층 구조

```
State Machine (16)  ─── 핵심 FSM
  ↑
Phase (9) + Status (24)  ─── phase/feature 관리
  ↑
Lifecycle (lifecycle.js)  ─── 생성/아카이브/정리
  ↑
Automation (14) + Gate Manager  ─── 자동화 + 품질 게이트
  ↑
Feature Manager (16) + Batch Orchestrator (6)  ─── 멀티 feature + 배치
  ↑
Session Guide (8)  ─── 세션 수준 오케스트레이션
```

---

## 8. Config System

### 소스: `bkit.config.json` + `lib/core/config.js` (v1.6.0)

### 설정 구조

```json
{
  "pdca": {
    "docPaths": { "plan": "docs/01-plan", "design": "docs/02-design", ... },
    "matchRateThreshold": 90,
    "maxIterations": 5,
    "requireDesignDoc": true,
    "automationLevel": 2
  },
  "triggers": {
    "implicitEnabled": true,
    "confidenceThreshold": 0.7,
    "clarifyAmbiguity": true
  },
  "automation": {
    "defaultLevel": 2,
    "trustScoreEnabled": true,
    "autoEscalation": true,
    "maxConcurrentFeatures": 3,
    "gateTimeoutMs": 300000
  },
  "guardrails": {
    "destructiveDetection": true,
    "loopBreaker": {
      "maxPdcaIterations": 5,
      "maxSameFileEdits": 10,
      "maxAgentRecursion": 3
    },
    "blastRadiusLimit": true
  },
  "quality": {
    "gateEnabled": true,
    "metricsCollection": true,
    "regressionGuard": true,
    "thresholds": {
      "matchRate": 90,
      "codeQualityScore": 70,
      "criticalIssueCount": 0,
      "conventionCompliance": 80
    }
  },
  "team": {
    "maxTeammates": 5,
    "ctoAgent": "cto-lead",
    "orchestrationPatterns": {
      "Dynamic": { "plan": "leader", "do": "swarm", "check": "council" },
      "Enterprise": { "plan": "council", "do": "swarm", "check": "watchdog" }
    }
  }
}
```

### Config Loading

```javascript
loadConfig()   → bkit.config.json 로드 (프로젝트 루트 OR plugin 루트)
getConfig('pdca.matchRateThreshold', 90)  → dot-notation 접근
getBkitConfig(forceRefresh)  → 환경변수 오버라이드 포함 전체 설정
```

**설계 포인트**:
- **Lazy loading** + **global caching** — 순환 의존 방지, 성능 최적화
- **환경변수 오버라이드** — `BKIT_MATCH_RATE_THRESHOLD` 등으로 런타임 오버라이드
- **dot-notation 접근** — 깊은 중첩 설정에 간결하게 접근

### Guard/Gate와 Config의 연동

```
guard 함수 ──read──→ config.pdca.matchRateThreshold (90)
gate 함수 ──read──→ config.quality.thresholds.matchRate (90)
                    config.quality.thresholds.codeQualityScore (70)
automation ──read──→ config.automation.defaultLevel (2)
                    config.guardrails.loopBreaker.maxPdcaIterations (5)
```

모든 임계값이 config에서 주입 → **동일 코드, 다른 설정으로 Starter/Dynamic/Enterprise 동작 변경**.

---

## 9. Check-Act Iteration Loop (상세)

### 핵심 메커니즘

```
Do 완료
  → gap-detector 실행 (Check phase)
  → matchRate 계산
  │
  ├─ >= 90%: CHECK_PASS → Report
  ├─ 70-89%: 유저 선택 (L2) 또는 자동 iterate (L3+)
  └─ < 70%: CHECK_FAIL → Act
       │
       ├─ iterations < 5: guardCanIterate = true
       │   → pdca-iterator 실행 (Act phase)
       │   → 수정 적용
       │   → ITERATE_DONE → Check (재실행)
       │
       └─ iterations >= 5: guardCanIterate = false
           → 강제 Report (matchRate 미달 상태로 보고)
```

### Loop Breaker (Guardrails)

| Guardrail | 기본값 | 목적 |
|-----------|:------:|------|
| maxPdcaIterations | 5 | Check-Act 루프 최대 횟수 |
| maxSameFileEdits | 10 | 같은 파일 과도한 수정 방지 |
| maxAgentRecursion | 3 | 에이전트 재귀 호출 제한 |
| blastRadiusLimit | true | 변경 범위 제한 (파괴적 작업 감지) |

**Superpowers의 3회 실패 규칙과 비교**: 
- Superpowers: 3회 수정 실패 → "architectural problem" → 유저와 논의
- bkit: 5회 iteration 제한 + 같은 파일 10회 수정 제한 + 에이전트 재귀 3회 → 다층 방어

---

## 10. 하네스 설계 시사점

### 10.1 선언적 FSM의 가치

bkit의 state machine은 **transition table이 곧 문서**. 상태 다이어그램을 코드에서 직접 읽을 수 있음.

```
장점: 전이 규칙 추가가 테이블에 행 추가로 끝남
단점: 607개 함수의 복잡도 — "설정의 지옥" 위험
```

**하네스 적용**: 핵심 워크플로우를 선언적 FSM으로 정의하되, 복잡도를 Superpowers 수준으로 제한.

### 10.2 Guard + Gate 분리 패턴

```
Guard: "이 전이가 가능한가?" (Boolean, state machine 수준)
Gate:  "이 결과가 충분한가?" (Score 0-100, quality 수준)
```

Guard는 가능/불가능, Gate는 점수/등급. 이 분리가 automation level별 행동 차별화를 가능하게 함.

### 10.3 Config-Driven Thresholds

모든 임계값이 `bkit.config.json`에서 로드되는 패턴:
- 같은 코드가 Starter(80%)/Dynamic(90%)/Enterprise(100%)로 동작
- 환경변수로 런타임 오버라이드 가능
- 단점: 설정 간 의존관계가 암묵적 (matchRate threshold를 50%로 내리면 quality gate와 불일치)

### 10.4 Checkpoint-per-Phase

Phase 전이마다 자동 checkpoint → error 시 restoreCheckpoint.
Superpowers는 git worktree로 격리, bkit은 plugin data에 state snapshot.

**하네스 적용**: git checkpoint (commit/stash) + state snapshot 조합이 가장 실용적.

### 10.5 Multi-Feature 관리

bkit은 최대 5개 feature를 동시에 독립 FSM으로 관리. 이건 Superpowers에 없는 기능.
실제 개발에서 여러 feature를 병렬로 다루는 건 흔한 시나리오.

**하네스 적용**: feature 단위 context 격리 + git worktree 조합 검토.

---

**다음 단계**: Step 3 — Agent System (36 agents, CTO/PM teams, orchestration patterns) deep dive
