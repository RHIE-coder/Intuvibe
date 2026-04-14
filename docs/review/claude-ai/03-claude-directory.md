# .claude 디렉토리 구조

---

Claude Code가 읽고 쓰는 모든 설정/확장 파일의 위치와 역할을 정리한다.
프로젝트 레벨(`.claude/`)과 글로벌 레벨(`~/.claude/`)로 나뉘며, 같은 이름의 파일이 양쪽에 있을 때 우선순위가 적용된다.

---

## 1. 프로젝트 레벨 (`your-project/`)

### 루트 파일

| 파일 | 공유 | 역할 | 로딩 시점 |
|------|------|------|----------|
| `CLAUDE.md` | committed | 프로젝트 지침서. Claude가 매 세션 읽음 | 세션 시작 |
| `.mcp.json` | committed | 팀 공유 MCP 서버 설정 | 세션 시작 (스키마는 deferred) |
| `.worktreeinclude` | committed | worktree 생성 시 복사할 gitignored 파일 목록 (.gitignore 문법) | worktree 생성 시 |

- `CLAUDE.md` — 200줄 이하 유지. `.claude/CLAUDE.md`에 둬도 됨
- `.mcp.json` — 시크릿은 `${ENV_VAR}` 참조. 개인용은 `claude mcp add --scope user` → `~/.claude.json`에 저장
- `.worktreeinclude` — `.env`, `config/secrets.json` 등 gitignored 파일을 worktree에 자동 복사

### `.claude/` 내부

```
.claude/
├── settings.json          [committed]  팀 공유 설정 (permissions, hooks, model, env, outputStyle, statusLine)
├── settings.local.json    [gitignored] 개인 오버라이드. 팀 settings.json 위에 덮어씀
├── rules/                 [committed]  조건부 지침 파일
│   ├── testing.md                      paths: "**/*.test.ts" → 테스트 파일 작업 시만 로드
│   └── api-design.md                   paths: "src/api/**/*.ts" → API 코드 작업 시만 로드
├── skills/                [committed]  재사용 가능한 워크플로우
│   └── security-review/
│       ├── SKILL.md                    진입점. frontmatter로 호출 조건 설정
│       └── checklist.md               번들 파일. Claude가 온디맨드로 읽음
├── commands/              [committed]  단일 파일 커맨드 (= 스킬의 간소화 버전)
│   └── fix-issue.md                    /fix-issue 123 → $ARGUMENTS로 인자 전달
├── output-styles/         [committed]  팀 공유 출력 스타일 (있는 경우)
├── agents/                [committed]  서브에이전트 정의
│   └── code-reviewer.md               독립 컨텍스트 + 도구 제한(tools: Read, Grep, Glob)
├── agent-memory/          [committed]  서브에이전트 영구 메모리 (memory: project)
│   └── <agent-name>/
│       └── MEMORY.md                   에이전트가 자동 작성/관리. 200줄/25KB 제한 로드
└── agent-memory-local/    [gitignored] 서브에이전트 로컬 메모리 (memory: local)
```

#### settings.json 주요 키

| 키 | 역할 |
|----|------|
| `permissions.allow` | 승인 없이 실행 가능한 도구/명령. 와일드카드 지원 (`Bash(npm test *)`) |
| `permissions.deny` | 차단할 명령 (`Bash(rm -rf *)`) |
| `hooks` | 이벤트별 스크립트 (`PostToolUse` → Edit/Write 후 prettier 실행 등) |
| `model` | 프로젝트 기본 모델 |
| `env` | 매 세션에 주입할 환경 변수 |
| `outputStyle` | 출력 스타일 선택 |
| `statusLine` | 하단 상태줄 커스터마이즈 |

- **배열 설정** (`permissions.allow`) → 모든 스코프에서 합산
- **스칼라 설정** (`model`) → 가장 구체적인 값이 적용

#### commands vs skills

- `commands/deploy.md` = `skills/deploy/SKILL.md`와 동일한 `/deploy` 생성
- Skills는 디렉토리 구조로 번들 파일 포함 가능 → **새 워크플로우는 skills 권장**
- 같은 이름이면 skill이 우선

#### rules 상세

- `paths:` frontmatter 없음 → 매 세션 시작 시 로드 (CLAUDE.md와 동일)
- `paths:` frontmatter 있음 → 매칭 파일이 컨텍스트에 들어올 때만 로드
- 서브디렉토리 지원: `.claude/rules/frontend/react.md` 자동 발견
- CLAUDE.md가 200줄에 가까워지면 rules로 분리

> [insight] `paths:` 없는 rule은 세션 시작 시 무조건 로드되므로 CLAUDE.md와 컨텍스트 비용이 동일하다. rules를 많이 만들면서 `paths:`를 안 걸면 분리한 의미가 없다. CLAUDE.md에서 rules로 빼는 목적이 컨텍스트 절약이라면 반드시 `paths:`로 스코핑해서 deferred 로딩이 되게 해야 한다.

#### agents 상세

- 각 에이전트 = 독립 컨텍스트 윈도우
- `tools:` frontmatter로 도구 접근 제한
- `description:` 으로 Claude가 자동 위임 판단
- `@`로 직접 멘션하여 수동 위임 가능
- `memory:` 필드로 영구 메모리 활성화 (`project` / `local` / `user`)

#### skill 상세

- `disable-model-invocation: true` → 사용자만 호출 가능 (Claude 자동 호출 차단)
- `user-invocable: false` → `/` 메뉴에서 숨김, Claude만 호출
- `$ARGUMENTS` → 전체 인자, `$0`, `$1` → 위치별 인자
- `` !`command` `` → 셸 명령 실행 후 출력을 프롬프트에 주입
- `${CLAUDE_SKILL_DIR}` → 스킬 디렉토리 경로 플레이스홀더

---

## 2. 글로벌 레벨 (`~/`)

### `~/.claude.json` [local]

앱 상태 + UI 설정 + 개인 MCP 서버. `/config`으로 관리.

| 포함 내용 | 설명 |
|----------|------|
| `editorMode` | vim 등 에디터 모드 |
| `showTurnDuration` | 턴 시간 표시 |
| `mcpServers` | 개인 MCP 서버 (user scope = 전 프로젝트, local scope = 프로젝트별 비공유) |
| `projects` | 프로젝트별 trust 상태, 세션 메트릭스 |

### `~/.claude/` 내부

```
~/.claude/
├── CLAUDE.md              [local]  모든 프로젝트에 적용되는 개인 지침. 프로젝트 CLAUDE.md와 함께 로드
├── settings.json          [local]  모든 프로젝트 기본 설정. 프로젝트 settings.json이 override
├── keybindings.json       [local]  키보드 단축키. 핫리로드 지원. Ctrl+C/D/M은 예약
├── rules/                 [local]  모든 프로젝트에 적용되는 개인 rules
├── skills/                [local]  모든 프로젝트에서 사용 가능한 개인 skills
├── commands/              [local]  모든 프로젝트에서 사용 가능한 개인 commands
├── output-styles/         [local]  개인 출력 스타일
│   └── teaching.md                 예: keep-coding-instructions: true로 기본 지침 유지 + 추가 지침
├── agents/                [local]  모든 프로젝트에서 사용 가능한 개인 서브에이전트
├── agent-memory/          [local]  서브에이전트 글로벌 메모리 (memory: user)
└── projects/              [local]  Auto memory. 프로젝트별 디렉토리
    └── <project>/memory/
        ├── MEMORY.md               인덱스. 세션 시작 시 200줄/25KB 로드
        └── debugging.md            토픽 파일. 관련 작업 시 온디맨드 로드
```

#### output-styles 상세

- 시스템 프롬프트에 섹션을 추가하는 방식
- 기본적으로 빌트인 SW 엔지니어링 지침을 **대체**함
- `keep-coding-instructions: true` → 기본 지침 **유지** + 추가
- 빌트인 스타일: `Explanatory`, `Learning`
- 프로젝트 레벨 동명 스타일이 글로벌보다 우선
- 변경 시 다음 세션부터 적용 (시스템 프롬프트는 시작 시 고정)

#### auto memory 상세

- Claude가 자동으로 작성/관리 (사용자가 직접 쓰지 않음)
- `/memory`로 토글 또는 `autoMemoryEnabled` 설정
- MEMORY.md = 인덱스 (매 세션 로드)
- 토픽 파일 = 온디맨드 로드 (세션 시작 시 로드 X)
- 직접 편집/삭제 가능

---

## 3. 공유 범위 요약

| 배지 | 의미 |
|------|------|
| **committed** | git에 커밋. 팀과 공유 |
| **gitignored** | .gitignore 처리. 개인용 |
| **local** | `~/` 아래. 머신 로컬 |
| **autogen** | Claude가 자동 생성/관리 |

---

## 4. 설정 우선순위

```
높음 ←──────────────────────────────────────→ 낮음

managed settings (조직)
  → CLI flags
    → .claude/settings.local.json (개인 오버라이드)
      → .claude/settings.json (프로젝트)
        → ~/.claude/settings.json (글로벌)
```

- 배열 설정(permissions.allow) → 모든 레벨 합산
- 스칼라 설정(model) → 가장 높은 우선순위 값 적용

> [insight] `.claude/` 디렉토리는 committed / gitignored가 파일별로 다르다. `settings.json`은 팀 공유지만 `settings.local.json`은 개인용으로 자동 gitignore 처리된다. 이 구분을 잘 활용하면 팀 규칙 위에 개인 설정을 얹는 계층 구조를 깔끔하게 만들 수 있다. 특히 배열 설정은 합산, 스칼라는 override라는 점이 설계 시 중요하다.

> [insight] commands는 skills의 레거시 형태다. 같은 `/name` 호출이지만 skills는 디렉토리로 번들 파일을 포함할 수 있고, 같은 이름이면 skill이 우선한다. 새 워크플로우는 skills로 만들어야 한다.
