# Settings — Claude Code 설정 시스템

---

Claude Code의 동작을 제어하는 계층적 설정 시스템.
스코프, 우선순위, 병합 규칙, 주요 설정 키를 정리한다.

---

## 1. 설정 스코프 4단계

| 스코프 | 위치 | 대상 | 공유 |
|--------|------|------|------|
| **Managed** | 서버/plist/레지스트리/`managed-settings.json` | 머신의 모든 사용자 | IT 배포 |
| **User** | `~/.claude/settings.json` | 본인, 전 프로젝트 | X |
| **Project** | `.claude/settings.json` | 팀 전원 | VCS |
| **Local** | `.claude/settings.local.json` | 본인, 현재 프로젝트 | X (gitignored) |

### 우선순위 (높은 순)

```
1. Managed (최고 — 어떤 것으로도 오버라이드 불가)
2. CLI 인자 (세션 임시 오버라이드)
3. Local (.claude/settings.local.json)
4. Project (.claude/settings.json)
5. User (~/.claude/settings.json) (최저)
```

### 병합 규칙

- **스칼라 값** (model, defaultMode 등) → 높은 우선순위가 적용
- **배열 값** (permissions.allow, sandbox.filesystem.allowWrite 등) → **모든 스코프에서 concat + 중복 제거**

### 스코프별 기능 위치

| 기능 | User | Project | Local |
|------|------|---------|-------|
| Settings | `~/.claude/settings.json` | `.claude/settings.json` | `.claude/settings.local.json` |
| Subagents | `~/.claude/agents/` | `.claude/agents/` | - |
| MCP | `~/.claude.json` | `.mcp.json` | `~/.claude.json` (프로젝트별) |
| Plugins | `~/.claude/settings.json` | `.claude/settings.json` | `.claude/settings.local.json` |
| CLAUDE.md | `~/.claude/CLAUDE.md` | `CLAUDE.md` / `.claude/CLAUDE.md` | `CLAUDE.local.md` |

---

## 2. Managed Settings 배포 방식

| 방식 | 플랫폼 | 위치 |
|------|--------|------|
| **서버 관리** | 전체 | Claude.ai admin console |
| **MDM/OS** | macOS: `com.anthropic.claudecode` plist | Jamf, Kandji 등 |
| | Windows: `HKLM\SOFTWARE\Policies\ClaudeCode` | Group Policy, Intune |
| **파일 기반** | macOS: `/Library/Application Support/ClaudeCode/` | |
| | Linux: `/etc/claude-code/` | |
| | Windows: `C:\Program Files\ClaudeCode\` | |

- Drop-in 디렉토리 `managed-settings.d/*.json` 지원 (숫자 접두사로 순서 제어)
- `managed-settings.json` 기반 → drop-in 파일 순서대로 deep merge
- Managed 내 우선순위: 서버 > MDM/OS > 파일 기반 > HKCU (Windows)

---

## 3. 주요 설정 키 (핵심만)

### 모델/동작

| 키 | 설명 |
|----|------|
| `model` | 기본 모델 오버라이드 |
| `availableModels` | 사용자가 선택 가능한 모델 제한 |
| `modelOverrides` | Anthropic 모델 ID → 프로바이더별 ID 매핑 (Bedrock ARN 등) |
| `agent` | 메인 스레드를 특정 서브에이전트로 실행 |
| `outputStyle` | 출력 스타일 지정 |
| `effortLevel` | effort 레벨 지속 (`low`/`medium`/`high`) |
| `language` | 응답 언어 설정 |

### 권한

| 키 | 설명 |
|----|------|
| `permissions.allow` | 자동 허용 규칙 배열 |
| `permissions.ask` | 확인 요청 규칙 배열 |
| `permissions.deny` | 차단 규칙 배열 |
| `permissions.defaultMode` | 기본 권한 모드 |
| `permissions.additionalDirectories` | 추가 작업 디렉토리 |
| `disableAutoMode` | `"disable"` → auto 모드 차단 |
| `disableBypassPermissionsMode` | `"disable"` → bypass 모드 차단 |

**규칙 평가 순서: deny → ask → allow (첫 매칭 승)**

### Permission Rule 문법

| 패턴 | 매칭 |
|------|------|
| `Bash` | 모든 Bash 명령 |
| `Bash(npm run *)` | `npm run`으로 시작하는 명령 |
| `Read(./.env)` | .env 파일 읽기 |
| `WebFetch(domain:example.com)` | 특정 도메인 요청 |

### Hooks

| 키 | 설명 |
|----|------|
| `hooks` | 라이프사이클 훅 설정 |
| `disableAllHooks` | `true` → 전체 훅 비활성화 |
| `allowManagedHooksOnly` | (managed) 사용자/프로젝트/플러그인 훅 차단 |
| `allowedHttpHookUrls` | HTTP 훅 URL 허용 목록 |
| `httpHookAllowedEnvVars` | HTTP 훅 환경변수 허용 목록 |

### 환경/메모리

| 키 | 설명 |
|----|------|
| `env` | 매 세션 적용 환경변수 |
| `autoMemoryDirectory` | auto memory 저장 위치 (project settings 불가) |
| `autoUpdatesChannel` | `"stable"` (1주 지연) 또는 `"latest"` (최신) |
| `cleanupPeriodDays` | 비활성 세션 삭제 기간 (기본 30일) |

### MCP

| 키 | 설명 |
|----|------|
| `enableAllProjectMcpServers` | `.mcp.json` 전체 자동 승인 |
| `enabledMcpjsonServers` | 특정 서버만 승인 |
| `disabledMcpjsonServers` | 특정 서버 거부 |
| `allowedMcpServers` | (managed) 허용 서버 목록 |
| `deniedMcpServers` | (managed) 차단 서버 목록 |

### Sandbox

```json
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true,
    "excludedCommands": ["docker *"],
    "filesystem": {
      "allowWrite": ["/tmp/build", "~/.kube"],
      "denyWrite": ["/etc"],
      "denyRead": ["~/.aws/credentials"],
      "allowRead": ["."]
    },
    "network": {
      "allowedDomains": ["github.com", "*.npmjs.org"],
      "allowUnixSockets": ["/var/run/docker.sock"],
      "allowLocalBinding": true
    }
  }
}
```

경로 접두사: `/` = 절대경로, `~/` = 홈, `./` = 프로젝트 루트 상대.
`filesystem`과 `permissions` 규칙이 **병합**되어 적용.

### Attribution

```json
{
  "attribution": {
    "commit": "Generated with AI\n\nCo-Authored-By: AI <ai@example.com>",
    "pr": ""
  }
}
```

빈 문자열 = 해당 attribution 숨김. `includeCoAuthoredBy`는 deprecated.

### Worktree

| 키 | 설명 |
|----|------|
| `worktree.symlinkDirectories` | worktree에 심링크할 디렉토리 (node_modules 등) |
| `worktree.sparsePaths` | sparse-checkout 경로 (대형 모노레포) |

### Plugin

| 키 | 설명 |
|----|------|
| `enabledPlugins` | 플러그인 활성화 맵 (`"name@marketplace": true/false`) |
| `extraKnownMarketplaces` | 팀원에게 자동 제안할 마켓플레이스 |
| `strictKnownMarketplaces` | (managed) 허용 마켓플레이스 목록 |
| `blockedMarketplaces` | (managed) 차단 마켓플레이스 목록 |

### 기타 managed-only 키

| 키 | 설명 |
|----|------|
| `companyAnnouncements` | 시작 시 표시할 공지 (랜덤 순환) |
| `channelsEnabled` | 채널 마스터 스위치 |
| `allowedChannelPlugins` | 허용 채널 플러그인 |
| `forceLoginMethod` | 로그인 방법 제한 (`claudeai`/`console`) |
| `forceLoginOrgUUID` | 특정 조직 UUID로 로그인 제한 |
| `forceRemoteSettingsRefresh` | 시작 시 원격 설정 강제 새로고침 (실패 시 종료) |
| `allowManagedPermissionRulesOnly` | 사용자/프로젝트 권한 규칙 차단 |
| `disableSkillShellExecution` | 스킬의 셸 실행 비활성화 |

---

## 4. Global Config (`~/.claude.json`)

settings.json이 아닌 별도 파일. UI/앱 상태:

| 키 | 설명 |
|----|------|
| `editorMode` | `"normal"` 또는 `"vim"` |
| `showTurnDuration` | 턴 시간 표시 |
| `terminalProgressBarEnabled` | 터미널 진행 바 |
| `autoConnectIde` | 외부 터미널에서 IDE 자동 연결 |
| `teammateMode` | agent team 표시 모드 |

---

## 5. 검증

- `/config` — 설정 UI
- `/status` — 활성 설정 소스와 출처 확인 (에러 리포팅 포함)
- `$schema` 지정으로 에디터 자동완성/검증: `"$schema": "https://json.schemastore.org/claude-code-settings.json"`
- 설정 파일 자동 백업 (최근 5개)

> [insight] 배열 설정은 스코프 간 **concat + 중복 제거**로 병합된다. 이는 managed settings에서 `permissions.deny`에 항목을 추가하면 사용자/프로젝트 설정의 `deny`와 합쳐진다는 의미. 반대로 스칼라 설정은 높은 우선순위가 적용. 하네스에서 권한 설계 시 이 병합 규칙을 정확히 이해해야 — 배열은 "추가만 가능, 제거 불가"이고 스칼라는 "상위가 절대 우선".

> [insight] `--bare` 모드에서는 settings, hooks, skills, plugins, MCP, auto memory, CLAUDE.md 전부 건너뛰고 CLI 플래그로 전달한 것만 적용된다. 하네스의 CI 파이프라인에서는 `--bare` + 명시적 `--settings` + `--mcp-config`로 재현 가능한 실행 환경을 구성하는 것이 정석.

> [insight] Managed settings의 `forceRemoteSettingsRefresh: true`는 시작 시 원격 설정 가져오기에 실패하면 CLI를 아예 종료시킨다 (fail-closed). 조직에서 보안 정책이 항상 적용되어야 할 때 사용. 네트워크 불안정 환경에서는 시작 불가 위험이 있으므로 주의.

> [insight] `apiKeyHelper`는 커스텀 스크립트로 API 키를 동적 생성하여 `X-Api-Key`와 `Authorization: Bearer` 헤더로 전송한다. 단기 토큰이나 vault 연동이 필요한 환경에서 활용. `--bare` 모드에서 `--settings`로 전달 가능.
