# packages/harness 관리 규칙

> 이 문서는 `packages/harness/` 내 디렉터리별 관리 원칙을 정의한다.
> 버전 관리는 git tag로 한다. 버전별 사본이나 릴리즈 문서를 별도로 두지 않는다.

---

## 전체 구조

```text
packages/harness/
├── book/           단일 진실 — 설계 의도 + 현재 형상
├── bench/          검증
│   ├── specs/      인수 조건 명세
│   ├── tests/      결정론적 테스트
│   └── scenarios/  fixture 기반 시나리오
├── plugin/         배포 산출물
├── PLAN.md         현재 구현 계획
└── CONVENTIONS.md  이 문서
```

---

## 개발 워크플로우

```
book/ → PLAN.md → bench/ → plugin/ → git tag
  ①       ②        ③        ④         ⑤
```

| 단계 | 위치 | 하는 일 |
|------|------|---------|
| ① 목표 정의 | `book/` | 다음 버전의 목표 상태를 book/에 먼저 쓴다. 이 시점에서 book/은 plugin/보다 앞선다 |
| ② 경로 수립 | `PLAN.md` | book/과 plugin/의 gap을 어떤 순서로 닫을지 적는다. 상태를 `active`로 전환 |
| ③ 검증 정의 | `bench/` | **코드보다 먼저** 통과 기준을 정의: specs → tests → (scenarios). 테스트는 전부 실패 상태 |
| ④ 구현 | `plugin/` | bench의 테스트를 통과시키는 코드를 작성. gap이 줄어든다 |
| ⑤ 릴리즈 | git tag | gap = 0. plugin 메타데이터 version 올림. 마켓플레이스 `git tag vX.Y.Z` 반영 (루트 `README.md` 릴리스 이력 테이블 갱신) |

**핵심:** book/이 목표이고, 개발은 plugin/이 book/을 따라잡는 과정이다. gap이 0이 되면 book/은 곧 현재 형상의 문서가 된다.

**버전 간 변경 확인:** `git diff v0.1.0..v0.2.0 -- packages/harness/book/` — 이 diff가 곧 릴리즈 노트다.

---

## book/

단일 진실. 하네스의 설계 의도와 현재 형상을 하나의 문서 세트로 관리한다.

| 규칙 | 설명 |
|------|------|
| 네이밍 | `NN-이름.md` (예: `00-overview.md`). 번호는 논리적 읽기 순서 |
| 포맷 | Markdown. 시각 자료가 필요하면 HTML 허용 |
| 갱신 시점 | **구현 전**(① 목표 정의)에 목표 상태를 쓰고, **구현 후**(④ 완료) gap이 0이 되면 book/이 현재 형상이 됨 |
| 변경 추적 | Git 이력. 별도 changelog 없음 |
| 폐기 | 대체된 설계는 상단에 `> deprecated: NN-새문서.md 참조` 표기 |
| 왜곡 금지 | 현재 형상과 다른 내용을 쓰지 않는다. 목표 상태를 쓸 때는 아직 구현되지 않은 부분임이 명확해야 한다 |

---

## PLAN.md

현재 구현 계획. 단일 파일로 유지한다. 과거 계획은 git 이력으로 복원한다.

| 규칙 | 설명 |
|------|------|
| 역할 | book/과 plugin/의 gap을 닫는 경로(순서, 의존관계, 규모 추산) |
| 필수 헤더 | `작성일`, `상태`, `버전` |
| 갱신 | 계획이 바뀌면 직접 수정. 별도 파일을 만들지 않는다 |

### 상태 정의

| 상태 | 의미 | Agent 행동 |
|------|------|-----------|
| `draft` | 초안. 아직 합의되지 않음 | 참고만 가능. 이 계획에 따라 실행하지 않는다 |
| `active` | 승인됨. 현재 실행 중 | 이 계획에 따라 작업한다 |
| `drift` | 실행 중이나 현실과 어긋남 | 계획을 따르지 않는다. 사용자에게 갱신 필요를 알린다 |
| `done` | 완료 | 다음 계획으로 덮어쓴다 |

**전환:** `draft → active → done`. 현실과 어긋나면 `active → drift → active`(갱신 후).

---

## bench/

하네스의 검증 공간. 명세 → 테스트 → 시나리오를 한곳에 둔다.

### bench/specs/

| 규칙 | 설명 |
|------|------|
| 네이밍 | `{대상}-{종류}.spec.yaml` (예: `init-skill.spec.yaml`) |
| 포맷 | YAML |
| 필수 필드 | `id`, `name`, `version`, `layer`, `description`, `acceptance_criteria` |
| AC 구조 | `id` (예: `AC-I01`), `desc`, `testable` |
| 대응 원칙 | spec 하나 ↔ `bench/tests/`에 대응 테스트 최소 1개 |
| 버전 | spec 변경 시 `version` 올림 |

### bench/tests/

| 규칙 | 설명 |
|------|------|
| 네이밍 | `{이름}.test.mjs`. 하위 디렉터리로 도메인 분류 |
| 런타임 | `node --test` (node:test 모듈) |
| 결정론 | 외부 서비스, 네트워크, 랜덤 의존 금지 |
| spec 연결 | 테스트 파일 상단에 대응 spec id 주석 권장 |

### bench/scenarios/

| 규칙 | 설명 |
|------|------|
| 구조 | `{시나리오명}/fixtures/` + `{시나리오명}/expected/` |
| 용도 | fixture 프로젝트를 입력으로, expected를 정답으로 사용하는 흐름 검증 |
| 크기 | fixture는 최소한의 파일로 구성. 불필요한 node_modules, 빌드 산출물 금지 |

---

## plugin/

실제 배포/설치 대상. 이 디렉터리가 곧 Claude Code 플러그인이다.

| 규칙 | 설명 |
|------|------|
| 변경 기준 | spec과 test를 먼저 작성한 뒤 plugin/ 코드를 수정 |
| 구조 변경 | plugin.json, settings.json, hooks.json 변경 시 book/ 갱신 |
| **파이프라인 완결** | 스킬·스크립트·기능 추가/변경 시 **반드시** book/ → bench/ → plugin/ 전체를 갱신한다. plugin/ 파일만 만들고 끝내는 것은 금지. 아래 체크리스트 참조 |
| 참조 금지 | plugin/은 bench/, book/을 참조하지 않는다. 역방향만 허용 |

### plugin/ 변경 시 파이프라인 체크리스트

plugin/에 변경이 발생하면 아래 항목을 **모두** 확인하고, 해당하는 것은 같은 작업 내에서 갱신한다.

| # | 확인 대상 | 예시 |
|---|----------|------|
| 1 | **book/** — 관련 설계 문서 | workflow 순서, skill catalog, agent matrix, state schema, dashboard, CLI reference |
| 2 | **bench/specs/** — 인수 조건 명세 | 새 스킬이면 `{skill}-skill.spec.yaml` 필요 여부 |
| 3 | **bench/tests/** — 결정론적 테스트 | 새 스크립트의 exit code, 출력 포맷 검증 |
| 4 | **gap 검증** — book/과 plugin/ 괴리 없음 | phase enum, 카탈로그 테이블, Mermaid 다이어그램 등 |

---

## 공통

1. **모든 문서는 git으로 버전 관리한다.** 과거 상태는 git tag + diff로 복원/확인.
2. **실행 코드는 plugin/과 bench/에만.** book/에는 .mjs/.js/.ts 금지 (HTML 예외).
3. **교차 참조는 상대경로.** 같은 packages/harness/ 내에서는 `../book/02-architecture.md` 형식.
4. **한국어 우선.** 본문은 한국어. 코드, 필드명, CLI 명령은 영어.
