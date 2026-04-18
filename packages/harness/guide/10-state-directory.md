# 10. `.harness/` 디렉토리 해부

> `/harness:init` 이 만드는 하네스 영역의 구조와 각 파일·디렉토리의 역할.

---

## 10.1 전체 트리

```
your-project/
├── .harness/                         ← 하네스가 관리 (protect-harness 로 보호)
│   ├── config.yaml                   ← mode, safety, stack, testing 등
│   ├── specs/
│   │   ├── 00-overview.md            ← /harness:scope 산출물
│   │   └── {domain}/
│   │       └── {feature}.spec.yaml   ← /harness:spec 산출물
│   ├── plans/
│   │   └── {domain}/
│   │       └── {feature}.plan.md     ← /harness:plan 산출물
│   ├── decisions/
│   │   └── {nnn}-{title}.md          ← /harness:architect, /harness:ux 의 ADR
│   ├── brainstorms/
│   │   └── {YYYY-MM-DD}-{slug}.md    ← /harness:brainstorm 산출물
│   └── state/
│       ├── workflow.json             ← 현재 phase, gate 통과 여부
│       ├── coverage.json             ← AC ↔ step ↔ test 추적
│       ├── audit.jsonl               ← 정책 감사 (append-only)
│       ├── qa-log.jsonl              ← QA 실행/skip 이력
│       ├── events/
│       │   └── {domain}/{feature}/
│       │       └── {YYYY-MM}.jsonl   ← feature lifecycle
│       └── traces/
│           └── {session_id}.jsonl    ← 세션별 execution trace
├── .claude/
│   ├── settings.json                 ← 플러그인 활성화
│   ├── rules/                        ← 유저 영역 — init 이 만들지 않음
│   └── agents/                       ← /harness:persona 가 관리
└── CLAUDE.md                         ← 유저 영역 — init 이 만들지 않음
```

---

## 10.2 파일별 역할

### config.yaml

세션마다 읽히는 설정. 주요 키:

| 키 | 의미 |
|----|------|
| `workflow.mode` | `standard` / `prototype` / `explore` / `auto` |
| `safety.*` | 파괴적 명령 차단 토글 (기본 전부 on) |
| `audit.path`, `audit.rotate_mb`, `audit.retention_days` | audit 파일 관리 |
| `audit.redact_fields` | 이벤트 기록 전 마스킹할 필드 |
| `testing.scope.mode` | QA 실행 범위 정책 (`auto`/`manual`) |
| `testing.skip_required_policy` | 필수 테스트 skip 시 동작 (`block_deploy`/`warn`/`allow`) |
| `refactor.min_coverage` | refactor 전제 조건 |

### specs/

- `00-overview.md` — 프로젝트 전체 scope (Domain × Section Map). `/harness:scope` 산출물.
- `{domain}/{feature}.spec.yaml` — 개별 feature 의 AC 리스트. 필수 필드: `id`, `name`, `version`, `status`, `acceptance_criteria[].id/desc/testable`.

### plans/

`{domain}/{feature}.plan.md` — step 리스트 + AC 매핑. Iron Law G6 가 실질성 검증(step ≥ 1, 모든 AC 매핑).

### decisions/

ADR 형식. `{nnn}-{title}.md` — 결정, 이유, 대안 검토, 관련 AC. `/harness:architect`, `/harness:ux` 가 생성.

### state/workflow.json

현재 세션의 phase 포인터 + gate 통과 기록. SessionStart 의 `load-state.mjs` 가 읽고, Stop 의 `update-workflow.mjs` 가 갱신.

예시:

```json
{
  "session_id": "abc-123",
  "mode": "standard",
  "phases": {
    "auth/login": {
      "spec": "passed",
      "plan": "passed",
      "implement": "in_progress",
      "qa": "pending",
      "deploy": "pending"
    }
  }
}
```

### state/coverage.json

AC ↔ step ↔ test 의 3-way 매핑. `/harness:spec` 이 AC 엔트리를 등록하고, `/harness:plan` 이 step 연결, `/harness:implement` 가 test 연결.

### state/audit.jsonl

정책 판단 append-only 로그. 90일(기본) 후 rotation.

### state/events/

Feature lifecycle 이벤트. 월별 파티션이라 쿼리·보관 관리 단순.

### state/traces/

세션별 timeline. **Inspector 가 읽는 대상.** 큰 세션은 100KB~MB 단위로 커짐.

---

## 10.3 하네스가 보호하는 영역

`protect-harness.mjs` (PreToolUse Edit|Write matcher) 가 다음을 감지하면 `exit(2)` 로 차단:

- `.harness/**` 를 사용자 tool 로 직접 수정 시도 (유저가 실수로 덮어쓰는 것 방지).
- 스크립트 내부에서의 쓰기는 허용 (writer 스크립트 경로는 예외).

필요해서 수정해야 한다면:

- `config.yaml` — 유저가 직접 편집 허용.
- spec/plan/decision — 해당 `/harness:*` 스킬로 편집 (`--edit` 플래그).
- state/* — **직접 수정 금지.** 문제가 있으면 `/harness:sync` 로 재구성.

---

## 10.4 .gitignore 권장

```gitignore
.harness/state/traces/
.harness/state/*.jsonl
# events/ 는 팀 공유가 필요하면 커밋, 개인 로그면 제외
```

- `specs/`, `plans/`, `decisions/`, `brainstorms/`, `config.yaml`, `state/workflow.json`, `state/coverage.json` 은 **커밋 권장** — 재현과 감사에 필요.
- `audit.jsonl`, `traces/` 는 로컬 관측용이라 보통 ignore.

---

## 10.5 유저 영역 vs 하네스 영역

| 영역 | 주인 | 하네스 touch? |
|------|------|-------------|
| `.harness/` | 하네스 | ✅ 기록·갱신. 유저 직접 수정은 최소화 |
| `.claude/settings.json` | Claude Code | ✅ init 시 확인 |
| `.claude/rules/` | 유저 | ❌ **자동 생성 안 함.** 예시만 복사 안내 |
| `.claude/agents/` | 유저 + `/harness:persona` | `persona` 스킬만 touch |
| `CLAUDE.md` | 유저 | ❌ 자동 생성 안 함. 카탈로그는 SessionStart hook 이 additionalContext 로 주입 |

---

## 10.6 참고

- 상세: [`../book/05-project-structure.md`](../book/05-project-structure.md)
- State & Audit 설계: [`../book/10-state-and-audit.md`](../book/10-state-and-audit.md)
- Observability: [§9](09-observability.md)

---

[← 이전: 9. Observability](09-observability.md) · [인덱스](README.md) · [다음: 11. 트러블슈팅 →](11-troubleshooting.md)
