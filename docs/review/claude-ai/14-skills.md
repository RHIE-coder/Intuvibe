# Skills — 스킬 시스템

---

스킬은 `SKILL.md` 파일로 Claude의 능력을 확장하는 장치다.
Claude가 관련성을 판단해 자동 로드하거나, 사용자가 `/skill-name`으로 직접 호출한다.
[Agent Skills](https://agentskills.io) 오픈 스탠다드를 따르며, Claude Code는 호출 제어, 서브에이전트 실행, 동적 컨텍스트 주입 등을 추가 지원한다.

> `.claude/commands/`의 커스텀 커맨드는 스킬로 통합됨. 기존 파일은 그대로 동작하지만, 같은 이름이면 스킬이 우선.

---

## 1. 번들 스킬 (빌트인)

모든 세션에서 사용 가능. 빌트인 커맨드와 달리 **프롬프트 기반**으로 Claude가 도구를 조합해 실행.

| 스킬 | 용도 |
|------|------|
| `/batch <instruction>` | 코드베이스 전체 대규모 변경을 병렬 실행. 5-30 단위로 분해 → 각각 격리 worktree에서 에이전트 → PR 생성. git 필수 |
| `/claude-api` | Claude API/SDK 레퍼런스 로드. anthropic 임포트 감지 시 자동 활성화 |
| `/debug [description]` | 디버그 로깅 활성화 + 세션 로그 분석 |
| `/loop [interval] <prompt>` | 반복 실행. 배포 모니터링, PR 감시 등. 세션 종료 시 취소 |
| `/simplify [focus]` | 최근 변경 파일의 코드 재사용/품질/효율성 리뷰. 3개 리뷰 에이전트 병렬 → 집계 → 수정 |

---

## 2. 스킬 배치 위치와 우선순위

| 위치 | 경로 | 적용 범위 |
|------|------|----------|
| **Enterprise** | managed settings | 조직 전체 |
| **Personal** | `~/.claude/skills/<name>/SKILL.md` | 전 프로젝트 (개인) |
| **Project** | `.claude/skills/<name>/SKILL.md` | 현재 프로젝트 |
| **Plugin** | `<plugin>/skills/<name>/SKILL.md` | 플러그인 활성 범위 |

우선순위: enterprise > personal > project. Plugin은 `plugin:skill` 네임스페이스로 충돌 없음.

모노레포: 하위 디렉토리의 `.claude/skills/`도 자동 발견 (해당 디렉토리 파일 작업 시).
`--add-dir`의 `.claude/skills/`도 로드됨 (다른 .claude/ 설정과 달리 예외).

---

## 3. 스킬 구조

```
my-skill/
├── SKILL.md           # 진입점 (필수)
├── template.md        # Claude가 채울 템플릿
├── examples/
│   └── sample.md      # 기대 출력 예시
└── scripts/
    └── validate.sh    # Claude가 실행할 스크립트
```

번들 파일은 SKILL.md에서 참조해야 Claude가 인지.

---

## 4. Frontmatter 전체

| 필드 | 필수 | 설명 |
|------|------|------|
| `name` | - | `/` 커맨드명. 생략 시 디렉토리명. 소문자+하이픈, 64자 |
| `description` | 권장 | Claude가 자동 호출 판단에 사용. 250자에서 잘림. **핵심을 앞에 배치** |
| `argument-hint` | - | 자동완성 시 인자 힌트. 예: `[issue-number]` |
| `disable-model-invocation` | - | `true` = 사용자만 호출 가능. Claude 자동 호출 차단 |
| `user-invocable` | - | `false` = `/` 메뉴에서 숨김. Claude만 호출 |
| `allowed-tools` | - | 스킬 활성 시 승인 없이 사용 가능한 도구. 스페이스 구분 또는 YAML 리스트 |
| `model` | - | 스킬 활성 시 사용 모델 |
| `effort` | - | effort 오버라이드: `low`/`medium`/`high`/`max` |
| `context` | - | `fork` = 격리 서브에이전트에서 실행 |
| `agent` | - | `context: fork` 시 사용할 서브에이전트 타입 |
| `hooks` | - | 스킬 라이프사이클 훅 |
| `paths` | - | glob 패턴. 매칭 파일 작업 시에만 자동 로드 |
| `shell` | - | `bash`(기본) 또는 `powershell` |

### 문자열 치환

| 변수 | 설명 |
|------|------|
| `$ARGUMENTS` | 전체 인자 |
| `$ARGUMENTS[N]` / `$N` | N번째 인자 (0-based) |
| `${CLAUDE_SESSION_ID}` | 현재 세션 ID |
| `${CLAUDE_SKILL_DIR}` | SKILL.md가 위치한 디렉토리 경로 |

---

## 5. 호출 제어 — 누가 쓸 수 있나

| 설정 | 사용자 호출 | Claude 호출 | 컨텍스트 로딩 |
|------|-----------|-----------|-------------|
| (기본) | O | O | 설명 항상 로드, 전체는 호출 시 |
| `disable-model-invocation: true` | O | X | 설명도 컨텍스트에 안 올라감, 호출 시만 로드 |
| `user-invocable: false` | X | O | 설명 항상 로드, 전체는 호출 시 |

**사이드이펙트 있는 스킬** (deploy, commit, Slack 전송) → `disable-model-invocation: true` 필수.

---

## 6. 두 종류의 스킬 콘텐츠

### 참조형 — Claude가 작업에 적용할 지식

```yaml
---
name: api-conventions
description: API design patterns for this codebase
---
When writing API endpoints:
- Use RESTful naming conventions
- Return consistent error formats
```

### 작업형 — 특정 액션의 단계별 지시

```yaml
---
name: deploy
description: Deploy the application to production
context: fork
disable-model-invocation: true
---
Deploy the application:
1. Run the test suite
2. Build the application
3. Push to the deployment target
```

---

## 7. 동적 컨텍스트 주입 (`` !`command` ``)

셸 명령을 **전처리**로 실행, 출력을 스킬 콘텐츠에 삽입. Claude가 실행하는 게 아니라 Claude가 보기 전에 결과가 치환됨.

```yaml
---
name: pr-summary
description: Summarize changes in a pull request
context: fork
agent: Explore
---
## Pull request context
- PR diff: !`gh pr diff`
- PR comments: !`gh pr view --comments`

## Your task
Summarize this pull request...
```

멀티라인:
````
```!
node --version
npm --version
git status --short
```
````

비활성화: `"disableSkillShellExecution": true` (managed settings에서 사용자 오버라이드 불가).

---

## 8. 서브에이전트에서 스킬 실행 (`context: fork`)

스킬이 격리 서브에이전트에서 실행. 대화 히스토리 접근 불가.

```yaml
---
name: deep-research
description: Research a topic thoroughly
context: fork
agent: Explore
---
Research $ARGUMENTS thoroughly:
1. Find relevant files using Glob and Grep
2. Read and analyze the code
3. Summarize findings with specific file references
```

| 방식 | 시스템 프롬프트 | 작업 | 추가 로드 |
|------|-------------|------|---------|
| **Skill + `context: fork`** | agent 타입의 프롬프트 | SKILL.md 내용 | CLAUDE.md |
| **Subagent + `skills:` 필드** | 서브에이전트 본문 | Claude의 위임 메시지 | 프리로드 스킬 + CLAUDE.md |

`agent` 옵션: `Explore`, `Plan`, `general-purpose`, 또는 `.claude/agents/`의 커스텀 에이전트.

---

## 9. 스킬 접근 제한

```
# 전체 비활성화 (deny rule)
Skill

# 특정 스킬만 허용
Skill(commit)
Skill(review-pr *)

# 특정 스킬 차단
Skill(deploy *)
```

---

## 10. 스킬 설명 예산

설명은 컨텍스트 윈도우의 **1%** (fallback 8,000자) 예산 내에서 로드.
스킬이 많으면 설명이 잘림 → Claude가 매칭 실패 가능.

- `SLASH_COMMAND_TOOL_CHAR_BUDGET` 환경변수로 예산 조정
- 각 설명은 250자에서 잘림 → **핵심을 앞에 배치**

---

## 11. 시각적 출력 생성 패턴

스킬에 스크립트를 번들 → Claude가 실행 → HTML 등 시각적 결과물 생성.

```
codebase-visualizer/
├── SKILL.md
└── scripts/
    └── visualize.py    # Python 스크립트
```

SKILL.md에서 `python ${CLAUDE_SKILL_DIR}/scripts/visualize.py .` 실행 지시.
의존성 그래프, 테스트 커버리지, API 문서, DB 스키마 시각화 등에 활용.

> [insight] 스킬 설명은 컨텍스트 윈도우의 1% 예산 안에서 로드된다. 스킬이 많아지면 설명이 잘려서 Claude가 올바른 스킬을 매칭하지 못할 수 있다. 각 설명은 250자 캡이므로 **핵심 용도를 첫 문장에** 배치해야 한다. `SLASH_COMMAND_TOOL_CHAR_BUDGET`으로 예산을 늘릴 수 있지만, 근본적으로는 스킬 수를 관리하고 설명을 간결하게 유지하는 것이 중요하다.

> [insight] `disable-model-invocation: true`인 스킬은 설명조차 컨텍스트에 올라가지 않는다. 이는 컨텍스트 비용이 완전히 0이라는 의미. 수동 전용 스킬(deploy, commit 등)은 이 설정으로 컨텍스트 절약과 안전성을 동시에 확보할 수 있다.

> [insight] `` !`command` `` 동적 주입은 Claude가 실행하는 게 아니라 **전처리 단계**에서 실행된다. Claude는 결과만 본다. 이는 `@path` 임포트와 유사한 패턴이지만, 파일 내용이 아닌 명령 출력을 주입한다는 차이. `disableSkillShellExecution: true`로 managed settings에서 비활성화 가능 (보안).

> [insight] `/batch`는 코드베이스 전체 대규모 변경을 5-30 단위로 분해하여 각각 격리 worktree + 에이전트 + PR 생성까지 자동화하는 번들 스킬이다. 하네스에서 대규모 마이그레이션이나 일괄 변환 작업을 설계할 때 이 패턴을 참고할 수 있다.
