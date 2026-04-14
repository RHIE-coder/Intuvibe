# Plugins Reference — 플러그인 시스템 기술 레퍼런스

---

플러그인 manifest 스키마, 컴포넌트 사양, CLI 명령, 개발 도구 레퍼런스.
개념은 `13-plugins.md`, 마켓플레이스는 `12-discover-plugins.md` 참조.

---

## 1. 컴포넌트 구성

### 디렉토리 레이아웃

```
plugin-root/
├── .claude-plugin/plugin.json   ← 매니페스트 (유일하게 여기)
├── commands/                    ← 레거시 커맨드 (.md)
├── skills/                      ← 스킬 (<name>/SKILL.md)
├── agents/                      ← 서브에이전트 (.md)
├── output-styles/               ← 출력 스타일 (.md)
├── hooks/hooks.json             ← 훅 설정
├── .mcp.json                    ← MCP 서버 정의
├── .lsp.json                    ← LSP 서버 설정
├── bin/                         ← PATH에 추가되는 실행파일
├── settings.json                ← 기본 설정 (현재 `agent`만 지원)
├── scripts/                     ← 훅/유틸리티 스크립트
└── CHANGELOG.md
```

**주의**: commands/, agents/, skills/ 등은 **루트에** 위치. `.claude-plugin/` 안에 넣으면 안 됨.

### 컴포넌트별 요약

| 컴포넌트 | 위치 | 인라인 가능 | 설명 |
|----------|------|:-----------:|------|
| Skills | `skills/` | X | `<name>/SKILL.md` 구조. 자동 탐색 |
| Commands | `commands/` | X | 레거시. 새 스킬은 `skills/` 사용 |
| Agents | `agents/` | X | `.md` 프론트매터로 정의 |
| Hooks | `hooks/hooks.json` | O (plugin.json) | 26개 이벤트, 4종 핸들러 |
| MCP | `.mcp.json` | O (plugin.json) | 플러그인 활성화 시 자동 시작 |
| LSP | `.lsp.json` | O (plugin.json) | 코드 인텔리전스 |
| Output Styles | `output-styles/` | X | 출력 스타일 정의 |
| Executables | `bin/` | X | Bash 도구에서 bare command로 호출 가능 |

### 플러그인 에이전트 제한

프론트매터 지원 필드: `name`, `description`, `model`, `effort`, `maxTurns`, `tools`, `disallowedTools`, `skills`, `memory`, `background`, `isolation` (`"worktree"`만 유효)

**보안상 미지원**: `hooks`, `mcpServers`, `permissionMode`

---

## 2. Manifest 스키마 (`plugin.json`)

매니페스트는 **선택적**. 생략 시 기본 위치에서 자동 탐색, 디렉토리명이 플러그인명.

### 필수 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `name` | string | 고유 식별자 (kebab-case). 컴포넌트 네임스페이스에 사용 |

### 메타데이터 필드

| 필드 | 타입 | 설명 |
|------|------|------|
| `version` | string | semver. marketplace.json에도 설정 가능 (plugin.json 우선) |
| `description` | string | 설명 |
| `author` | object | `{name, email, url}` |
| `homepage` | string | 문서 URL |
| `repository` | string | 소스 코드 URL |
| `license` | string | 라이센스 (`"MIT"`, `"Apache-2.0"` 등) |
| `keywords` | array | 탐색 태그 |

### 컴포넌트 경로 필드

| 필드 | 타입 | 기본 위치 교체 |
|------|------|:-----------:|
| `commands` | string\|array | O |
| `agents` | string\|array | O |
| `skills` | string\|array | O |
| `outputStyles` | string\|array | O |
| `hooks` | string\|array\|object | 별도 동작 |
| `mcpServers` | string\|array\|object | 별도 동작 |
| `lspServers` | string\|array\|object | 별도 동작 |
| `userConfig` | object | - |
| `channels` | array | - |

**경로 규칙**:
- 모든 경로는 `./`로 시작하는 상대 경로
- commands/agents/skills/outputStyles: 커스텀 경로 지정 시 기본 디렉토리 **스캔 안 함**
- 기본 + 추가를 원하면 배열에 기본 포함: `["./commands/", "./extras/deploy.md"]`
- 스킬 경로가 `SKILL.md` 포함 디렉토리를 직접 가리키면 프론트매터 `name`이 호출명

---

## 3. User Configuration

플러그인 활성화 시 사용자에게 값을 묻는 선언적 설정.

```json
{
  "userConfig": {
    "api_endpoint": { "description": "API endpoint", "sensitive": false },
    "api_token": { "description": "API token", "sensitive": true }
  }
}
```

### 참조 & 저장

| 컨텍스트 | 참조 방법 |
|----------|----------|
| MCP/LSP/Hook 설정 | `${user_config.KEY}` |
| Skill/Agent 내용 | `${user_config.KEY}` (비민감 값만) |
| 서브프로세스 환경변수 | `CLAUDE_PLUGIN_OPTION_<KEY>` |

| 값 타입 | 저장 위치 |
|---------|----------|
| 비민감 | `settings.json` → `pluginConfigs[<id>].options` |
| 민감 | 시스템 키체인 (또는 `~/.claude/.credentials.json`). **~2KB 총 한도** |

---

## 4. 환경변수 & 영구 데이터

### `${CLAUDE_PLUGIN_ROOT}`

플러그인 설치 디렉토리 절대 경로. 플러그인 업데이트 시 **변경됨** → 여기에 쓴 파일은 업데이트 후 소멸.

### `${CLAUDE_PLUGIN_DATA}`

영구 데이터 디렉토리. 업데이트 후에도 **유지**. `~/.claude/plugins/data/{id}/`.

용도: `node_modules`, Python venv, 캐시, 생성 코드 등.

### 의존성 설치 패턴

```json
{
  "hooks": {
    "SessionStart": [{
      "hooks": [{
        "type": "command",
        "command": "diff -q \"${CLAUDE_PLUGIN_ROOT}/package.json\" \"${CLAUDE_PLUGIN_DATA}/package.json\" >/dev/null 2>&1 || (cd \"${CLAUDE_PLUGIN_DATA}\" && cp \"${CLAUDE_PLUGIN_ROOT}/package.json\" . && npm install) || rm -f \"${CLAUDE_PLUGIN_DATA}/package.json\""
      }]
    }]
  }
}
```

`diff`로 번들 매니페스트 vs 데이터 디렉토리 사본 비교. 다르면 재설치. 실패 시 사본 삭제 → 다음 세션 재시도.

데이터 디렉토리는 마지막 스코프에서 언인스톨 시 **자동 삭제** (`--keep-data`로 보존 가능).

---

## 5. Channels

```json
{
  "channels": [{
    "server": "telegram",
    "userConfig": {
      "bot_token": { "description": "Bot token", "sensitive": true },
      "owner_id": { "description": "User ID", "sensitive": false }
    }
  }]
}
```

`server` 필드는 플러그인의 `mcpServers` 키와 일치해야 함.
채널별 `userConfig`로 봇 토큰/사용자 ID를 활성화 시 수집.

---

## 6. LSP 서버 설정

```json
{
  "go": {
    "command": "gopls",
    "args": ["serve"],
    "extensionToLanguage": { ".go": "go" }
  }
}
```

### 필수 필드

| 필드 | 설명 |
|------|------|
| `command` | LSP 바이너리 (PATH에 있어야 함) |
| `extensionToLanguage` | 파일 확장자 → 언어 ID 매핑 |

### 선택 필드

| 필드 | 설명 |
|------|------|
| `args` | CLI 인자 |
| `transport` | `stdio` (기본) 또는 `socket` |
| `env` | 환경변수 |
| `initializationOptions` | 초기화 옵션 |
| `settings` | `workspace/didChangeConfiguration` 설정 |
| `workspaceFolder` | 워크스페이스 폴더 경로 |
| `startupTimeout` / `shutdownTimeout` | 시작/종료 타임아웃 (ms) |
| `restartOnCrash` | 크래시 시 자동 재시작 |
| `maxRestarts` | 최대 재시작 횟수 |

**바이너리는 별도 설치** 필요. 플러그인은 설정만 제공.

---

## 7. 설치 스코프 & 캐싱

### 설치 스코프

| 스코프 | 설정 파일 | 용도 |
|--------|----------|------|
| `user` (기본) | `~/.claude/settings.json` | 개인, 전 프로젝트 |
| `project` | `.claude/settings.json` | 팀 공유 (커밋) |
| `local` | `.claude/settings.local.json` | 프로젝트 전용 (gitignored) |
| `managed` | Managed settings | 조직 관리 (읽기 전용, 업데이트만) |

### 캐싱 동작

마켓플레이스 플러그인은 `~/.claude/plugins/cache`에 복사본 저장.
이전 버전은 **7일 후** 자동 삭제 (동시 실행 세션 보호용 유예).

### 경로 제한

- 설치된 플러그인은 **디렉토리 외부 참조 불가** (`../` 불가)
- 외부 의존성이 필요하면 **심볼릭 링크** 생성 → 복사 시 따라감

---

## 8. CLI 명령

| 명령 | 동작 | 주요 옵션 |
|------|------|----------|
| `claude plugin install <plugin>` | 설치 | `-s <scope>` |
| `claude plugin uninstall <plugin>` | 제거. alias: `remove`, `rm` | `-s <scope>`, `--keep-data` |
| `claude plugin enable <plugin>` | 활성화 | `-s <scope>` |
| `claude plugin disable <plugin>` | 비활성화 (제거 안 함) | `-s <scope>` |
| `claude plugin update <plugin>` | 업데이트 | `-s <scope>` (managed 포함) |

`<plugin>` 형식: `plugin-name` 또는 `plugin-name@marketplace-name`

---

## 9. 트러블슈팅

| 문제 | 원인 | 해결 |
|------|------|------|
| 플러그인 미로딩 | 잘못된 plugin.json | `claude plugin validate` 또는 `/plugin validate` |
| 커맨드 미표시 | 디렉토리 구조 오류 | `commands/`가 루트에 있는지 확인 |
| 훅 미실행 | 스크립트 미실행 권한 | `chmod +x script.sh` |
| MCP 서버 실패 | `${CLAUDE_PLUGIN_ROOT}` 미사용 | 플러그인 경로에 변수 사용 |
| 경로 에러 | 절대 경로 사용 | `./`로 시작하는 상대 경로로 변경 |
| LSP 바이너리 없음 | 서버 미설치 | 바이너리 설치 (예: `npm install -g typescript-language-server`) |
| 업데이트 미반영 | 버전 미변경 | `plugin.json`의 `version` 범프 |

> [insight] `${CLAUDE_PLUGIN_ROOT}` vs `${CLAUDE_PLUGIN_DATA}`: ROOT는 플러그인 코드/스크립트 참조용(업데이트 시 변경), DATA는 의존성/캐시/상태 영구 저장용(업데이트 후 유지). `diff` 패턴으로 매니페스트 변경 감지 → 재설치는 의존성 관리의 공식 권장 패턴. 하네스에서 플러그인을 만들 때 이 이분법이 핵심.

> [insight] 플러그인 에이전트는 보안상 `hooks`, `mcpServers`, `permissionMode`를 지원하지 않는다. 프로젝트 에이전트(`agents/`)와의 중요한 차이점. 플러그인은 신뢰 경계 밖에서 배포될 수 있으므로 권한 확대가 가능한 필드를 차단한 것.

> [insight] `bin/` 디렉토리의 실행파일은 Bash 도구의 PATH에 자동 추가된다. 플러그인이 커스텀 CLI 도구를 배포하면 Claude가 bare command로 직접 호출 가능. 하네스에서 커스텀 도구 체인을 플러그인으로 패키징할 때 `bin/` + `scripts/` 조합이 강력한 확장점.

> [insight] 민감한 userConfig 값은 시스템 키체인에 저장되며 **~2KB 총 한도**가 있다 (OAuth 토큰과 공유). 긴 API 키나 인증서를 userConfig sensitive에 넣으면 한도를 초과할 수 있다. 큰 민감 값은 환경변수나 파일 참조로 우회해야 한다.
