# @intuvibe/inspector

하네스가 기록한 trace 를 브라우저에서 관찰하는 로컬 웹 UI.

## 무엇을 보여주는가

- **Sessions** — `.harness/state/traces/*.jsonl` 로 누적된 세션 목록
- **Timeline** — 한 세션 내 record 를 시간순으로, kind 별 색상 표시
- **Span Detail** — 선택한 record 의 필드 + `data` JSON
- **Prompt Diff** — `prompt` 과 자식 `prompt_transformed` 쌍을 before/after
- **Snapshot** — `SessionStart` 에 캡처된 rules / skills / mcp_servers
- **Subagents** — `parent_span_id` 기반 호출 트리 (orphan 도 root 로 승격)
- **Lifecycle** — `snapshot` / `turn_start` / `turn_end` / `stop` 만 필터
- **실시간 tail** — `/api/stream` SSE 로 새 record/세션이 자동 반영

## 실행

```bash
pnpm install
pnpm dev
# http://localhost:3030
```

기본 대상은 `apps/inspector/../..` (= intuvibe 레포 루트) 의 `.harness/state/traces/`.
다른 프로젝트를 관찰하려면:

```bash
HARNESS_PROJECT_DIR=/path/to/project pnpm dev
PORT=4000 pnpm dev
```

프로덕션 빌드:

```bash
pnpm build    # Vite → dist/
pnpm start    # dist/ 를 서빙
```

## 구조 (flat — Clean Architecture 아님)

```
src/
  server/      Express + routes + Vite/static middleware
  web/         React UI (components + hooks + api/stream 클라이언트)
  shared/      서버·클라이언트·테스트가 공유하는 타입과 순수 함수
tests/
  server/      supertest 대신 실제 httpServer 띄워서 e2e 수준으로
  shared/      node 환경
  web/         jsdom + @testing-library/react
```

파일 크기 예산: 컴포넌트 ≤150, 라우트 ≤80, 그 외 모듈 ≤200 줄.

## 테스트

```bash
pnpm test           # 전체 (node + jsdom workspace)
pnpm test:watch
pnpm typecheck
pnpm test:coverage
```

Vitest workspace 로 `node` / `jsdom` 프로젝트를 병렬 실행한다. jsdom 프로젝트는 `tests/web/_setup.ts` 에서 `afterEach(cleanup)` 을 명시적으로 걸어야 한다 — `globals: false` 환경에서는 `@testing-library/react` 의 auto-cleanup 이 동작하지 않기 때문.

## API

| Method | Path | Body |
|--------|------|------|
| GET | `/api/health` | `{ ok, mode }` |
| GET | `/api/sessions` | `{ sessions: SessionSummary[] }` |
| GET | `/api/sessions/:id` | `{ summary, records: TraceRecord[] }` |
| GET | `/api/stream` | SSE — `record` / `session_added` / `heartbeat` |

타입 정의는 `src/shared/protocol.ts` 참조.
