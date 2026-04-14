# bkit - Hooks and Scripts

> 6-layer hook system, 21 hook events, 42+ scripts, hook-automation-FSM 연결 deep dive

---

## 1. 6-Layer Hook System

### Layer 구조

| Layer | 소스 | 역할 | 예시 |
|:-----:|------|------|------|
| 1 | `hooks/hooks.json` (Global) | 전역 hook 이벤트 정의 | SessionStart, PreToolUse, Stop |
| 2 | Skill Frontmatter | 스킬별 hook (deprecated → Layer 1로 이관) | PreToolUse, PostToolUse, Stop |
| 3 | Agent Frontmatter | 에이전트별 hook + 제약 | disallowedTools로 간접 제어 |
| 4 | Description Triggers | 8개 언어 semantic matching | "갭 분석" → gap-detector |
| 5 | Scripts (42+ modules) | Node.js 실행 로직 | session-start.js, unified-stop.js |
| 6 | Plugin Data Backup | `${CLAUDE_PLUGIN_DATA}` 영속 상태 | pdca-status.json 백업/복원 |

### Superpowers와의 차이

| 측면 | Superpowers | bkit |
|------|-------------|------|
| **Hook 이벤트** | SessionStart만 활용 | 21 이벤트 전체 활용 |
| **스크립트 언어** | Bash (zero-dep) | Node.js (607 함수 의존) |
| **상태 관리** | 없음 | 6-layer 상태 관리 |
| **복잡도** | 1 hook → 1 shell script | 21 hooks → 42+ scripts → 84 lib modules |

---

## 2. Hook Events (21)

### 전체 이벤트 맵

| # | Event | Timing | Script | 핵심 역할 |
|---|-------|--------|--------|----------|
| 1 | **SessionStart** | 세션 시작 | `session-start.js` | 초기화, 대시보드, stale 감지 |
| 2 | **PreToolUse** (Write\|Edit) | 파일 쓰기 전 | `pre-write.js` | PDCA 가이드, convention hint |
| 3 | **PreToolUse** (Bash) | 명령 실행 전 | `unified-bash-pre.js` | 파괴적 작업 차단, 범위 제한 |
| 4 | **PostToolUse** (Write) | 파일 쓰기 후 | post-write script | gap analysis 제안 |
| 5 | **PostToolUse** (Bash) | 명령 실행 후 | `unified-bash-post.js` | QA 추적, loop 감지 |
| 6 | **PostToolUse** (Skill) | 스킬 실행 후 | skill post handler | — |
| 7 | **Stop** | 턴 종료 | `unified-stop.js` | **핵심**: phase 전이, gate 평가, checkpoint |
| 8 | **StopFailure** | API 에러 | `stop-failure-handler.js` | 에러 분류, 긴급 백업, 복구 가이드 |
| 9 | **UserPromptSubmit** | 유저 입력 | `user-prompt-handler.js` | intent 감지, 트리거 매칭 |
| 10 | **PreCompact** | 컨텍스트 압축 전 | `context-compaction.js` | PDCA 스냅샷 저장 |
| 11 | **PostCompact** | 컨텍스트 압축 후 | `post-compaction.js` | 상태 무결성 검증 |
| 12 | **TaskCompleted** | 태스크 완료 | `pdca-task-completed.js` | PDCA 자동 진행, 팀 할당 |
| 13 | **SubagentStart** | 서브에이전트 시작 | `subagent-start-handler.js` | 팀원 등록 |
| 14 | **SubagentStop** | 서브에이전트 종료 | `subagent-stop-handler.js` | 상태 갱신, 진행률 추적 |
| 15 | **TeammateIdle** | 팀원 유휴 | `team-idle-handler.js` | 다음 태스크 할당 |
| 16 | **SessionEnd** | 세션 종료 | `session-end-handler.js` | 백업, 히스토리, 정리 |
| 17 | **PostToolUseFailure** | 도구 실행 실패 | failure handler | 에러 복구 |
| 18 | **InstructionsLoaded** | 지시사항 로드 | instructions handler | — |
| 19 | **ConfigChange** | 설정 변경 감지 | config handler | — |
| 20 | **TaskCreated** | 태스크 생성 | `task-created-handler.js` | PDCA 네이밍 검증, 감사 |
| 21 | **FileChanged** | 파일 변경 | `file-changed-handler.js` | 설계 문서 변경 → gap-detector 제안 |

### Hook I/O 패턴

```javascript
// 입력: Claude Code가 stdin으로 JSON 전달
const input = readStdinSync();
const { toolName, filePath, content, command } = parseHookInput(input);

// 출력: 3가지 선택
outputAllow(context, hookEvent);  // 허용 + 컨텍스트 주입
outputBlock(reason);               // 차단 + 사유
outputEmpty();                     // 무시 (silent pass)
```

---

## 3. 핵심 Scripts 상세

### 3.1 session-start.js — 세션 초기화

**실행 시점**: SessionStart hook

**처리 순서**:
1. Migration (레거시 상태 마이그레이션)
2. Restore (Plugin Data에서 상태 복원)
3. Context Init (PDCA 컨텍스트 초기화)
4. Onboarding (첫 사용자 안내)
5. Dashboard Build:
   - Progress bar (PDCA 진행률)
   - Workflow map (현재 Phase 시각화)
   - Impact view (변경 영향 범위)
   - Agent panel (활성 에이전트)
   - Control panel (자동화 레벨, Trust Score)
6. Stale feature detection (7일 초과)
7. Session title 생성 (PDCA phase 컨텍스트)

### 3.2 unified-stop.js — 턴 종료 (가장 복잡)

**실행 시점**: Stop hook — **모든 AI 턴 종료마다 실행**

**핵심 처리**:

```
1. Context Detection
   → 활성 skill/agent 감지 (context, tool_input, session에서)

2. Handler Registry
   → 15+ skills + 8+ agents의 stop handler 매핑
   → 해당 handler 실행

3. v2.0.0 통합 (Phase 전이 시):
   ├── Checkpoint 생성 (rollback 용)
   ├── Quality Gate 평가 (M1-M10 메트릭)
   │   → gate verdict: pass/retry/fail
   ├── State Machine 전이 (FSM, gate verdict 기반)
   ├── Workflow Engine 진행
   ├── Circuit Breaker 기록 (성공/실패)
   ├── Trust Engine 이벤트 기록
   │   → pdca_complete, gate_pass, gate_fail
   │   → control-state.json에 동기화
   ├── Quality History 추가
   ├── Regression Detection (Check phase)
   ├── Trend Analysis + 알람
   └── Audit Logging (decision trace + explanation)
```

**핵심**: unified-stop.js가 **PDCA 자동화의 중추**. 모든 턴 종료마다 상태 전이 가능성을 평가하고, quality gate를 통과하면 자동 진행.

### 3.3 user-prompt-handler.js — 유저 입력 처리

**실행 시점**: UserPromptSubmit hook

```
유저 입력
  → New feature intent detection (confidence)
  → Implicit agent trigger matching (8 languages)
  → Implicit skill trigger matching
  → CC command detection (/simplify, /batch)
  → Ambiguity scoring
    → shouldClarify? → clarifying questions 생성
  → Team mode auto-suggestion (Dynamic/Enterprise)
  → Skill/agent import resolution
  → Session title 갱신
```

### 3.4 unified-bash-pre.js — Bash 사전 검증

**실행 시점**: PreToolUse (Bash)

**차단 규칙**:

| ID | Rule | Severity | Action |
|----|------|----------|--------|
| G-001 | Recursive delete (`rm -rf`) | critical | **deny** |
| G-002 | Force push (`git push --force`) | critical | **deny** |
| G-003 | Hard reset (`git reset --hard`) | high | ask |
| G-004 | Protected branch modification | high | ask |
| G-005 | Environment file modification | high | ask |
| G-006 | Secret key access | high | ask |
| G-007 | Mass file deletion | medium | ask |
| G-008 | Root directory operations | critical | **deny** |

**Phase 9 추가 차단**: `kubectl delete`, `terraform destroy`, `helm uninstall`, `--force`, production 키워드.

**Automation Level별 처리**:

```
L0-L1: critical → deny, high → deny, medium → ask
L2:    critical → deny, high → ask,  medium → allow
L3:    critical → deny, high → ask,  medium → allow
L4:    critical → ask,  high → allow, medium → allow
```

### 3.5 pdca-task-completed.js — PDCA 자동 진행

**실행 시점**: TaskCompleted hook

```
태스크 완료
  → 태스크 subject에서 PDCA phase 감지: [Plan], [Design], [Do], [Check]
  → feature name 추출
  → shouldAutoAdvance(phase, level) 체크
    → L2+: 대부분 자동 진행
    → L0-L1: Executive Summary + 유저 질문
  → autoAdvancePdcaPhase(feature, phase)
    → State Machine 전이
    → Actions: recordTimestamp, createCheckpoint, notifyPhaseComplete
  → Team Mode: assignNextTeammateWork(fromPhase, feature, level)
  → Manual Mode: AskUserQuestion (plan/report 완료 시)
```

### 3.6 context-compaction.js / post-compaction.js — 컨텍스트 보존

**PreCompact**: PDCA 상태 스냅샷 저장 (마지막 10개 유지)

**PostCompact**: 
- pdca-status.json 무결성 검증
- 손실 시 Plugin Data 백업에서 복원
- Feature count 변화 감지 (delta)

**Superpowers에 없는 기능**: Superpowers는 context compaction 대응이 없음. bkit은 상태 손실을 방지.

### 3.7 stop-failure-handler.js — API 에러 복구

**에러 분류**:

| Type | 원인 | 복구 가이드 |
|------|------|-----------|
| `rate_limit` | API 제한 초과 | 30-60초 대기 후 재시도 |
| `auth_failure` | 인증 실패 | API key 확인 |
| `server_error` | 서버 에러 | 재시도 |
| `overloaded` | 서버 과부하 | 대기 후 재시도 |
| `timeout` | 타임아웃 | 재시도 |
| `context_overflow` | 컨텍스트 초과 | `/clear` + reload |
| `unknown` | 알 수 없음 | `claude doctor` 실행 |

모든 에러 시 **긴급 PDCA 백업** 실행.

---

## 4. Hook → Automation → FSM 연결 흐름

### 전체 Control Flow

```
                    ┌──────────────────────────────┐
                    │     UserPromptSubmit          │
                    │  intent detection + triggers  │
                    └──────────┬───────────────────┘
                               │
                    ┌──────────▼───────────────────┐
                    │     PreToolUse                │
                    │  destructive detection        │
                    │  scope limiter                │
                    │  PDCA guidance                │
                    └──────────┬───────────────────┘
                               │
                    ┌──────────▼───────────────────┐
                    │     Tool Execution            │
                    └──────────┬───────────────────┘
                               │
                    ┌──────────▼───────────────────┐
                    │     PostToolUse               │
                    │  QA tracking                  │
                    │  loop detection               │
                    └──────────┬───────────────────┘
                               │
                    ┌──────────▼───────────────────┐
                    │     Stop (unified-stop.js)    │
                    │  ┌─────────────────────────┐  │
                    │  │ Quality Gate Evaluation  │  │
                    │  │ M1-M10 metrics check     │  │
                    │  └────────┬────────────────┘  │
                    │           │                    │
                    │  ┌────────▼────────────────┐  │
                    │  │ State Machine Transition │  │
                    │  │ guard check → action     │  │
                    │  └────────┬────────────────┘  │
                    │           │                    │
                    │  ┌────────▼────────────────┐  │
                    │  │ Trust Engine Update      │  │
                    │  │ Circuit Breaker Record   │  │
                    │  │ Audit Log                │  │
                    │  └─────────────────────────┘  │
                    └──────────┬───────────────────┘
                               │
                    ┌──────────▼───────────────────┐
                    │     TaskCompleted             │
                    │  auto-advance → next phase    │
                    │  team assignment              │
                    └──────────────────────────────┘
```

### 구체적 시나리오: L2에서 Design → Do 전이

```
1. 유저가 design 문서 작성 (Write tool)
   → PreToolUse(Write): pre-write.js
     → task classification: "feature"
     → convention hint 출력
     → outputAllow()

2. 파일 저장 완료
   → PostToolUse(Write): gap analysis 제안 (design doc이므로)

3. 턴 종료
   → Stop: unified-stop.js
     → active skill: pdca (design phase)
     → Quality Gate: design gate 평가
       → designCompleteness 체크
       → verdict: pass
     → State Machine: design → do (DESIGN_APPROVED event)
       → guard: guardDesignApproved() → PASS (L2+ auto-approve)
       → actions: recordTimestamp, createCheckpoint, notifyPhaseComplete
     → Trust Engine: gate_pass 이벤트 기록
     → Audit: phase_transition logged

4. TaskCompleted hook
   → phase: "design" 감지
   → shouldAutoAdvance('design') at L2 → YES
   → autoAdvancePdcaPhase('auth', 'design')
   → Team Mode: Do phase 팀 구성 (swarm 패턴)
   → 출력: "PDCA auto-advance: design → do"
```

---

## 5. State File Architecture

### .bkit/ 디렉토리 구조

```
.bkit/
├── state/
│   ├── pdca-status.json          # Feature별 PDCA 상태
│   ├── memory.json               # 세션 간 메모리
│   └── workflow-state/           # 워크플로우 상태
├── runtime/
│   ├── agent-state.json          # 팀 런타임 상태
│   ├── control-state.json        # 자동화 레벨 + Trust Score
│   ├── error-log.json            # 에러 로그 (최근 50)
│   └── session-history.json      # 세션 히스토리 (최근 20)
├── audit/
│   └── YYYY-MM-DD.jsonl          # 일별 감사 로그
├── decisions/                    # 의사결정 추적
├── checkpoints/                  # Phase별 체크포인트
├── context/                      # Living Context (v3.0.0)
│   ├── invariants               # 불변 규칙
│   ├── impact-map               # 영향 맵
│   └── incident-memory          # 인시던트 기억
└── quality/
    ├── metrics.json              # 품질 메트릭
    ├── history.json              # 품질 히스토리
    └── regression-rules.json     # 회귀 규칙
```

### Plugin Data 백업

```
${CLAUDE_PLUGIN_DATA}/
├── pdca-status.json              # 핵심 상태 백업
├── trust-profile.json            # Trust Score 백업
├── session-history.json          # 세션 히스토리 백업
└── snapshots/                    # 컨텍스트 압축 스냅샷 (최근 10)
```

**Project Identity Guard**: 백업 복원 시 프로젝트 경로 확인 → 다른 프로젝트의 상태가 복원되는 것 방지.

---

## 6. lib/core 인프라

### io.js — Hook I/O 표준

| Function | 역할 |
|----------|------|
| `readStdinSync()` | stdin에서 JSON 동기 읽기 |
| `parseHookInput(input)` | toolName, filePath, content, command 추출 |
| `outputAllow(context, hookEvent)` | 허용 + 컨텍스트 주입 |
| `outputBlock(reason)` | 차단 + 사유 |
| `outputEmpty()` | 무시 (silent) |
| `truncateContext(ctx, 500)` | 컨텍스트 500자 제한 |
| `xmlSafeOutput(content)` | XML 특수문자 이스케이프 |

### paths.js — 중앙 경로 레지스트리

모든 상태 파일 경로가 `STATE_PATHS` 객체에 집중:

```javascript
STATE_PATHS.pdcaStatus()    // .bkit/state/pdca-status.json
STATE_PATHS.agentState()    // .bkit/runtime/agent-state.json
STATE_PATHS.controlState()  // .bkit/runtime/control-state.json
STATE_PATHS.auditDir()      // .bkit/audit/
STATE_PATHS.checkpointsDir() // .bkit/checkpoints/
```

**설계 원칙**: 경로 하드코딩 금지 → `STATE_PATHS`를 통해서만 접근.

---

## 7. Superpowers vs bkit Hook 비교

| 측면 | Superpowers | bkit |
|------|-------------|------|
| **Hook 이벤트** | SessionStart 1개 | 21개 전체 활용 |
| **스크립트** | 1 shell script per platform | 42+ Node.js modules |
| **목적** | 스킬 주입 (bootstrap) | 전체 PDCA 라이프사이클 관리 |
| **파괴적 작업 차단** | 없음 (스킬에서 가이드) | 8 guardrail rules (G-001~G-008) |
| **상태 보존** | 없음 | PreCompact/PostCompact 스냅샷 |
| **에러 복구** | 없음 | StopFailure 분류 + 긴급 백업 |
| **팀 관리** | 없음 | SubagentStart/Stop/TeammateIdle |
| **감사** | 없음 | 일별 JSONL audit trail |
| **의존성** | bash only | Node.js + 84 lib modules |

---

## 8. 하네스 설계 시사점

### 8.1 Hook 활용 범위

bkit은 Claude Code의 21개 hook을 **거의 모두** 활용. 특히:
- **PreToolUse**: 파괴적 작업 차단 — 하네스 필수 기능
- **Stop**: 자동 phase 전이 — 워크플로우 자동화의 핵심
- **PreCompact/PostCompact**: 상태 보존 — 상태 관리 시 필수

**하네스 적용**: 최소 SessionStart + PreToolUse(Bash) + Stop + PreCompact 4개는 반드시 활용.

### 8.2 unified-stop 패턴

모든 skill/agent의 stop handler를 하나의 스크립트에 통합:
- 장점: 중앙 집중, quality gate/FSM/audit 일관 적용
- 단점: 단일 스크립트가 너무 복잡 (가장 큰 스크립트)

**하네스 적용**: stop handler 통합은 유지하되, 내부를 모듈화하여 복잡도 관리.

### 8.3 Destructive Detection as PreToolUse

파괴적 작업 차단을 PreToolUse에서 하는 것은 최적의 타이밍:
- 실행 **전에** 차단 → 피해 방지
- Confidence scoring → false positive 최소화
- Automation level별 차등 적용

**하네스 적용**: G-001 ~ G-008 수준의 guardrail 규칙 세트 정의 필수.

### 8.4 Context Compaction 대응

bkit의 PreCompact/PostCompact 패턴은 독창적:
- 컨텍스트 압축 전 스냅샷 → 압축 후 검증 → 손실 시 복원
- Superpowers는 이 문제를 전혀 다루지 않음

**하네스 적용**: 상태 관리를 한다면 compaction 대응 필수.

### 8.5 복잡도 경고

bkit의 hook 시스템은 **42+ scripts → 84 lib modules → 607 exports** 규모.
이 복잡도가 유지보수를 어렵게 할 수 있음.

**하네스 적용**: 핵심 hook만 선택 (4-6개), 스크립트는 최소화, lib 의존 제한.

---

**다음 단계**: Step 6 — Automation and Safety (L0-L4, Trust Score, destructive detection, checkpoint) deep dive
