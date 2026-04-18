# 10. State & Audit — 상태 관리 & 관측성

> **반복 등장 용어:** `Event Sourcing`(이벤트 스트림을 append하고 fold하여 현재 상태를 도출하는 패턴), `Single Writer`(`.harness/state/` 쓰기를 단일 경로로 일원화하는 동시성 모델), `Audit Log`(자동 판단의 역추적용 append-only JSONL), `Trace Stream`(session-scoped 런타임 메커니즘 트레이스). 표준 정의는 [00-overview.md#용어집](00-overview.md#용어집-glossary).

---

## 1. 상태 관리 개요

하네스의 모든 상태는 `.harness/state/` 디렉토리에 저장된다. 이 디렉토리는 **하네스 스크립트만 수정 가능** (유저·에이전트 직접 수정 차단 — Safety Layer).

```
.harness/state/
├── workflow.json              ← 현재 상태 snapshot (fold 결과)
├── coverage.json              ← Spec↔Test (AC) 매핑 현황
├── coverage-report.json       ← 다축 Coverage 통합 레포트
├── coverage-trend.json        ← 이터레이션별 각 축 값 추이
├── qa-attribution.json        ← QA Stack 실패 귀인 리포트
├── events/                    ← Event stream (feature lifecycle, append-only)
│   └── {domain}/{feature}/
│       └── {YYYY-MM}.jsonl
├── traces/                    ← Trace stream (session 런타임 메커니즘, append-only)
│   └── {session_id}.jsonl
├── snapshots/                 ← Aggregate별 상태 snapshot (성능용)
│   └── {domain}/{feature}.json
├── audit.jsonl                ← 자동 판단 감사 로그
├── audit-{YYYY-MM}.jsonl      ← 회전된 과거 로그
├── escalations.jsonl          ← Saga 보상 실패 유저 개입 큐
├── incidents/                 ← Deploy 이후 실패 기록
│   └── {YYYY-MM-DD}-{slug}.md
└── index.json                 ← stream 목록 · 최신 seq 번호
```

### 1.1 3개 이벤트 스트림의 역할 구분

하네스는 세 개의 **orthogonal한 append-only JSONL 스트림**으로 관측성을 구성한다. 같은 물리적 사건이라도 다른 층위에서 기록된다.

| 스트림 | 목적 | 위치 | Writer | 단위 |
|---|---|---|---|---|
| **Audit Log** | 자동 판단 이력 (왜 이 결정이 내려졌나) | `audit.jsonl` | `audit-append.mjs` | 정책 판단 |
| **Event Stream** | Feature 라이프사이클 (어떤 phase를 거쳤나) | `events/{domain}/{feature}/{YYYY-MM}.jsonl` | `event-emit.mjs` | 도메인 집계 |
| **Trace Stream** | 런타임 메커니즘 (무엇이 발화했나) | `traces/{session_id}.jsonl` | `trace-emit.mjs` | 세션 타임라인 |

**같은 사건이 각 스트림에 다르게 기록되는 예시** — "auth/login feature의 spec이 만들어짐":

```jsonc
// audit.jsonl (정책)
{ "event": "spec_validated", "rule_id": "spec:testable-check", "decision": "pass" }

// events/auth/login/2026-04.jsonl (도메인)
{ "type": "SpecCreated", "payload": { "domain": "auth", "feature": "login" } }

// traces/session-abc123.jsonl (메커니즘)
{ "kind": "tool_pre", "tool": "Write", "data": { "path": ".harness/specs/auth/login.spec.yaml" } }
```

**설계 원칙:**

- **snapshot fold 대상은 event뿐** — audit와 trace는 append 전용, fold로 workflow.json을 재구성하지 않음
- **trace는 session 단위** — 세션 종료 시 독립 파일로 완결. 도메인 집계나 정책 추적과 무관
- **셋 다 Event Sourcing 철학 공유** — append-only, `v` 필드 + upcaster, flock 직렬화

---

## 2. Event Sourcing 모델

### 2.1 이벤트 → Snapshot 아키텍처

하네스는 Event Sourcing의 개념을 **프레임워크 없이** 파일시스템 레벨로 차용한다:

```
이벤트 발생 (skill 실행, hook 차단, audit 기록)
  │
  ├── 1. event-emit.mjs로 이벤트를 events/{domain}/{feature}/{YYYY-MM}.jsonl 에 append
  │      호출: stdin JSON 또는 CLI args (--type, --domain, --feature)
  │
  ├── 2. snapshot(workflow.json, coverage.json 등) 갱신
  │      → snapshot은 events의 fold 결과. 성능을 위한 캐시.
  │
  └── 3. snapshot 손상/버전 불일치 시
         → events 를 처음부터 replay → snapshot 재구축
```

**Snapshot은 캐시다.** events가 Source of Truth이고, snapshot은 events를 fold한 결과물. 따라서 snapshot이 손상되더라도 events에서 **항상 재구축 가능**.

### 2.2 이벤트 레코드 공통 스키마

모든 이벤트 레코드가 따르는 최소 스키마:

```jsonc
{
  "type": "QAPassed",                      // 이벤트 타입
  "v": 3,                                  // 스키마 버전 (아래 §2.3 Upcaster)
  "ts": "2026-04-14T10:23:45.123Z",       // 타임스탬프
  "payload": {                             // 타입별 페이로드
    "domain": "auth",
    "feature": "login",
    "coverage": { "line": 85, "branch": 72 }
  },
  "producer": "harness:qa"                 // 발행 주체 (스킬 or hook)
}
```

### 2.3 스키마 진화 — Upcaster

하네스 버전업 시 기존 이벤트 스키마와 충돌하는 문제를 **읽을 때 변환 (Schema on Read)** 으로 해결한다.

**`scripts/state/upcaster.mjs`:**

```javascript
// 이벤트 타입별 upcaster 체인. 각 함수는 한 버전씩만 올린다.
export const upcasters = {
  QAPassed: [
    // v1 → v2: duration_ms 필드 추가
    (e) => ({ ...e, v: 2, duration_ms: e.duration_ms ?? null }),
    // v2 → v3: agent_id 필드 추가
    (e) => ({ ...e, v: 3, agent_id: e.agent_id ?? "unknown" }),
  ],
};

// 사용: 이벤트를 읽을 때 항상 최신 스키마로 변환
export function upcast(event) {
  const chain = upcasters[event.type] ?? [];
  let cur = event;
  const from = (cur.v ?? 1) - 1;
  for (let i = from; i < chain.length; i++) cur = chain[i](cur);
  return cur;
}
```

**Upcaster 규칙:**

| # | 규칙 | 이유 |
|---|------|------|
| 1 | 이벤트는 **쓸 때 최신 버전**으로 기록 | 구버전 쓰면 upcaster 체인이 길어짐 |
| 2 | Upcaster는 **한 버전씩만** 올린다 | 점프 변환은 유지보수 불가 |
| 3 | 읽기 전 **반드시** `upcast()` 경유 | 소비자는 항상 최신 스키마를 본다 |
| 4 | **필드 추가**는 default 주입 (additive 우선) | 가장 안전한 변경 |
| 5 | 필드 **삭제·이름변경**은 upcaster 필수 | additive 아니면 읽기 호환 책임 |
| 6 | **이벤트 타입 삭제** 금지 | 과거 로그 replay 불가 — deprecated 태그만 |
| 7 | Snapshot도 **`v` 필드** 보유 | 구버전 스냅샷은 discard → events에서 rebuild |

---

## 3. State 파일 스키마

### 3.1 workflow.json — 워크플로우 상태 snapshot

모든 feature의 현재 워크플로우 상태를 담는 **fold 결과물**.

```jsonc
{
  "v": 1,
  "session": {
    "mode": "standard",           // standard | prototype | explore
    "started_at": "2026-04-14T09:00:00Z",
    "right_size": "medium"        // small | medium | large
  },
  "features": {
    "auth/login": {
      "phase": "implement",       // brainstorm|scope|spec|architect|plan|implement|review|qa|deploy
      "gates_passed": {
        "g1_spec": true,
        "g2_plan": true,
        "g3_test": false,
        "g4_qa": false
      },
      "implement": {
        "passed": false,
        "iteration": 2
      },
      "review": {
        "passed": false
      },
      "qa": {
        "passed": false
      }
    }
  },
  "bypass_budgets": {             // Escape Hatch 잔량 (03-workflow.md §1.9)
    "gate": { "used": 1, "max": 3 },
    "review": { "used": 0, "max": 3 },
    "qa": { "used": 0, "max": 3 }
  },
  "active_worktrees": [],         // 현재 실행 중인 병렬 worktree
  "last_updated": "2026-04-14T10:30:00Z"
}
```

**갱신 시점:** `scripts/state/update-workflow.mjs`가 Stop Hook에서 갱신.

### 3.2 coverage.json — Spec↔Test AC 매핑

```jsonc
{
  "v": 1,
  "features": {
    "auth/login": {
      "spec_id": "SPEC-auth-login",
      "acs": {
        "AC-001": {
          "condition": "유효한 이메일+비밀번호 → JWT 토큰 반환",
          "test_file": "tests/api/auth.test.ts",
          "test_name": "should return JWT for valid credentials",
          "status": "covered"     // covered | uncovered | partial
        },
        "AC-002": {
          "condition": "잘못된 비밀번호 → 401",
          "test_file": "tests/api/auth.test.ts",
          "test_name": "should return 401 for invalid password",
          "status": "covered"
        }
      }
    }
  }
}
```

### 3.3 coverage-report.json — 다축 Coverage 통합

```jsonc
{
  "v": 1,
  "feature": "auth/login",
  "axes": {
    "line": { "value": 85, "min": 80, "pass": true },
    "branch": { "value": 72, "min": 70, "pass": true },
    "mutation": { "value": null, "min": null, "pass": null },
    "ac": { "value": 100, "min": 100, "pass": true },
    "boundary": { "value": 80, "min": 60, "pass": true },
    "error_path": { "value": 75, "min": 50, "pass": true },
    "integration_ratio": { "value": 0.6, "min": 0.3, "pass": true }
  },
  "gaps": ["mutation 미설정 — config.testing.coverage.mutation.tool 필요"],
  "generated_at": "2026-04-14T10:25:00Z"
}
```

### 3.4 qa-attribution.json — QA Stack 실패 귀인

```jsonc
{
  "v": 1,
  "feature": "auth/login",
  "mode": "sequential_bottom_up",
  "layers": [
    { "name": "infra", "status": "pass" },
    { "name": "db", "status": "pass" },
    { "name": "api", "status": "fail", "failed_tests": ["auth.login.timeout"] },
    { "name": "ui", "status": "skipped", "reason": "api layer failed" }
  ],
  "verdict": "pure_api_issue",
  "failed_layer": "api",
  "generated_at": "2026-04-14T10:28:00Z"
}
```

---

## 4. Single Writer — 동시성 모델

### 4.1 원칙

> **출처:** Actor Model의 *"한 Actor는 한 번에 한 메시지만 처리한다"* 원칙을 파일시스템 레벨로 차용.

`.harness/state/` 쓰기 진입을 **단일 스크립트 경로**로 일원화. 병렬 worktree는 상태를 **읽기만** 가능.

```
메인 세션 (writer, .harness/state/ 소유)
  │
  ├── dispatch: worktree-A (implementer-2) — Step 3
  ├── dispatch: worktree-B (implementer-3) — Step 4
  │
  ├── 각 worktree는 결과를 summary로 반환 (state 직접 쓰기 금지)
  │   └── 코드 + 테스트 + summary JSON (stdout)
  │
  └── 메인이 결과 수신 → .harness/state/ 일괄 갱신
```

### 4.2 강제 메커니즘

| 메커니즘 | 설명 |
|---------|------|
| `protect-harness.mjs` (PreToolUse) | 모든 세션에서 `.harness/state/` 직접 Edit/Write 차단 |
| 스크립트 경유 | `scripts/state/*.mjs`만 state 파일 수정 가능 |
| flock 잠금 | `update-workflow.mjs`는 `flock.mjs` (O_EXCL 기반 lockfile, 30초 stale timeout)로 read-modify-write 직렬화 |
| worktree 격리 | worktree 에이전트는 stdout으로 summary만 반환. state 파일 쓰기 물리적 차단 |

### 4.3 병합 시점 state 동기화

```
모든 worktree 완료
  → 메인이 결과 병합
  → 단일 트랜잭션으로 workflow.json 갱신
  → 전체 test suite 실행 (side-effect 확인)
```

**역할 분리:** "병렬은 결과물(코드) 생성, 메인은 상태 기록."

---

## 5. Audit Log

### 5.1 목적

하네스가 **"자동으로"** 내린 모든 판단을 append-only JSONL로 기록. 목적:

1. **Audit** — 왜 이 모드/크기로 확정됐는가, 왜 게이트가 skip됐는가 사후 검증
2. **Debug** — 자동 판단이 예상과 다를 때 입력 신호·적용 규칙 역추적

### 5.2 저장 구조

```
.harness/state/
├── audit.jsonl                ← 현재 활성 로그
├── audit-2026-03.jsonl        ← rotate_mb 초과 시 자동 회전 아카이브
└── audit-2026-02.jsonl
```

### 5.3 레코드 스키마

```jsonc
{
  "ts": "2026-04-14T10:23:45.123Z",
  "session_id": "abc-123",
  "event": "right_size_determined",
  "source": "scripts/workflow/determine-size.mjs",
  "decision": { "from": null, "to": "medium" },
  "signals": { "ac": 5, "files": 8, "loc": 250 },
  "rule_id": "determine-size:medium-band",
  "reversible": true
}
```

→ 필드 상세 및 전체 이벤트 타입 카탈로그: [09-script-system.md §6](09-script-system.md)

### 5.4 불변식 (Audit Iron Law)

| 불변식 | 설명 |
|--------|------|
| **append-only** | 기존 엔트리 수정/삭제 절대 금지. Event Sourcing 규칙 차용 |
| **flock 직렬화** | `audit-append.mjs`가 flock으로 동시 쓰기 race 차단 |
| **PII redaction** | `config.audit.redact_fields`에 명시된 필드는 hash로 치환 |
| **비활성화해도 동작** | `audit.enabled: false`여도 자동 판단 자체는 정상 동작 — **기록만 중단** (관찰 가능성 포기 옵션) |

### 5.5 Config

```yaml
# .harness/config.yaml — audit 섹션
audit:
  enabled: true
  path: .harness/state/audit.jsonl     # 기본 경로
  retention_days: 90                    # 아카이브 보존 기간
  rotate_mb: 10                        # 이 크기 초과 시 월별 회전
  redact_fields:                        # PII hash 치환 대상
    - email
    - password
    - token
  events:                               # 이벤트별 on/off
    mode_auto_detected: true
    right_size_determined: true
    gate_bypassed: true                 # 이것만큼은 끄지 않는 것을 강력 권장
    # ... (전체 목록: 09-script-system.md §6.3)
```

---

## 6. Trace Stream

### 6.1 목적

하네스가 **"세션 런타임에 무엇이 발화했는가"** 를 session-scoped append-only JSONL로 기록. Audit Log·Event Stream과 직교하는 세 번째 관측 레이어로, inspector(`apps/inspector/`)가 이 스트림을 타임라인으로 시각화한다.

**질문 영역 대응:**

| 질문 | 스트림 |
|---|---|
| "왜 이 판단이?" | Audit Log |
| "이 feature는 지금 어느 phase?" | Event Stream |
| "이번 세션에 어떤 hook/tool/agent가 호출됐나?" | **Trace Stream** |

### 6.2 저장 구조

```
.harness/state/traces/
├── {session_id}.jsonl         ← 세션별 단일 파일 (live)
├── _unknown-session.jsonl     ← session_id 누락 시 fallback
└── (archive 정책 미정 — P3에서 결정)
```

**세션별 1파일 원칙:**
- 세션이 끝나도 파일은 유지 (inspector가 과거 세션도 조회)
- 세션 간 writer 충돌 없음 (그래도 flock 적용 — defensive)
- session_id 누락은 예외 케이스이므로 별도 fallback 파일에 수집

### 6.3 레코드 스키마 (v1)

```jsonc
{
  "v": 1,                                    // 스키마 버전 (upcaster 대상)
  "ts": "2026-04-19T10:23:45.123Z",         // 타임스탬프
  "session_id": "abc-123",                   // Claude Code hook payload에서 추출
  "turn": 3,                                 // optional — UserPromptSubmit 카운터
  "span_id": "span-a1b2c3d4",               // 이 이벤트의 고유 ID
  "parent_span_id": null,                    // 중첩 추적 (tool_post ← tool_pre 등)
  "kind": "tool_pre",                        // enum: §6.4
  "source": "PreToolUse",                    // 어느 hook 이벤트에서 발생했나
  "tool": "Bash",                            // tool 관련 kind일 때만
  "producer": "scripts/trace/emit-tool-pre.mjs", // 발행 주체
  "data": { /* kind-specific payload */ }
}
```

### 6.4 kind enum

| kind | 언제 | data 구조 |
|---|---|---|
| `tool_pre` | PreToolUse wildcard | `{ input, isolation?, subagent_type? }` (Task 시 subagent_type 보존) |
| `tool_post` | PostToolUse wildcard | `{ exit_code, duration_ms, output_summary? }` |
| `hook` | 개별 hook script 자신의 발화 (block, audit, gate 판정 등) | `{ script, result: "pass"\|"block"\|"warn", reason? }` |
| `snapshot` | SessionStart 정적 컨텍스트 | `{ rules_active, skills, mcp_servers, output_style, harness_version }` |
| `prompt` | UserPromptSubmit 원본 | `{ original }` |
| `prompt_transformed` | `auto-transform.mjs` 이후 | `{ original, transformed, rules_applied, diff? }` |
| `turn_start` / `turn_end` | 턴 경계 | `{ turn_n, duration_ms? }` |

### 6.5 불변식 (Trace Iron Law)

| 불변식 | 설명 |
|--------|------|
| **append-only** | Audit Log와 동일. 기존 엔트리 수정·삭제 금지 |
| **flock 직렬화** | `trace-emit.mjs`가 `flock.mjs` 재사용 |
| **silent-skip** | `.harness/` 없는 프로젝트 → exit(0). 다른 state 스크립트와 일관 |
| **non-blocking** | Trace emitter의 실패가 **tool 실행을 막지 않는다**. exit 1이어도 Claude Code는 작업 계속 |
| **size bounded** | 이벤트 직렬화 >64KB면 큰 필드 truncate + `data.truncated=true` |
| **PII 처리는 소비자 책임** | trace는 원본을 보존. 마스킹은 inspector/exporter 단계 |

### 6.6 Audit Log와의 차이

| 축 | Audit Log | Trace Stream |
|---|---|---|
| 목적 | 정책 판단 역추적 | 실행 타임라인 복원 |
| 단위 | 단일 결정 | 세션 전체 |
| 파일 구조 | 단일 파일 + 월별 회전 | 세션별 파일 |
| 소비자 | `/harness:sync`, 규정 감사 | `apps/inspector` |
| 비활성화 | `audit.enabled: false` | `observability.trace.enabled: false` (P3에서 config 추가) |
| 보존 정책 | `retention_days: 90` | P3에서 결정 (archive or delete) |

### 6.7 Writer — `trace-emit.mjs`

**호출 방식:**

```bash
# stdin JSON
echo '{"kind":"tool_pre","tool":"Bash","session_id":"abc","data":{"input":{"command":"ls"}}}' \
  | node trace-emit.mjs

# CLI 인자
node trace-emit.mjs --kind tool_pre --session-id abc --tool Bash
```

**자동 주입:**
- `v`: 미제공 시 1
- `ts`: 미제공 시 ISO now
- `span_id`: 미제공 시 `span-{random hex}`
- `producer`: 미제공 시 환경변수 `HARNESS_PRODUCER` 또는 `"unknown"`

**Config (Phase 3에서 추가):**

```yaml
# .harness/config.yaml
observability:
  trace:
    enabled: true
    path: .harness/state/traces           # 기본
    max_event_bytes: 65536                # 64KB size guard
    redact_fields: []                     # inspector에서 처리 권장
```

### 6.8 Wrapper Scripts — Hook → trace-emit 어댑터

`trace-emit.mjs`는 writer다. **수집(collection)** 은 얇은 어댑터 스크립트가 맡는다. 각 wrapper는 Claude Code가 주입한 hook stdin payload(JSON)를 읽어 `writeTraceRecord()`를 호출한다.

```
plugin/scripts/trace/
├── emit-tool-pre.mjs              ← PreToolUse wildcard.   kind=tool_pre,  source=PreToolUse
├── emit-tool-post.mjs             ← PostToolUse wildcard.  kind=tool_post, source=PostToolUse
├── emit-session-snapshot.mjs      ← SessionStart.          kind=snapshot,  source=SessionStart
├── emit-prompt.mjs                ← UserPromptSubmit 선두. kind=prompt,    source=UserPromptSubmit
├── emit-prompt-transformed.mjs    ← UserPromptSubmit 말미. kind=prompt_transformed
└── emit-stop.mjs                  ← Stop 선두.             kind=stop,      source=Stop
```

| 규칙 | 의미 |
|------|------|
| **Non-blocking** | 모든 wrapper는 `exit(0)` 만 반환. LLM이 signal할 실패 없음. 내부 에러도 stderr로만 기록 |
| **Single process** | wrapper가 `trace-emit.mjs`를 subprocess로 재실행하지 않고 `writeTraceRecord` 함수를 import. 이중 fork 회피(<20ms p95 목표) |
| **session_id source** | Claude Code stdin payload의 `session_id` 필드. 없으면 trace-emit writer가 `_unknown-session`으로 fallback |
| **Silent-skip** | `.harness/` 미존재 프로젝트에서는 writer가 자체 skip. wrapper는 단순히 호출만 |

**Prompt pair 배치:** UserPromptSubmit 체인은 `emit-prompt` (pipeline 진입 전 원본) → gate/quality/auto-transform → `emit-prompt-transformed` (최종 결과) 순서. Inspector가 두 이벤트를 span_id + parent_span_id 로 연결하여 변환 diff를 렌더한다.

**Stop 경계:** Stop 체인은 `emit-stop` (관측) → `update-workflow` (상태 저장) 순서. Trace가 상태 저장보다 먼저 실행되어야 관측 누락이 없다. Lifecycle 다이어그램은 `kind=stop` 레코드 유무로 세션 정상 종료 여부를 점등한다.

---

## 7. Compact Recovery

Claude Code의 context window가 가득 차면 **Compact** (대화 압축)이 발생한다. 이때 LLM 컨텍스트 내의 워크플로우 상태 정보가 소실될 수 있다.

### 7.1 복구 메커니즘

```
Compact 발생
  → 다음 SessionStart에서 compact 감지
  → compact-recovery.mjs 실행
    │
    ├── 1. workflow.json 존재 확인
    │   └── 있으면: 로드 → 세션 상태 복원
    │
    ├── 2. workflow.json 손상 / 버전 불일치
    │   └── events/**/*.jsonl 처음부터 replay
    │       → upcast() 경유 (최신 스키마 변환)
    │       → workflow.json 재구축
    │
    └── 3. 복원 완료 → additionalContext로 상태 주입
        "compact 후 복원됨. 현재 phase: implement, 다음: /harness:review"
```

### 7.2 Compact에 영향받는 것 / 받지 않는 것

| 항목 | Compact 후 | 방어 |
|------|-----------|------|
| `.harness/state/` | 디스크 존재 | SessionStart hook 재로드 |
| Skill descriptions | 미호출 스킬 소실 | `session-start-context.mjs` 카탈로그 재주입 |
| 에이전트 컨텍스트 | 별도 윈도우 | Compact 영향 없음 |
| Config | 디스크 존재 | 재로드 복원 |
| 대화 내 중간 결과 | **소실** | workflow.json + events에서 핵심 상태 재구축 |

### 7.3 Snapshot 손상 복구 흐름

```
workflow.json 로드 실패 또는 v 불일치
  │
  ├── snapshot 파기
  ├── events/**/*.jsonl 전체 순회
  │   └── 각 이벤트 upcast() → fold
  ├── 새 workflow.json 생성
  └── "snapshot 재구축 완료" 로그
```

---

## 8. 관측성 도구

### 8.1 엔트로피 스윕 (`/harness:sync`)

`/harness:sync --schedule weekly`로 주기적 감사:
- 문서 일관성 (spec↔plan↔code)
- 의존성 레이어 위반
- `bypass_budgets` 잔량 집계
- `retired_assumptions[]` 후보 탐지
- Knowledge Layer 정리 후보 (`prune-stale.mjs`)

결과: `.harness/state/entropy-report.jsonl` + `entropy_sweep_*` audit 이벤트

### 8.2 Coverage Trend

`scripts/qa/coverage-trend.mjs`가 이터레이션 간 각 축의 delta를 계산:

```jsonc
// coverage-trend.json
{
  "feature": "auth/login",
  "iterations": [
    { "iter": 1, "line": 60, "branch": 45, "ac": 80 },
    { "iter": 2, "line": 75, "branch": 60, "ac": 90 },
    { "iter": 3, "line": 85, "branch": 72, "ac": 100 }
  ],
  "deltas": {
    "line": [15, 10],
    "branch": [15, 12],
    "ac": [10, 10]
  }
}
```

### 8.3 QA Attribution

QA Stack의 bottom-up 실행 결과를 계층별로 귀인:
- `failed_layer`: 어느 계층에서 실패했는가
- `verdict`: `pure_{layer}_issue` (해당 계층 자체 문제) 또는 `cross_layer_issue`
- `mock_guard` 위반 여부 (`qa_attribution_warning`)

→ 상세: [03-workflow.md §1.3.1](03-workflow.md) QA Stack

---

## 참조

- [02-architecture.md §3.0](02-architecture.md) — Feature = Aggregate, 일관성 규칙
- [02-architecture.md §7.5](02-architecture.md) — Single Writer 상세, 강제 메커니즘
- [05-project-structure.md §5](05-project-structure.md) — State 파일 매핑 규칙, Upcaster 상세
- [07-hooks-system.md](07-hooks-system.md) — SessionStart compact-recovery, Stop update-workflow, PreToolUse/PostToolUse trace emitter (P2)
- [09-script-system.md §6](09-script-system.md) — Audit Event 공통 스키마, 이벤트 타입 카탈로그
- [00-overview.md Glossary](00-overview.md) — Audit Log · Event Stream · Trace Stream · Config 참조
- `../PLAN.md` v0.3.0 — Observability Layer 구현 사이클 (trace-emit → hook wiring → apps/inspector)
