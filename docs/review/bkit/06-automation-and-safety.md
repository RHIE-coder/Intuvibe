# bkit - Automation and Safety

> L0-L4 자동화 레벨, Trust Score 엔진, 파괴적 작업 감지, 체크포인트/롤백, 감사 시스템 deep dive

---

## 1. 5-Level Automation Control (L0-L4)

### 소스: `lib/control/automation-controller.js`

| Level | Name | Phase 전이 | 파괴적 작업 | Trust Score |
|:-----:|------|-----------|------------|:-----------:|
| **L0** | Manual | 모두 수동 승인 | 모두 거부/질문 | 0+ |
| **L1** | Guided | idle→pm/plan 자동 | Read 자동, Write 승인 | 20+ |
| **L2** | Semi-Auto | 대부분 자동, 핵심 gated | 비파괴 자동, 파괴 승인 | 40+ |
| **L3** | Auto | report→archive 제외 전체 | 대부분 자동, 고위험만 승인 | 65+ |
| **L4** | Full-Auto | 완전 자동 | 모두 자동, post-review | 85+ |

**기본값**: L2 (Semi-Auto) — "Safe Defaults" 원칙.

### Phase별 Gate Configuration

| 전이 | 자동 승인 레벨 | 비고 |
|------|:-------------:|------|
| idle → pm | L1+ | 낮은 문턱 |
| idle → plan | L1+ | 낮은 문턱 |
| pm → plan | L2+ | — |
| plan → design | L2+ | — |
| design → do | L2+ | — |
| do → check | **L3+** | 구현→검증 전환은 신중 |
| check → report | L2+ | — |
| report → archived | **L3+** | 아카이브는 신중 |
| git_push_force | **L4 only** | 최고 레벨만 |
| bash_dangerous | L2+ deny | L2 미만 전면 거부 |

### Emergency Stop / Resume

```javascript
automationController.emergencyStop("destructive operation blocked")
  → 현재 레벨 저장 (previousLevel)
  → L1으로 강제 하락
  → control-state.json: emergencyStop = true
  → audit log 기록

automationController.emergencyResume(previousLevel)
  → 이전 레벨 복원
  → emergencyStop = false
```

**설계 원칙**: "Always Interruptible" — 유저가 언제든 pause/stop 가능.

---

## 2. Trust Score Engine

### 소스: `lib/control/trust-engine.js`

### 6 Components (가중합 = 0-100)

| Component | Weight | 계산 | 의미 |
|-----------|:------:|------|------|
| pdcaCompletionRate | 0.25 | 완료된 PDCA / 시작된 PDCA | 프로세스 완수력 |
| gatePassRate | 0.20 | 통과 gate / 전체 gate | 품질 유지력 |
| rollbackFrequency | 0.15 | 1 - (rollback / transitions) | 안정성 (역수) |
| destructiveBlockRate | 0.15 | 차단된 파괴 / 시도된 파괴 | 안전 준수 |
| iterationEfficiency | 0.15 | 연속 성공 기반 (max 50) | 지속적 개선력 |
| userOverrideRate | 0.10 | 1 - (overrides / decisions) | AI 자율성 (역수) |

### Level 임계값

```
L0 → L1:  20점
L1 → L2:  40점
L2 → L3:  65점
L3 → L4:  85점
```

### Trust Events (점수 변동)

**긍정적**:

| Event | 점수 | 조건 |
|-------|:----:|------|
| consecutive_10_success | +5 | 10회 연속 성공 |
| match_rate_95 | +3 | matchRate >= 95% |
| 7_day_no_incident | +5 | 7일 무사고 |

**부정적**:

| Event | 점수 | 조건 |
|-------|:----:|------|
| emergency_stop | -15 | 긴급 정지 발동 |
| rollback | -10 | 롤백 실행 |
| guardrail_trigger | -10 | guardrail 작동 |
| user_interrupt | -5 | 유저 개입 |

### 레벨 변동 규칙

| 규칙 | 설명 |
|------|------|
| **Downgrade** | -15점 delta OR 현재 레벨 임계값 미달 → 즉시 하락 |
| **Upgrade** | 상위 임계값 도달 → 승격 (cooldown 30분) |
| **Cooldown** | 레벨 변경 후 30분간 추가 변경 불가 |

### 단방향 동기화

```
trust-engine.js (Source of Truth)
  → trust-profile.json (Trust Score 저장)
  → control-state.json (trustScore 필드만 동기화)
  → automation-controller.js (읽기만)
```

**순환 의존 방지**: trust → control 단방향. control은 trust를 읽기만 함.

---

## 3. Destructive Detection

### 소스: `lib/control/destructive-detector.js`

### 8 Guardrail Rules

| ID | Rule | Pattern | Severity | Default Action |
|----|------|---------|:--------:|:--------------:|
| G-001 | Recursive delete | `rm -rf`, `rm -r` | **critical** | deny |
| G-002 | Force push | `git push --force`, `-f` | **critical** | deny |
| G-003 | Hard reset | `git reset --hard` | high | ask |
| G-004 | Protected branch | `main`, `master`, `production` | high | ask |
| G-005 | Env file modification | `.env*` | high | ask |
| G-006 | Secret key access | `*.key`, `*.pem`, `*secret*` | high | ask |
| G-007 | Mass file deletion | `rm` with glob patterns | medium | ask |
| G-008 | Root directory ops | `/`, system dirs | **critical** | deny |

### Severity → Automation Level 매핑

| Severity | L0-L1 | L2 | L3 | L4 |
|----------|:-----:|:--:|:--:|:--:|
| **critical** | deny | deny | deny | ask |
| **high** | deny | ask | ask | allow |
| **medium** | ask | allow | allow | allow |

### Detection API

```javascript
const result = destructiveDetector.detect('Bash', { command: 'rm -rf /tmp/*' });
// { detected: true, rules: [{ id: 'G-001', severity: 'critical' }], confidence: 0.95 }
```

런타임 규칙 추가/비활성화 가능 → 프로젝트별 커스터마이징.

---

## 4. Blast Radius Analysis

### 소스: `lib/control/blast-radius.js`

### 6 Impact Rules

| ID | Rule | 조건 | Risk |
|----|------|------|:----:|
| B-001 | Large file change | 단일 파일 > 500줄 | medium |
| B-002 | Many files changed | 10+ 파일 동시 변경 | high |
| B-003 | Many new files | 세션 내 20+ 신규 파일 | high |
| B-004 | Dependency change | package.json, go.mod 등 | high |
| B-005 | DB migration/schema | migration, schema, .sql | **critical** |
| B-006 | Config change | tsconfig, eslint, vite.config 등 | medium |

### Dependency File Patterns

```
package.json, yarn.lock, pnpm-lock.yaml,
go.mod, go.sum, requirements.txt, Pipfile.lock,
Cargo.toml, Cargo.lock, Gemfile.lock, composer.lock
```

**활용**: blast radius가 high/critical이면 자동화 레벨에 따라 승인 요청 또는 차단.

---

## 5. Loop Breaker

### 소스: `lib/control/loop-breaker.js`

### 4 Detection Rules

| ID | Rule | Max | Warn At | Action |
|----|------|:---:|:-------:|--------|
| LB-001 | PDCA iteration loop | 5 | 3 | check→act→check 반복 |
| LB-002 | Same file edit loop | 10 | 7 | 같은 파일 반복 수정 |
| LB-003 | Agent recursion | 3 | 2 | A→B→A 재귀 패턴 |
| LB-004 | Error retry loop | 3 | 2 | 같은 에러 반복 |

**메모리 내 카운터**: 세션 시작 시 리셋. 에이전트 호출 스택 최대 100 (sliding window).

**에러 서명 정규화**: 에러 메시지 첫 200자로 동일 에러 식별.

**Superpowers의 3회 실패 규칙 vs bkit의 Loop Breaker**:
- Superpowers: 단일 규칙 (3회 수정 실패 → 아키텍처 문제)
- bkit: 4개 규칙 (PDCA/파일/에이전트/에러 각각 다른 임계값)

---

## 6. Scope Limiter

### 소스: `lib/control/scope-limiter.js`

### Level별 허용 범위

| Tier | Levels | 허용 디렉토리 | Max File Size | Max New Files |
|------|:------:|-------------|:-------------:|:-------------:|
| **Strict** | L0-L1 | `docs/`, `.bkit/` | 256KB | 5 |
| **Moderate** | L2 | `src/`, `lib/`, `docs/`, `test/`, `.bkit/` | 512KB | 10 |
| **Wide** | L3-L4 | 전체 | 1MB | 20 |

### Always-Denied Paths

```
.env*, *.key, *.pem, **/secrets/**, .git/**, node_modules/**
```

**보안 체크**: null byte 거부, path traversal 방지, symlink 검증.

---

## 7. Checkpoint / Rollback

### 소스: `lib/control/checkpoint-manager.js`

### Checkpoint 유형

| Type | 생성 시점 | 자동/수동 |
|------|----------|:--------:|
| `auto` | Phase 전이마다 | 자동 |
| `manual` | 유저 요청 | 수동 |
| `phase_transition` | Phase 전이 확인 | 자동 |
| `pre_destructive` | 파괴적 작업 직전 | 자동 |

### 저장 구조

```
.bkit/checkpoints/
├── index.json                    # 체크포인트 인덱스
├── cp-1712678400000.json         # 개별 체크포인트
├── cp-1712682000000.json
└── ...
```

### 체크포인트 내용

```json
{
  "id": "cp-1712678400000",
  "feature": "auth-system",
  "phase": "design",
  "type": "phase_transition",
  "timestamp": "2026-04-09T...",
  "pdcaStatus": { /* 전체 상태 스냅샷 */ },
  "integrity": "sha256:abc123...",
  "description": "Before design → do transition"
}
```

### 무결성 검증

**SHA-256 해시**: pdca-status 스냅샷의 해시를 저장 → 복원 시 검증 → 변조 감지.

### Pruning

| Type | Max Count | 설명 |
|------|:---------:|------|
| auto | 50 | 오래된 것부터 삭제 |
| manual | 20 | 오래된 것부터 삭제 |
| 전체 | 100MB | 총 크기 제한 |

### Rollback Skill (`/rollback`)

```
/rollback list          → 체크포인트 목록
/rollback to <id>       → 특정 체크포인트로 복원
/rollback phase         → 이전 PDCA phase로 복원
/rollback reset <feat>  → feature를 idle로 리셋
```

**철대 규칙**: 모든 rollback은 **L4에서도 유저 확인 필수**. 자동 롤백 없음.

---

## 8. Audit System

### 소스: `lib/audit/` (3 모듈)

### 8.1 audit-logger.js — JSONL 감사 로그

**저장**: `.bkit/audit/YYYY-MM-DD.jsonl` (일별 rotation, 30일 보존)

**16 Action Types**:

```
phase_transition, feature_created, file_created, config_changed,
rollback_executed, agent_spawned, agent_completed, agent_failed,
gate_passed, gate_failed, destructive_blocked, command_executed,
checkpoint_created, trust_changed, permission_granted, permission_denied
```

**6 Categories**: pdca, file, config, control, team, quality

**Entry 형식**:

```json
{
  "actor": "hook",
  "actorId": "unified-bash-pre",
  "action": "destructive_blocked",
  "category": "control",
  "target": "rm -rf /path/*",
  "result": "blocked",
  "details": { "rules": ["G-001"] },
  "timestamp": "2026-04-09T10:30:00Z"
}
```

**카테고리별 편의 함수**: `logControl()`, `logPdca()`, `logTrust()`, `logCheckpoint()`, `logPermission()`, `logSystem()`

### 8.2 decision-tracer.js — 의사결정 추적

**저장**: `.bkit/decisions/YYYY-MM-DD.jsonl`

**15 Decision Types**:

```
phase_advance, iteration_continue, automation_escalation,
file_generation, architecture_choice, error_recovery,
rollback_trigger, gate_override, agent_selection,
workflow_selection, quality_gate_result, trust_level_change,
scope_expansion, destructive_approval, emergency_stop
```

**Entry 형식**:

```json
{
  "feature": "auth",
  "type": "phase_advance",
  "phase": "check",
  "question": "Should advance to report?",
  "chosen": "iterate",
  "alternatives": ["force_report", "abandon"],
  "rationale": "matchRate 78% < threshold 90%",
  "confidence": 0.95,
  "impact": "medium",
  "reversible": true
}
```

**추적 기준**: design/check phase에서는 항상, Write/Edit/Bash는 do phase에서, Agent/Skill은 항상.

### 8.3 explanation-generator.js — 결정 설명 생성

3 detail levels:

| Level | 용도 | 예시 |
|-------|------|------|
| **brief** | 1문장 | "Chose to iterate because matchRate 78% < 90%" |
| **normal** | 1문단 | + alternatives + rationale |
| **detailed** | 전체 trace | + affected files + impact + reversibility |

**CLI 표시 형식**: `10:30:15 | phase_advance [HIGH] | "iterate" (95%)`

---

## 9. Quality Metrics System

### 소스: `lib/quality/metrics-collector.js`

### 15 Metrics (M1-M15)

| ID | Metric | Source | Direction |
|----|--------|--------|:---------:|
| M1 | Match Rate (%) | gap-detector | higher ↑ |
| M2 | Code Quality (0-100) | code-analyzer | higher ↑ |
| M3 | Critical Issues | code-analyzer | lower ↓ |
| M4 | API Compliance (%) | gap-detector | higher ↑ |
| M5 | Runtime Error Rate (%) | qa-monitor | lower ↓ |
| M6 | P95 Response Time (ms) | qa-monitor | lower ↓ |
| M7 | Convention Compliance (%) | code-analyzer | higher ↑ |
| M8 | Design Completeness (0-100) | design-validator | higher ↑ |
| M9 | Iteration Efficiency (%p/iter) | pdca-iterator | higher ↑ |
| M10 | Cycle Time (hours) | computed | lower ↓ |
| M11 | QA Pass Rate (%) | qa-lead | higher ↑ |
| M12 | Test Coverage L1 (%) | qa-test-generator | higher ↑ |
| M13 | E2E Scenario Coverage (%) | qa-lead | higher ↑ |
| M14 | Runtime Error Count | qa-debug-analyst | lower ↓ |
| M15 | Data Flow Integrity (%) | qa-lead | higher ↑ |

### Trend Analysis — 6 Alarm Conditions

| # | 조건 | 설명 |
|---|------|------|
| 1 | matchRate 3회 연속 하락 | 설계-구현 품질 악화 |
| 2 | Critical issues 2+ 연속 | 치명 이슈 반복 |
| 3 | Quality score 이동평균 < 75 | 전반적 품질 저하 |
| 4 | Iteration efficiency < 3%p | 반복 효율 저하 |
| 5 | Cycle time > 150% (4hr 기준) | 시간 초과 |
| 6 | Convention compliance 10%p 하락 | 컨벤션 준수 급락 |

### Schema Bridge

```javascript
METRIC_ID_TO_GATE_NAME = {
  M1: 'matchRate', M2: 'codeQualityScore', M3: 'criticalIssueCount',
  M4: 'apiComplianceRate', M5: 'runtimeErrorRate', ...
}
```

metrics-collector → gate-manager 간 메트릭 ID 변환.

---

## 10. Regression Guard

### 소스: `lib/quality/regression-guard.js`

### Rule 구조

```json
{
  "id": "RR-001",
  "category": "api",
  "severity": "critical",
  "detection": {
    "type": "pattern",
    "pattern": "hardcoded.*password"
  },
  "detectionInFeature": "auth-system",
  "autoGenerated": true,
  "violations": 3
}
```

### 자동 규칙 생성

```
pdca-iterator 수정 결과
  → addRulesFromIteratorResult(result, feature)
  → 수정된 이슈를 regression rule로 자동 등록
  → 이후 같은 패턴 재발 시 감지
```

### Stale Rule Pruning

```
violations === 0 && age > 90일 → 자동 삭제
violations > 0 → 보존 (활성 위협)
Max rules: 200개 (초과 시 pruning 권장)
```

---

## 11. Control Skill (`/control`)

### User-Facing Commands

```
/control               → 현재 상태 표시
/control status        → 자동화 레벨 + Trust Score + Guardrails
/control level <0-4>   → 레벨 수동 설정
/control pause         → 모든 자동화 중지 (L0으로)
/control resume        → 이전 레벨 복원
/control trust         → Trust Score 상세 분석
```

### 8 Active Guardrails

```
1. Destructive Detection (G-001~G-008)
2. Blast Radius Limiter (B-001~B-006)
3. Loop Breaker (LB-001~LB-004)
4. Checkpoint Auto-Creation
5. Permission Escalation Gate
6. Stale Feature Timeout (7일)
7. Context Overflow Protection
8. Concurrent Write Lock
```

---

## 12. Superpowers vs bkit Safety 비교

| 측면 | Superpowers | bkit |
|------|-------------|------|
| **자동화 레벨** | 없음 (항상 강제) | L0-L4 5단계 |
| **Trust Score** | 없음 | 6 components, 0-100 |
| **파괴적 작업 차단** | 스킬 내 가이드만 | 8 rules + PreToolUse 차단 |
| **Blast Radius** | 없음 | 6 impact rules |
| **Loop Prevention** | 3회 실패 규칙 (1개) | 4 detection rules |
| **Checkpoint** | git worktree 격리 | SHA-256 verified snapshots |
| **Rollback** | git 기반 (수동) | `/rollback` skill (유저 확인 필수) |
| **Audit** | 없음 | JSONL daily logs + decision trace |
| **Regression** | 없음 | auto-generated rules |
| **Emergency Stop** | 없음 | L1 강제 하락 + 복원 |

---

## 13. 하네스 설계 시사점

### 13.1 Progressive Automation의 가치

L0-L4 시스템은 "유저 신뢰를 점진적으로 획득"하는 설계:
- 처음은 L2 (안전한 기본값)
- 성공 → Trust Score 상승 → 자동화 확대
- 실패 → Trust Score 하락 → 자동화 축소

**하네스 적용**: 최소 L0/L2/L4 3단계. Trust Score는 선택적.

### 13.2 Guardrail-as-Code

파괴적 작업 차단이 **규칙 테이블**로 정의:
- 추가/제거/비활성화 가능
- 프로젝트별 커스터마이징
- 감사 추적

**하네스 적용**: guardrail 규칙을 config로 관리. 하드코딩 금지.

### 13.3 Checkpoint 자동화

Phase 전이마다 자동 checkpoint + SHA-256 무결성:
- 장점: 언제든 안전하게 rollback
- 단점: 저장 공간 (100MB 제한)

**하네스 적용**: git commit 기반 checkpoint가 더 실용적 (저장 공간 무관, diff 가시성).

### 13.4 Audit Trail 필수성

bkit의 JSONL audit + decision trace는 "Full Visibility" 원칙의 구현.
모든 AI 결정을 추적 가능하게 만드는 것은 신뢰의 기반.

**하네스 적용**: audit 최소 2개 — action log (무엇을 했는가) + decision trace (왜 했는가).

### 13.5 Trend Analysis

6개 alarm condition으로 품질 악화를 조기 감지하는 패턴은 독창적.
하지만 히스토리가 충분히 쌓여야 의미 있음 (최소 10+ cycles).

**하네스 적용**: 초기에는 단순 임계값 체크, 히스토리 축적 후 trend analysis 도입.

### 13.6 "Always Interruptible" 원칙

Emergency stop + pause/resume + rollback 확인 필수:
- L4에서도 rollback은 유저 확인
- 유저가 항상 최종 결정권

**하네스 적용**: 파괴적/비가역적 작업은 어떤 자동화 레벨에서도 유저 확인 필수.

---

**다음 단계**: Step 7 — Evals and Testing (Skill evals, A/B testing, 4028 TC) deep dive
