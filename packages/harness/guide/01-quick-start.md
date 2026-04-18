# 1. Quick Start

> 설치하고 첫 세션을 띄우기까지 5분. 이 문서만 따라가도 기본 동작을 확인할 수 있다.

---

## 사전 조건

- **Claude Code** 가 설치되어 있을 것 (데스크톱 앱 또는 CLI 어느 쪽이든).
- `git`, `node ≥ 20`.
- (선택) `pnpm` — Inspector 를 돌리려면 필요.

---

## 1.1 플러그인 등록

하네스는 이 레포의 **`packages/harness/plugin/`** 을 플러그인 루트로 배포한다. 루트 마켓플레이스 매니페스트가 이 경로를 가리킨다.

```bash
# 이 레포를 클론한 상태에서
ls .claude-plugin/marketplace.json       # 루트 마켓플레이스
ls packages/harness/plugin/.claude-plugin/plugin.json  # 플러그인 메타
```

Claude Code 에 로컬 마켓플레이스를 추가하고 플러그인을 설치한다 (정확한 명령은 Claude Code 버전에 따라 다르니 공식 문서 참조 — 이 레포가 제공하는 건 `marketplace.json` + `plugin/` 디렉토리까지).

확인:

```bash
# 설치가 잡히면 Claude Code 세션에서
/harness:mode show
```

기대 응답: 현재 mode 리포트 (아직 `/harness:init` 전이면 기본 안내).

---

## 1.2 프로젝트 초기화

프로젝트 루트(하네스를 적용하려는 디렉토리)에서:

```
/harness:init
```

대화형 질문이 시작된다 — **mode 선택**(standard / prototype / explore — [§7](07-modes.md)) 과 스택 감지.

결과:

```
your-project/
├── .harness/
│   ├── config.yaml           ← mode, safety, stack 등
│   ├── specs/                ← 앞으로 만들 spec 루트
│   ├── plans/                ← 앞으로 만들 plan 루트
│   ├── decisions/            ← ADR 루트
│   └── state/                ← 런타임 상태 · audit · events · traces
└── .claude/
    └── settings.json          ← 플러그인 활성화 확인
```

> `.harness/` 는 **하네스가 관리**하는 영역이고, `.claude/rules/` · `CLAUDE.md` 는 **유저 영역**이다. init 은 유저 영역을 덮어쓰지 않는다. 예시는 `skills/init/examples/` 에 있으니 참고만 하고 필요 시 복사.

---

## 1.3 첫 Feature 만들기 (Standard)

```
/harness:spec auth/login
```

Acceptance Criteria 4조건(Testable·Atomic·Binary·User-visible)을 만족하는 AC 들을 작성하면 `.harness/specs/auth/login.spec.yaml` 이 생긴다.

```
/harness:plan auth/login
```

Spec 의 모든 AC 가 step 에 매핑된 `.harness/plans/auth/login.plan.md` 가 생긴다.

```
/harness:implement auth/login
```

TDD 순서로(테스트 먼저) worktree 안에서 구현이 진행된다.

```
/harness:review auth/login
/harness:qa     auth/login
/harness:deploy auth/login
```

전체 흐름 상세는 [§3 Standard 워크플로우](03-standard-workflow.md).

---

## 1.4 Inspector 로 진행 상황 보기

하네스가 내뿜는 trace 를 브라우저에서 실시간 관찰:

```bash
# 이 레포 루트에서
pnpm install
pnpm inspector                     # http://localhost:3030

# 다른 프로젝트를 관찰하려면
HARNESS_PROJECT_DIR=/path/to/project pnpm inspector
```

대상 프로젝트에 아직 `.harness/` 가 없어도 Inspector 는 생성을 폴링 대기하므로 **먼저 띄우고 나중에 init** 해도 된다. 자세한 건 [§9 Observability](09-observability.md).

---

## 1.5 다음 단계

| 질문 | 바로가기 |
|------|--------|
| "도메인 A/B/C 가 뭔가?" | [§2 3개 도메인](02-domains.md) |
| "phase 전체 흐름을 보고 싶다" | [§3 Standard 워크플로우](03-standard-workflow.md) |
| "전체 명령 카탈로그" | [§6 치트시트](06-commands.md) |
| "기존 코드베이스인데 처음부터 다시?" | [§5 Migration](05-migration.md) |
| "막혔다" | [§11 트러블슈팅](11-troubleshooting.md) |

---

[인덱스](README.md) · 다음: [2. 3개 도메인 전체 그림 →](02-domains.md)
