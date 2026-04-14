# Context Window — 컨텍스트 윈도우 시뮬레이션

---

컨텍스트 윈도우(200K 토큰)가 세션 동안 어떻게 채워지는지를 시뮬레이션한 문서다.
각 이벤트가 언제, 얼마나, 어떤 가시성으로 컨텍스트에 들어오는지 보여준다.

---

## 1. 세션 시작 — 자동 로드 (전체의 ~20%)

사용자 프롬프트 전에 자동으로 채워지는 항목들:

| 순서 | 항목 | 토큰 예시 | 가시성 | 설명 |
|------|------|----------|--------|------|
| 1 | System prompt | ~4,200 | 숨김 | 행동, 도구 사용, 응답 포맷 핵심 지침. 사용자에게 보이지 않음 |
| 2 | Auto memory (MEMORY.md) | ~680 | 숨김 | 이전 세션에서 학습한 빌드 명령, 패턴, 실수. 200줄/25KB 제한 |
| 3 | Environment info | ~280 | 숨김 | 작업 디렉토리, 플랫폼, 셸, OS, git 여부. git 상태는 시스템 프롬프트 끝에 별도 로드 |
| 4 | MCP tools (deferred) | ~120 | 숨김 | 도구 이름만. 스키마는 온디맨드. `ENABLE_TOOL_SEARCH=auto`면 10% 이내일 때 선로드, `=false`면 전부 로드 |
| 5 | Skill descriptions | ~450 | 숨김 | 사용 가능한 스킬의 한줄 설명. `disable-model-invocation: true`인 스킬은 제외. **`/compact` 후 재주입되지 않음** — 호출된 스킬만 보존 |
| 6 | ~/.claude/CLAUDE.md | ~320 | 숨김 | 글로벌 개인 지침 |
| 7 | Project CLAUDE.md | ~1,800 | 숨김 | 프로젝트 규칙, 빌드 명령, 아키텍처 |

**시작 시 합계: ~7,850 토큰 (전체의 ~4%)**

> [insight] Skill descriptions는 `/compact` 후 재주입되지 않는다. 즉 긴 세션에서 compact가 발생하면 미사용 스킬의 설명이 사라져서 Claude가 해당 스킬을 자동 호출할 수 없게 된다. 실제로 호출한 스킬만 compact 이후에도 살아남는다. 장기 세션에서 스킬 의존도가 높다면 이 점을 고려해야 한다.

---

## 2. 작업 중 — 컨텍스트 누적

### 파일 읽기 (가장 큰 비용)

| 이벤트 | 토큰 | 가시성 |
|--------|------|--------|
| Read src/api/auth.ts | 2,400 | 한줄 표시 (내용은 Claude만 봄) |
| Read src/lib/tokens.ts | 1,100 | 한줄 표시 |
| Read middleware.ts | 1,800 | 한줄 표시 |
| Read auth.test.ts | 1,600 | 한줄 표시 |
| grep "refreshToken" | 600 | 한줄 표시 |

> 파일 읽기가 컨텍스트의 대부분을 차지한다. 프롬프트에서 구체적으로 지정("auth.ts의 버그 고쳐")하면 불필요한 파일 읽기를 줄일 수 있다. 리서치 작업은 subagent 위임이 효과적.

### Rules 자동 로드 (paths 매칭)

| 이벤트 | 토큰 | 트리거 |
|--------|------|--------|
| Rule: api-conventions.md | 380 | `src/api/**` 패턴 → auth.ts 읽을 때 |
| Rule: testing.md | 290 | `*.test.ts` 패턴 → auth.test.ts 읽을 때 |

### Claude 작업

| 이벤트 | 토큰 | 가시성 |
|--------|------|--------|
| Claude 분석 | 800 | 전체 표시 |
| Edit auth.ts | 400 | diff 전체 표시 |
| Edit auth.test.ts | 600 | diff 전체 표시 |
| npm test output | 1,200 | 한줄 표시 (전체 출력은 Claude만 봄) |
| Summary | 400 | 전체 표시 |

### Hooks (루프 밖 실행)

| 이벤트 | 토큰 | 설명 |
|--------|------|------|
| Hook: prettier (1회차) | 120 | PostToolUse 훅. `hookSpecificOutput.additionalContext`로 Claude에 정보 전달 |
| Hook: prettier (2회차) | 100 | 같은 훅이 매 매칭 이벤트마다 발화 |

> [insight] Hook의 stdout은 exit 0일 때 디버그 로그에만 기록되고 컨텍스트에 들어가지 않는다. Claude에 정보를 전달하려면 JSON의 `additionalContext` 필드를 사용해야 한다. PostToolUse 훅은 exit code 2로 stderr를 에러로 표시할 수 있지만, 이미 실행된 도구를 차단할 수는 없다. 출력은 truncation 없이 컨텍스트에 들어가므로 간결하게 유지해야 한다.

---

## 3. Subagent — 격리된 컨텍스트

메인 컨텍스트에 80 토큰(스폰 비용)만 쓰고, 실제 작업은 별도 윈도우에서 진행:

**Subagent 내부 컨텍스트:**

| 항목 | 서브에이전트 토큰 | 설명 |
|------|-----------------|------|
| System prompt | 900 | 메인보다 짧음. 메인의 auto memory는 미포함. `memory:` frontmatter 있으면 자체 MEMORY.md 로드 |
| Project CLAUDE.md | 1,800 | 같은 파일이지만 서브에이전트 컨텍스트에서 소비. 빌트인 Explore/Plan 에이전트는 이를 건너뜀 |
| MCP tools + skills | 970 | 부모의 대부분 도구 접근. plan-mode, 백그라운드 작업, Agent 도구(재귀 방지)는 제외 |
| Task prompt | 120 | 메인 Claude가 작성한 작업 지시 |
| Read session.ts | 2,200 | 파일 읽기 — 메인에 영향 없음 |
| Read timeouts.ts | 800 | 〃 |
| Read config/*.ts | 3,100 | 〃 |

**메인에 반환: 420 토큰 (요약 + 메타데이터)**

서브에이전트가 읽은 6,100 토큰 → 메인에는 420 토큰만 = **컨텍스트 절약의 핵심**

---

## 4. 사용자 개입 수단

| 수단 | 토큰 | 설명 |
|------|------|------|
| `!git status` | 180 | `!` 접두사로 셸 명령 직접 실행. 명령 + 출력이 사용자 메시지로 컨텍스트에 진입. Claude가 실행하는 것과 달리 사용자가 결과를 보여주는 방식 |
| `/commit-push` | 620 | `disable-model-invocation: true` 스킬. 시작 시 비용 0이다가 호출 시점에 전체 로드 |

---

## 5. Compact — 컨텍스트 압축

`/compact` 실행 시:

```
압축 전: 시작 자동 로드 + 대화 이벤트 전체 (토큰 N)
                    ↓
압축 후: 시작 자동 로드(noSurviveCompact 제외) + 대화 요약 (~N × 12%)
```

**요약에 보존되는 것:**
- 사용자 요청과 의도
- 핵심 기술 개념
- 검토/수정된 파일과 중요 코드 스니펫
- 에러와 해결 방법
- 미완료 작업, 현재 진행 상황

**사라지는 것:**
- 도구 출력 원문
- 중간 추론 과정
- **Skill descriptions** (호출된 것만 보존)
- Subagent 이벤트 (sub 종류는 compact 대상에서 제외되지만 메인에 반환된 요약은 포함)

> [insight] compact 시 대화 내용이 원래 토큰의 ~12%로 압축된다. 시작 자동 로드(system prompt, memory, CLAUDE.md 등)는 재주입되지만 Skill descriptions는 재주입되지 않는다. 이는 compact 후 Claude가 스킬 자동 판단 능력을 잃는다는 의미다. 장기 세션에서는 compact 이후 필요한 스킬을 수동(`/name`)으로 호출해야 할 수 있다.

---

## 6. 가시성 3단계

터미널에서 사용자가 보는 것과 실제 컨텍스트에 들어가는 것은 다르다:

| 가시성 | 터미널 표시 | 컨텍스트 진입 |
|--------|-----------|-------------|
| **hidden** (숨김) | 안 보임 | 전체 내용 진입 |
| **brief** (한줄) | 한줄 요약만 | 전체 내용 진입 |
| **full** (전체) | 전체 표시 | 전체 내용 진입 |

> 터미널에서 한줄로 보이는 파일 읽기도 실제로는 수천 토큰이 컨텍스트를 차지하고 있다. 사용자가 인지하는 비용과 실제 비용의 괴리가 크다.

---

## 7. MCP tool search 옵션

| 환경변수 | 동작 |
|---------|------|
| `ENABLE_TOOL_SEARCH` (기본) | 이름만 로드, 온디맨드 스키마 |
| `ENABLE_TOOL_SEARCH=auto` | 10% 이내면 스키마 선로드, 초과 시 deferred |
| `ENABLE_TOOL_SEARCH=false` | 모든 스키마 즉시 로드 |
