# @intuvibe/inspector — 개발 컨벤션

하네스 trace 를 관찰하는 로컬 웹 UI. 이 문서는 **왜 이렇게 되어있는가**와 **무엇을 바꿀 때 지켜야 하는가**를 기록한다. 사용자 가이드는 [README.md](./README.md) 참조.

## 1. 디렉토리 구조 — flat

Clean Architecture 레이어(domain/usecase/infra)를 **쓰지 않는다.** 레이어 대신 _실행 환경_ 으로 나눈다.

```
src/
  server/      Express 서버 — routes, middleware, trace-context
  web/         React UI — components, hooks, api/stream 클라이언트
  shared/      서버·웹·테스트 공용. 순수 타입과 순수 함수만.
tests/
  server/      실제 httpServer 띄워서 fetch 로 검증 (supertest 지양)
  shared/      node 환경 단위 테스트
  web/         jsdom + @testing-library/react
  _fixtures/   테스트 공용 헬퍼 (예: tmp-project)
```

**원칙**
- `shared/` 는 **순수해야 한다.** Express, React, node:fs 모두 금지하는 건 아니지만(예: `trace-file-watcher.ts` 는 fs 사용), **단일 환경에 종속되는 프레임워크 의존은 금지**. server 전용이면 `server/`, 웹 전용이면 `web/` 로.
- `server/routes/*` 한 파일 = 한 엔드포인트 (또는 밀접한 1쌍).
- `web/components/*` 는 프레젠테이션. 데이터 fetch 는 `web/hooks/*` 로 분리.

## 2. 파일 크기 예산

| 종류 | 최대 줄 수 |
|------|-----------|
| React 컴포넌트 | 150 |
| 서버 라우트 | 80 |
| 그 외 모듈 | 200 |

예산 초과 시 분할이 기본. 예외는 해당 파일 상단 주석으로 근거 명시.

## 3. 파일 상단 한 줄 주석

모든 소스 파일은 첫 줄에 역할 요약 주석을 둔다.

```ts
// server/trace-context.ts — store + watcher 싱글톤 컨테이너.
```

중요한 설계 이유가 있으면 한 줄 더. 긴 문단 docstring 은 쓰지 않는다.

## 4. 모듈 시스템

- `"type": "module"` — ESM 전용.
- 상대 import 는 **`.js` 확장자 포함**. TypeScript 는 `.ts` 소스를 `.js` 로 참조 (NodeNext 해석).
- 경로 별칭: `@shared/*` → `src/shared/*`. `vite.config.ts` / `vitest.workspace.ts` / `tsconfig.json` 모두 동일하게 등록.

## 5. 테스트 — Vitest workspace + TDD

**2-프로젝트 워크스페이스** (`vitest.workspace.ts`):

| 프로젝트 | environment | 포함 경로 |
|----------|-------------|----------|
| `node`   | node  | `tests/shared/**`, `tests/server/**` |
| `jsdom`  | jsdom | `tests/web/**` |

**필수 관례**
- **TDD**: 기능 변경은 실패하는 테스트 추가 → 구현 → 초록, 순서로.
- **jsdom 수동 cleanup**: `tests/web/_setup.ts` 에서 `afterEach(cleanup)` 을 명시. `globals: false` 환경에서 `@testing-library/react` auto-cleanup 이 작동하지 않기 때문.
- **e2e 는 실제 서버**: `tests/server/e2e.test.ts` 처럼 `createApp()` 으로 실제 httpServer 를 띄우고 `fetch` 로 검증. supertest 지양.
- **tmp 픽스처**: 파일 I/O 테스트는 `tests/_fixtures/tmp-project.ts` 의 `createTmpProject()` 사용. `afterEach` 에서 `cleanup()` 필수.
- **파괴적 mock 금지**: DB·프로세스 등 외부 의존 시 가급적 실제 리소스(tmp dir, in-memory 서버).

## 6. 환경 변수

| 변수 | 기본값 | 용도 |
|------|--------|------|
| `PORT` | 3030 | HTTP 포트 |
| `NODE_ENV` | (unset) | `production` 이면 `dist/` 정적 서빙, 아니면 Vite dev middleware |
| `HARNESS_PROJECT_DIR` | `apps/inspector/../..` (= 레포 루트) | 관찰 대상 프로젝트 디렉토리 |

Inspector 는 `<HARNESS_PROJECT_DIR>/.harness/state/traces/` 를 실시간 감시한다. 대상 디렉토리가 시작 시 없으면 1초 폴링으로 생성 대기 (`trace-file-watcher.ts`).

## 7. 데이터 흐름

```
fs.watch (.jsonl 파일)
  → TraceFileWatcher (이벤트 방출)
    → TraceStore (메모리 캐시, WatcherCallbacks 구현)
    → SSE 브로드캐스터 (/api/stream)
      → 브라우저 useSessions / useStream
```

- **단방향**: 파일 → store → 클라이언트. 역방향 없음. Inspector 는 read-only.
- **Snapshot + tail**: 초기 `/api/sessions` · `/api/sessions/:id` 는 HTTP, 이후 델타는 SSE.
- **프로토콜 타입**: 서버·웹 공유 타입은 `src/shared/protocol.ts` 에만 정의.

## 8. 금기사항 (Don'ts)

- ❌ Clean Architecture 레이어 도입 (domain/usecase/repository/infra…).
- ❌ 상태 관리 라이브러리(Redux/Zustand/Jotai) 도입 — 현재 React state + 커스텀 hook 으로 충분.
- ❌ 서버 → 클라이언트 역방향 명령 채널.
- ❌ 관찰 대상 프로젝트의 파일 **쓰기/수정** (read-only 원칙).
- ❌ 테스트에서 globals (전역 `describe/it`) 사용 — `vitest` 에서 명시 import.
- ❌ 파괴적 git 동작 (amend / force-push / history rewrite) 을 사용자 명시 승인 없이 수행.

## 9. 변경 워크플로우

1. 관련 테스트를 먼저 추가/수정 (TDD).
2. 구현.
3. `pnpm test` (전체 workspace) + `pnpm typecheck` 초록 확인.
4. 컨벤션·공개 동작이 바뀌었으면 **이 문서**와 `README.md` 를 같이 갱신.
5. 커밋 메시지는 기존 톤 유지 (`feat:`, `fix:`, `docs:`, `test:`, `release:` 등).

## 10. 이 문서를 갱신할 때

- 새 암묵 규칙이 생겼다면 그 자리에서 섹션 추가.
- 기존 규칙이 바뀌었다면 이전 규칙을 지우지 말고 **변경 이유**를 섹션 끝에 한 줄 남겨라. 재발 방지용.
- 여기에 안 적힌 규칙은 "존재하지 않는 규칙" 으로 간주한다.
