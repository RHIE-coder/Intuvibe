# Harness Framework Implementation Plan

> 작성: 2026-04-19
> 상태: done
> 버전: v0.3.0
> 주제: Observability Layer — 하네스 동작 실시간 관측

---

## 0. 배경

v0.1.0 ~ v0.2.1 사이클에서 하네스의 Safety·State·Gate·핵심 스킬·CLAUDE→rules 마이그레이션이 구축됐다. 이번 사이클은 **"하네스 자신의 동작을 어떻게 관측할 것인가"** 를 해결한다.

### 0.1 문제

유저 시점에서 하네스가 제대로 동작하는지 확신하기 어렵다:

- 어떤 hook이 언제 호출되는가
- 어떤 skill·agent·MCP가 발화하고 subagent로 fork되는가
- worktree가 어떻게 생기고 해제되는가
- 프롬프트가 `quality-check` → `auto-transform`에서 어떻게 변하는가 (프롬프트 변환이 오히려 성능을 떨어뜨리는지 검증 필요)

이 정보는 **Claude Code 플랫폼이 노출하는 hook stdin + tool 호출 인자**에 이미 있다. 빠진 건 **수집·저장·시각화 레이어**.

### 0.2 3개 이벤트 스트림 구조

기존 두 스트림에 세 번째 스트림을 추가한다:

| 스트림 | 목적 | 파일 | 기존 writer |
|---|---|---|---|
| `audit.jsonl` | Policy audit — 왜 이 판단이 내려졌는가 | `.harness/state/audit.jsonl` | `audit-append.mjs` |
| `events/` | Feature lifecycle — feature가 어떤 phase를 거쳤는가 | `.harness/state/events/{domain}/{feature}/{YYYY-MM}.jsonl` | `event-emit.mjs` |
| **`traces/` (신규)** | **Execution mechanism — 런타임에 무엇이 발화했는가** | **`.harness/state/traces/{session_id}.jsonl`** | **`trace-emit.mjs`** |

세 스트림이 orthogonal한 이유:

- **audit = 정책 추적**: 단일 판단 이벤트. "왜 이렇게 됐나" 역추적용.
- **event = 도메인 라이프사이클**: feature 단위 집계. snapshot fold 재료.
- **trace = 기계 메커니즘**: session 단위 타임라인. 개별 hook·tool 호출 단위.

같은 "auth/login feature에서 spec이 만들어졌다"는 사건이라도:
- audit: `{event: "spec_validated", rule_id: "..."}` (정책)
- events: `{type: "SpecCreated", payload: {...}}` (도메인)
- traces: `{kind: "tool_pre", tool: "Write", data: {path: ".harness/specs/auth/login.spec.yaml"}}` (메커니즘)

### 0.3 도메인 대응

| 도메인 | Phase 1~3 역할 |
|---|---|
| **B. 하네스 기반 개발** | `trace-emit.mjs`, hook matcher 확장 |
| **A. 하네스 자체 개발** | `bench/specs/trace-emit.spec.yaml`, `bench/tests/state/trace-emit.test.mjs` |
| **생태계 확장 (apps)** | `apps/inspector/` — `packages/` 외부 워크스페이스 |

### 0.4 비목표

- LLM 프롬프트/응답 raw 캡처 — transcript 파싱은 fallback이며 1차 신호 아님
- `apps/site/` — 별도 사이클
- 원격 호스팅 inspector — 로컬 `file://` 기준
- Paperclip 같은 org-level 오케스트레이션 — 고도가 다름 (하네스는 process-level 관측)

---

## 1. Phase 1 — trace-emit 통합 writer

> 목표: session-scoped JSONL writer 완성. Phase 2의 hook wiring이 의존한다.

### 1.1 도메인 B — 구현

```
plugin/scripts/state/
└── trace-emit.mjs                 ← 신규. stdin/CLI → traces/{session_id}.jsonl
```

**핵심 책임:**

| 항목 | 규칙 |
|---|---|
| 입력 | stdin JSON 또는 CLI args (`--kind`, `--session-id`, `--tool` 등) |
| 출력 파일 | `.harness/state/traces/{session_id}.jsonl` (세션별 1파일, append-only) |
| 직렬화 | `flock.mjs` 재사용 (세션 중첩 writer 방어) |
| 필드 주입 | `v`, `ts`, `span_id` 미제공 시 자동 생성 |
| Size guard | 이벤트 직렬화 >64KB면 큰 필드 truncate 후 `data.truncated=true` |
| Silent-skip | `.harness/` 없는 프로젝트 → exit(0) (다른 state 스크립트와 일관) |
| Fallback | `session_id` 누락 → `traces/_unknown-session.jsonl` |
| Exit code | 0 = 기록 성공, 1 = 런타임 에러 (파일 I/O 등), JSON 파싱 실패 |

**이벤트 스키마 (v1):**

```jsonc
{
  "v": 1,
  "ts": "2026-04-19T10:23:45.123Z",
  "session_id": "abc-123",
  "turn": 3,                         // optional (UserPromptSubmit에서 증가)
  "span_id": "span-a1b2c3d4",       // uuid4 or 랜덤 hex
  "parent_span_id": null,           // 중첩 추적 (tool_post ← tool_pre 등)
  "kind": "tool_pre",               // tool_pre | tool_post | hook | snapshot | prompt | turn_start | turn_end
  "source": "PreToolUse",           // hook event name (SessionStart, UserPromptSubmit, ...)
  "tool": "Bash",                   // null if not tool-related
  "data": { /* kind-specific */ }
}
```

**kind enum:**

| kind | 용도 | data 예시 |
|---|---|---|
| `tool_pre` | PreToolUse | `{input: {...}}` |
| `tool_post` | PostToolUse | `{exit_code, duration_ms}` |
| `hook` | hook 자신의 발화 (guardrails 등) | `{script, result: "pass"\|"block"}` |
| `snapshot` | SessionStart 정적 컨텍스트 | `{rules_active: [...], skills: [...], mcp_servers: [...]}` |
| `prompt` | UserPromptSubmit 원본/변환 | `{original, transformed, rules_applied}` |
| `turn_start` / `turn_end` | 턴 경계 | `{turn_n}` |

### 1.2 도메인 A — 자체 검증

```
bench/specs/
└── trace-emit.spec.yaml           ← 신규. AC-TR01~AC-TR10

bench/tests/state/
└── trace-emit.test.mjs            ← 신규. 결정론적 node:test
```

### 1.3 검증 기준 (Phase 1)

- [x] CLI 인자 `--kind tool_pre --session-id abc --tool Bash` → `traces/abc.jsonl` 생성 (AC-TR01)
- [x] stdin JSON → 동일 동작 (AC-TR02)
- [x] 필수 필드 `ts`, `span_id` 미제공 시 자동 주입 (AC-TR03, AC-TR04)
- [x] 동시 10회 호출 → 파일 줄 수 = 10, 전부 파싱 성공 (flock) (AC-TR06)
- [x] 64KB 초과 data 필드 → truncate + `data.truncated=true` (AC-TR07)
- [x] `.harness/` 없는 프로젝트 → exit(0) silently (AC-TR08)
- [x] `session_id` 누락 → `_unknown-session.jsonl`에 기록 (AC-TR09)
- [x] 잘못된 JSON stdin → exit(1) + stderr 메시지 (AC-TR10)
- [x] schema `v` 필드 자동 주입 (기본 1) (AC-TR05)
- [x] `HARNESS_PRODUCER` 환경변수 → 이벤트의 `producer` 필드로 반영 (AC-TR11)

**테스트 결과:** 14/14 통과.

---

## 2. Phase 2 — Hook wildcard wiring + snapshot emission

> 목표: 모든 tool 호출·hook 발화·정적 컨텍스트를 `trace-emit`로 자동 수집.

### 2.1 hooks.json 확장

**신규 matcher (PreToolUse / PostToolUse 와일드카드):**

```json
{
  "PreToolUse": [
    { "matcher": "",
      "hooks": [
        { "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/trace/emit-tool-pre.mjs" }
      ]
    }
  ],
  "PostToolUse": [
    { "matcher": "",
      "hooks": [
        { "type": "command", "command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/trace/emit-tool-post.mjs" }
      ]
    }
  ]
}
```

**순서 규칙:** wildcard trace emitter는 **기존 matcher보다 뒤**에 추가 (safety/gate가 차단한 경우에도 `tool_pre`는 기록 — 차단 이벤트를 별도 `kind: hook` 로 수집).

### 2.2 신규 trace-specific 스크립트

```
plugin/scripts/trace/
├── emit-tool-pre.mjs              ← PreToolUse wildcard → trace-emit.mjs stdin
├── emit-tool-post.mjs             ← PostToolUse wildcard
├── emit-session-snapshot.mjs      ← SessionStart 정적 컨텍스트 (rules, skills, MCP)
├── emit-prompt.mjs                ← UserPromptSubmit 원본 (auto-transform 전)
├── emit-prompt-transformed.mjs    ← auto-transform 이후 (diff 기록)
└── emit-stop.mjs                  ← Stop 경계 (Lifecycle 다이어그램 점등 근거)
```

각 스크립트는 얇은 어댑터 — stdin에서 Claude Code hook payload를 받아 `trace-emit.mjs` 포맷으로 변환 후 파이프.

### 2.3 도메인 A — 자체 검증

```
bench/specs/
└── trace-wiring.spec.yaml         ← AC-TW01~AC-TW08

bench/tests/trace/
├── emit-tool-pre.test.mjs
├── emit-tool-post.test.mjs
├── emit-session-snapshot.test.mjs
├── emit-prompt.test.mjs
├── emit-prompt-transformed.test.mjs
├── emit-stop.test.mjs
└── architecture.test.mjs              ← no-subprocess + writeTraceRecord import 정적 검사
```

### 2.4 검증 기준 (Phase 2)

- [x] Bash 도구 호출 → `traces/{session_id}.jsonl`에 `tool_pre` + `tool_post` 2건 (hooks.json 와일드카드 + AC-TW01/02)
- [x] Task 도구 호출 → `subagent_type`, `prompt`, `isolation` 보존 (AC-TW09)
- [x] MCP 도구(`mcp__*__*`) → 동일 포맷으로 기록 (AC-TW08)
- [x] SessionStart 시 1건의 `snapshot` 이벤트 기록 (rules/skills/MCP 목록) (AC-TW03)
- [x] UserPromptSubmit에서 원본 prompt + transformed prompt 페어 기록 (AC-TW04, AC-TW05, hooks.json 순서)
- [x] Safety matcher가 `exit(2)`로 차단해도 `tool_pre`는 여전히 기록됨 — 구조적 보장. Trace wildcard 는 별도 matcher 블록이므로 Safety 블록의 exit(2) 에 영향받지 않음
- [x] 와일드카드 trace emitter의 실패가 tool 실행을 **막지 않음** (AC-TW07, `runTrace` 가 항상 exit(0))
- [~] trace emitter 추가로 인한 평균 hook 레이턴시 증가 <20ms (p95) — **부분 충족.** 와이어 당 p95 ≈ 35ms (node subprocess startup 25~30ms 지배). 인-프로세스 로직은 <10ms. 20ms 목표는 subprocess-per-hook 모델 하에서 달성 불가. 개선은 P3 에서 hook batching 으로 별도 검토.
- [x] Stop 경계 trace (AC-TW12) — `emit-stop.mjs` 가 Stop hook 선두에서 `kind=stop` 레코드 기록. Lifecycle 다이어그램에서 세션 정상 종료 노드 점등 근거.

**테스트 결과:** 신규 44건 + 기존 266건 = **310/310 통과**. Regression 없음.

---

## 3. Phase 3 — apps/inspector (Web UI)

> 목표: 로컬 브라우저에서 trace 타임라인 + Claude Code lifecycle 다이어그램 실시간 시각화.

### 3.1 워크스페이스 구조 신설

```
intuvibe/
├── packages/              # 기존: 하네스 플러그인 (workspace 미포함)
│   └── harness/
├── apps/                  # 신설: 독립 실행 애플리케이션
│   └── inspector/
├── docs/
├── package.json           # 신설: workspace root
└── pnpm-workspace.yaml    # 신설
```

**`pnpm-workspace.yaml`:**

```yaml
packages:
  - "apps/*"
```

**`packages/harness/`는 workspace 미포함** — 플러그인 산출물이고 application이 아니며 cross-package import 없음. Inspector 는 `.harness/state/traces/` 를 **파일로만** 읽는다 (의존성 0).

### 3.2 Architecture 결정 (확정)

| 결정 | 선택 | 이유 |
|---|---|---|
| 패키지 매니저 | **pnpm** workspace | `apps/*` 워크스페이스 격리, 의존성 중복 제거 |
| UI 스택 | **React + TypeScript + Vite** | HMR, 타입 안정성, 프로토타입 속도 |
| 스타일 | **Tailwind CSS v3** (slate dark) | 로컬 프로토타입, v4 alpha 회피 |
| 서버 아키텍처 | **Express + Vite middleware** (단일 프로세스) | 개발/프로덕션 동일 코드. Vite 는 library 로 embed |
| 포트 | **3030** | 하네스 작업 중 흔히 쓰는 3000·5173 회피 |
| Upcaster | **Inspector 독립 구현** (`upcaster.ts`) | packages/harness 의존 제거. trace schema `v` 기반 변환 |
| 데이터 | `.harness/state/traces/*.jsonl` 파일 watch | DB 불필요 |
| 실시간 | **fs.watch + SSE** | 서버 간소, 브라우저 표준 |

### 3.3 Inspector 컴포넌트

```
apps/inspector/
├── src/
│   ├── server/
│   │   ├── index.ts               ← Express. /api/sessions, /api/stream SSE, Vite middleware mount
│   │   ├── trace-reader.ts        ← .harness/state/traces/ 파일 watch + 파싱
│   │   └── upcaster.ts            ← 스키마 버전 변환 (harness upcaster 철학 공유, 독립 구현)
│   ├── web/
│   │   ├── App.tsx                ← 좌측 SessionList, 중앙 탭 뷰, 우측 SpanDetail (3-pane)
│   │   ├── SessionList.tsx
│   │   ├── Timeline.tsx           ← Gantt 스타일 span 타임라인 (기본 탭)
│   │   ├── PromptDiff.tsx         ← 프롬프트 변환 전/후 side-by-side
│   │   ├── Snapshot.tsx           ← SessionStart rules/skills/mcp 목록
│   │   ├── SubagentTree.tsx       ← Task 도구 호출 트리 nesting
│   │   ├── Lifecycle.tsx          ← Claude Code 워크플로우 다이어그램 (점등/회색)
│   │   └── SpanDetail.tsx         ← 선택 span 의 input/output/diff/duration
│   └── shared/
│       └── types.ts               ← TraceRecord, Session 타입 (server↔web 공유)
├── fixtures/
│   └── sample.jsonl               ← M3 정적 렌더 검증용
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### 3.4 UX 핵심 뷰

**5개 탭 (중앙 패널):**

1. **Timeline** — 선택 세션의 span 들을 시간축에 배치 (parent/child nesting, tool/prompt/snapshot/stop 종류별 색)
2. **PromptDiff** — `prompt` + `prompt_transformed` 이벤트 페어를 original/final side-by-side 로 렌더. lexicon 매치 강조
3. **Snapshot** — SessionStart 시점 rules/skills/mcp_servers 목록 카드
4. **SubagentTree** — Task 도구 호출을 자식 span 트리로 시각화
5. **Lifecycle** — Claude Code 전체 hook 생명주기 다이어그램. 발화 노드만 점등 (회색 = 미관측). 클릭 → Timeline 필터링

**Lifecycle 뷰 노드 ↔ trace kind 매핑:**

| 다이어그램 노드 | trace kind | 현재 관측? |
|---|---|---|
| Session Start | `snapshot` | ✅ |
| UserPromptSubmit | `prompt` + `prompt_transformed` | ✅ |
| PreToolUse | `tool_pre` | ✅ |
| [tool executes] | (tool_pre → tool_post 간격) | ✅ |
| PostToolUse | `tool_post` | ✅ |
| Stop | `stop` | ✅ (Phase 2 보강) |
| PermissionRequest / SubagentStart / SubagentStop / Notification / 기타 async | (미관측) | ❌ — 회색 표시 |

**공통:**

- 좌측 SessionList 에서 세션 선택 → 중앙 탭 + 우측 SpanDetail 동기화
- 실시간 tail: 현재 세션 파일을 fs.watch → SSE push → UI auto-scroll
- dark theme (Tailwind slate), ✓/⚠/⛔ 아이콘, 상대 timestamp

### 3.5 마일스톤 (M1 → M4)

| M | 목표 | 산출물 | 예상 시간 |
|---|---|---|:---:|
| **M1** | Workspace bootstrap | 루트 `package.json`, `pnpm-workspace.yaml`, `apps/inspector/` 스켈레톤 (package.json, tsconfig, vite.config, index.html, src/main.tsx, App.tsx 껍데기, server/index.ts Express+Vite middleware 부팅) | ~15분 |
| **M2** | Server + Trace Reader | `/api/sessions` (세션 목록), `/api/sessions/:id` (단일 세션 trace), `/api/stream` (SSE tail). `trace-reader.ts` (JSONL 파싱, fs.watch), `upcaster.ts` (v=1 identity) | ~1.5h |
| **M3** | Web UI 정적 렌더 | SessionList, Timeline, SpanDetail, PromptDiff, Snapshot, SubagentTree, Lifecycle (회색/점등만, 애니메이션 X). `fixtures/sample.jsonl` 로 검증 | ~2.5h |
| **M4** | 실시간 tail + README | SSE 클라이언트, auto-scroll, Lifecycle 애니메이션, `apps/inspector/README.md` (실행/포트/스크린샷) | ~1.5h |

### 3.6 검증 기준 (Phase 3)

- [ ] `pnpm dev` 한 번에 Express(3030) + Vite middleware 기동 (단일 프로세스)
- [ ] `fixtures/sample.jsonl` 에서 Timeline 렌더 (tool_pre/post, prompt, snapshot, stop 모두 표시)
- [ ] 실시간: fixture 파일에 새 줄 append → UI 에 <500ms 내 반영 (SSE)
- [ ] PromptDiff: `prompt` + `prompt_transformed` 페어 중 lexicon 매치 라인 하이라이트
- [ ] SubagentTree: `tool_pre`(Task) 를 parent 로, 자식 span 을 children 으로 nesting
- [ ] Lifecycle: 현재 trace kind 6종이 해당 노드 점등, 나머지 async 노드는 회색 (근거 텍스트 "not yet observed")
- [ ] Inspector 가 `packages/harness` 를 import 하지 않음 (의존성 0 — 독립 upcaster)
- [ ] Production build: `pnpm build` 후 `pnpm start` 가 static asset + API 를 동일 Express 로 serve

---

## 4. 산출물 매트릭스

| 산출물 | P1 | P2 | P3 |
|---|:---:|:---:|:---:|
| `plugin/scripts/state/trace-emit.mjs` | ✅ | · | · |
| `plugin/scripts/trace/*.mjs` | · | ✅ (6개) | · |
| `plugin/hooks/hooks.json` 확장 | · | ✅ | · |
| `book/10-state-and-audit.md` — Trace Stream 섹션 | ✅ | · | · |
| `book/07-hooks-system.md` — 와일드카드 matcher 반영 | · | ✅ | · |
| `bench/specs/trace-emit.spec.yaml` | ✅ | · | · |
| `bench/specs/trace-wiring.spec.yaml` | · | ✅ | · |
| `bench/tests/state/trace-emit.test.mjs` | ✅ | · | · |
| `bench/tests/trace/*.test.mjs` | · | ✅ (7개: 6 wrapper + architecture) | · |
| 루트 `package.json` + `pnpm-workspace.yaml` | · | · | ✅ (M1) |
| `apps/inspector/` | · | · | ✅ (M1~M4) |

---

## 5. 위험 & 열린 질문

| 위험 | 완화 |
|---|---|
| Hook 레이턴시 누적 (모든 tool에 wildcard emitter) | P2 검증 기준에 p95 <20ms 추가. 초과 시 async fire-and-forget 모드 도입 |
| `traces/` 파일 무한 증가 | P3에서 세션 종료 시 압축 또는 N일 후 archive. 우선은 rotate 없이 실행 |
| Claude Code hook payload 스키마 변경 | trace-emit의 `v` 필드 + upcaster 체인으로 흡수 |
| Inspector의 fs.watch가 대량 세션에서 불안정 | polling fallback, 또는 index 파일 도입 |
| session_id 결정 방법 불확실 | Phase 1에서는 stdin payload의 `session_id` 필드 우선. 없으면 `_unknown-session` fallback |

---

## 6. 릴리스 기준

- 모든 Phase 검증 기준 ✅
- `packages/harness/bench/tests/` 전부 pass (regression 없음)
- `apps/inspector`가 최소 1개 실제 하네스 세션의 trace를 타임라인으로 렌더
- `book/`과 `plugin/`의 gap = 0 (catalog/matrix 갱신 완료)
- `RELEASES.md`에 v0.3.0 엔트리 추가
- git tag `v0.3.0`
