# Plugins — 플러그인 제작

---

플러그인은 Skills, Agents, Hooks, MCP 서버, LSP 서버를 하나의 배포 단위로 묶는 패키징 시스템이다.
`.claude/` 디렉토리의 standalone 설정과 달리, 여러 프로젝트/팀에 공유하고 마켓플레이스로 배포할 수 있다.

---

## 1. Standalone vs Plugin — 언제 뭘 쓰나

| | Standalone (`.claude/`) | Plugin |
|---|---|---|
| **스킬 이름** | `/hello` | `/plugin-name:hello` (네임스페이스) |
| **적합한 상황** | 개인 워크플로우, 단일 프로젝트, 빠른 실험 | 팀 공유, 커뮤니티 배포, 버전 관리, 다중 프로젝트 재사용 |
| **공유** | 수동 복사 | `/plugin install`로 설치 |

> standalone으로 시작 → 공유 필요 시 plugin으로 전환하는 흐름이 권장.

---

## 2. 플러그인 디렉토리 구조

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # 매니페스트 (여기에만 파일 배치)
├── skills/                  # Agent Skills (SKILL.md)
│   └── code-review/
│       └── SKILL.md
├── commands/                # 단일 파일 커맨드
├── agents/                  # 서브에이전트 정의
├── hooks/
│   └── hooks.json           # 이벤트 핸들러
├── .mcp.json                # MCP 서버 설정
├── .lsp.json                # LSP 서버 설정
├── bin/                     # 플러그인 활성 시 PATH에 추가되는 실행 파일
├── settings.json            # 플러그인 기본 설정 (현재 agent 키만 지원)
└── README.md
```

**주의:** `commands/`, `agents/`, `skills/`, `hooks/`는 플러그인 **루트**에 배치. `.claude-plugin/` 안에 넣으면 안 됨.

---

## 3. 매니페스트 (`plugin.json`)

```json
{
  "name": "my-plugin",
  "description": "플러그인 설명",
  "version": "1.0.0",
  "author": { "name": "Your Name" }
}
```

| 필드 | 역할 |
|------|------|
| `name` | 고유 식별자 + 스킬 네임스페이스 접두사 |
| `description` | 플러그인 매니저에서 표시 |
| `version` | 시맨틱 버저닝 |
| `author` | 선택. 출처 표시 |

추가 필드: `homepage`, `repository`, `license` 등.

---

## 4. 플러그인 컴포넌트

### Skills

`skills/<name>/SKILL.md` — 폴더명이 스킬 이름. `$ARGUMENTS`로 사용자 입력 수신.

```markdown
---
name: code-review
description: Reviews code for best practices. Use when reviewing code or PRs.
---

When reviewing code, check for:
1. Code organization and structure
2. Error handling
3. Security concerns
4. Test coverage
```

### Agents

`agents/` — 서브에이전트 정의. standalone과 동일한 frontmatter 형식.

**보안 제약:** 플러그인 에이전트는 `hooks`, `mcpServers`, `permissionMode` frontmatter가 무시됨. 필요하면 `.claude/agents/`로 복사해야 함.

### Hooks

`hooks/hooks.json` — `.claude/settings.json`의 hooks와 동일한 형식.

```json
{
  "hooks": {
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{ "type": "command", "command": "jq -r '.tool_input.file_path' | xargs npm run lint:fix" }]
    }]
  }
}
```

### MCP 서버

`.mcp.json` — 플러그인 루트에 배치. 플러그인 활성화 시 자동 연결.

```json
{
  "mcpServers": {
    "database-tools": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
      "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"],
      "env": { "DB_URL": "${DB_URL}" }
    }
  }
}
```

환경변수:
- `${CLAUDE_PLUGIN_ROOT}` — 플러그인 번들 파일 경로
- `${CLAUDE_PLUGIN_DATA}` — 플러그인 업데이트 후에도 유지되는 영구 데이터 디렉토리

### LSP 서버

`.lsp.json` — 공식 마켓플레이스에 없는 언어용 커스텀 LSP 설정.

```json
{
  "go": {
    "command": "gopls",
    "args": ["serve"],
    "extensionToLanguage": { ".go": "go" }
  }
}
```

사용자 머신에 Language Server 바이너리가 설치되어 있어야 함.

### bin/ 디렉토리

`bin/` — 플러그인 활성 시 Bash 도구의 `PATH`에 추가되는 실행 파일.

### settings.json

플러그인 기본 설정. 현재 `agent` 키만 지원:

```json
{ "agent": "security-reviewer" }
```

→ 플러그인 활성 시 해당 에이전트를 메인 스레드로 적용.

---

## 5. 개발 워크플로우

### 로컬 테스트

```bash
claude --plugin-dir ./my-plugin                     # 단일 플러그인
claude --plugin-dir ./plugin-one --plugin-dir ./plugin-two  # 다중
```

- `--plugin-dir`은 같은 이름의 마켓플레이스 플러그인보다 우선 (managed 제외)
- `/reload-plugins` — 변경사항 즉시 반영 (재시작 불필요)

### 검증 항목

- `/plugin-name:skill-name`으로 스킬 실행
- `/agents`에서 에이전트 확인
- hooks 트리거 검증

---

## 6. Standalone → Plugin 마이그레이션

| Standalone | Plugin |
|-----------|--------|
| `.claude/commands/` | `plugin-name/commands/` |
| `.claude/skills/` | `plugin-name/skills/` |
| `.claude/agents/` | `plugin-name/agents/` |
| `settings.json`의 hooks | `hooks/hooks.json` |

```bash
# 1. 구조 생성
mkdir -p my-plugin/.claude-plugin

# 2. 매니페스트 작성
# my-plugin/.claude-plugin/plugin.json

# 3. 기존 파일 복사
cp -r .claude/commands my-plugin/
cp -r .claude/agents my-plugin/
cp -r .claude/skills my-plugin/

# 4. hooks 마이그레이션 (settings.json → hooks/hooks.json)

# 5. 테스트
claude --plugin-dir ./my-plugin
```

마이그레이션 후 `.claude/`의 원본 제거 가능. 플러그인 버전이 우선.

---

## 7. 배포

1. `README.md` 작성
2. `plugin.json`에 시맨틱 버저닝
3. 마켓플레이스에 등록 또는 자체 마켓플레이스 생성
4. 공식 마켓플레이스 제출: [claude.ai/settings/plugins/submit](https://claude.ai/settings/plugins/submit)

> [insight] 플러그인의 네임스페이싱(`/plugin:skill`)은 여러 플러그인이 같은 스킬 이름을 가져도 충돌을 방지한다. 그러나 standalone 스킬(`/hello`)과 동명의 플러그인 스킬(`/plugin:hello`)은 공존할 수 있으므로, standalone에서 플러그인으로 전환 시 원본을 제거하지 않으면 둘 다 존재하게 된다.

> [insight] 플러그인의 `bin/` 디렉토리는 활성화 시 Bash 도구의 PATH에 추가된다. 이는 플러그인이 자체 CLI 도구를 번들링하여 Claude가 직접 실행할 수 있게 하는 구조다. 하네스에서 커스텀 도구를 배포할 때 별도 설치 없이 플러그인 안에 바이너리를 포함시키는 패턴으로 활용 가능.

> [insight] 플러그인의 `settings.json`은 현재 `agent` 키만 지원한다. 플러그인 활성화 시 특정 에이전트를 메인 스레드로 적용하는 것인데, 이는 플러그인 하나로 Claude Code의 기본 동작 자체를 변경할 수 있다는 의미다. 보안상 신뢰하는 플러그인만 설치해야 하는 이유 중 하나.
