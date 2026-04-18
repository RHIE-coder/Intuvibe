# 6. 슬래시 명령 치트시트

> `/harness:*` 스킬 16종. 인자·플래그·Gate 전제를 한눈에. 상세는 각 `SKILL.md` 또는 [`../book/06-cli-reference.md`](../book/06-cli-reference.md).

---

## 6.1 호출 규약

- 형식: `/{plugin}:{skill}` — 단일 콜론. 그룹 스킬은 git-style: `/harness:migrate init`.
- 인자: 위치 인자는 `<domain>/<feature>` 경로. 플래그는 `--flag <value>` 또는 `--flag`.
- 리스트 값: 쉼표 구분 (`--only unit,load`).
- Exit codes: `0`=성공, `2`=Gate/정책 블록, 그 외=내부 오류.
- Audit: 자동 판단은 전부 `.harness/state/audit.jsonl` 에 기록.

---

## 6.2 카테고리별 요약

### Workflow (phase 기반)

| 스킬 | Phase | 주 동작 | 주요 인자 / 플래그 | Gate 전제 |
|------|-------|--------|-----------------|----------|
| `/harness:init` | 0 setup | 하네스 스캐폴드 | `--mode`, `--stack`, `--from-existing` | — |
| `/harness:brainstorm` | 1 discovery | 페르소나 기반 탐색 | `<topic>`, `--personas`, `--rounds` | init |
| `/harness:scope` | 2 scope | Domain/Section 맵 | `--from-brainstorm` | init |
| `/harness:spec` | 3 spec | AC 명세 | `<d>/<f>`, `--from-brainstorm`, `--edit`, `--status` | init |
| `/harness:architect` | 4 design | ADR 작성 | `<d>/<f>`, `--force-size` | spec, size≥medium |
| `/harness:ux` | 4 design | UI/UX ADR | `<d>/<f>`, `--platform` | spec |
| `/harness:plan` | 6 plan | 태스크 분해 | `<d>/<f>`, `--from-spec` | G1 spec |
| `/harness:implement` | 7 sprint | TDD 구현 | `<d>/<f>`, `--step`, `--no-worktree` | G1, G2 |
| `/harness:review` | 7 sprint | 4종 병렬 리뷰 | `<d>/<f>`, `--depth` | implement 완료 |
| `/harness:qa` | 7 sprint | 다축 QA | `<d>/<f>`, `--all`/`--only`/`--exclude`/`--skip`, `--force-size`, `--reason` | G3, review PASS |
| `/harness:deploy` | 8 deploy | 배포 게이트 | `<target>`, `--dry-run` | G4 qa.passed |
| `/harness:sync` | 9 sync | 코드↔Spec 동기화 | `--from <commit>`, `--promote`, `--schedule`, `--dry-run` | — |
| `/harness:refactor` | — | 행동 보존 리팩토링 | `<d>/<f>`, `--size`, `--bypass-coverage`, `--bypass-invariant`, `--reason` | coverage ≥ min |
| `/harness:migrate <sub>` | — | 기존 프로젝트 편입 | `{init\|analyze\|extract-spec\|gen-test}` | sub 별 |

### Config / Meta

| 스킬 | 동작 | 주요 인자 |
|------|------|---------|
| `/harness:mode` | mode 조회·수동 전환 | `{show\|set <standard\|prototype\|explore>}` |
| `/harness:persona <sub>` | 페르소나 관리 | `{create\|list\|edit\|delete}` |

---

## 6.3 전형적 시퀀스

### 신규 feature (Standard)

```
/harness:spec auth/login
/harness:architect auth/login         # medium+ 일 때
/harness:plan auth/login
/harness:implement auth/login
/harness:review auth/login
/harness:qa auth/login
/harness:deploy auth/login
```

### 기존 feature 수정

```
/harness:spec auth/login --edit       # AC 추가/변경
/harness:plan auth/login              # 영향 step 재계산
/harness:implement auth/login --step 3
/harness:review auth/login --depth deep
/harness:qa auth/login
```

### 코드 직접 수정 후 재동기화

```
git commit ...                        # 유저가 직접 수정
/harness:sync                         # 괴리 리포트 → spec 업데이트 제안
```

### Prototype → Standard

```
/harness:sync --promote               # 역추출 + mode 전환
/harness:qa auth/login                # 기존 feature Gate 재검증
```

### 실험적 QA

```
/harness:qa auth/login --only unit,integration
/harness:qa auth/login --all --force-size large
/harness:qa auth/login --exclude load --reason "infra 점검"
```

---

## 6.4 공통 플래그 패턴

| 플래그 | 의미 | 쓰는 이유 |
|--------|------|---------|
| `--force-size <s>` | 이 호출 1회만 Right-Size 덮어쓰기 | 매트릭스를 바꾸지 않고 실험 |
| `--reason "..."` | 정책 우회 사유 기록 | audit 에 남김 (감사 경로 확보) |
| `--bypass-*` | 특정 검증 우회 | Escape Hatch — 반드시 `--reason` 동반 |
| `--dry-run` | 시뮬레이션만 | deploy / sync 에서 먼저 영향 확인 |

---

## 6.5 상세 문서 찾기

- 각 스킬의 `SKILL.md`: `packages/harness/plugin/skills/<name>/SKILL.md`
- 인자·플래그 풀셋: [`../book/06-cli-reference.md`](../book/06-cli-reference.md) (모든 skill 의 모든 플래그)

---

[← 이전: 5. Migration](05-migration.md) · [인덱스](README.md) · [다음: 7. Modes →](07-modes.md)
