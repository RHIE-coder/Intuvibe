# Hooks Guide — 워크플로우 자동화

---

Hook은 Claude Code 라이프사이클의 특정 시점에서 실행되는 **결정론적 스크립트**다.
CLAUDE.md와 달리 LLM 판단에 의존하지 않으며, 설정된 조건에서 **반드시 실행**된다.

4가지 타입: `command`(셸), `http`(웹훅), `prompt`(LLM 단일 판단), `agent`(LLM + 도구 사용 검증).

---

## 1. Hook 이벤트 전체

| 이벤트 | 발화 시점 | matcher 대상 |
|--------|---------|-------------|
| `SessionStart` | 세션 시작/재개 | startup, resume, clear, compact |
| `UserPromptSubmit` | 프롬프트 제출 시 (Claude 처리 전) | - |
| `PreToolUse` | 도구 실행 전. **차단 가능** | 도구 이름 |
| `PermissionRequest` | 권한 다이얼로그 표시 시 | 도구 이름 |
| `PermissionDenied` | auto mode classifier가 거부 시 | 도구 이름 |
| `PostToolUse` | 도구 성공 후 | 도구 이름 |
| `PostToolUseFailure` | 도구 실패 후 | 도구 이름 |
| `Notification` | 알림 발생 시 | permission_prompt, idle_prompt, auth_success, elicitation_dialog |
| `SubagentStart` / `SubagentStop` | 서브에이전트 시작/완료 | 에이전트 타입 |
| `TaskCreated` / `TaskCompleted` | 작업 생성/완료 시 | - |
| `Stop` | Claude 응답 완료 시 | - |
| `StopFailure` | API 에러로 턴 종료 | rate_limit, auth_failed, billing_error 등 |
| `TeammateIdle` | agent team 팀원 idle 전환 | - |
| `InstructionsLoaded` | CLAUDE.md/rules 로드 시 | session_start, nested_traversal, path_glob_match 등 |
| `ConfigChange` | 설정 파일 변경 시 | user/project/local/policy_settings, skills |
| `CwdChanged` | 작업 디렉토리 변경 시 | - |
| `FileChanged` | 감시 파일 변경 시 | 파일명 |
| `WorktreeCreate` / `WorktreeRemove` | worktree 생성/삭제 시 | - |
| `PreCompact` / `PostCompact` | compact 전/후 | manual, auto |
| `Elicitation` / `ElicitationResult` | MCP 서버 사용자 입력 요청/응답 | MCP 서버 이름 |
| `SessionEnd` | 세션 종료 | clear, resume, logout 등 |

---

## 2. 입출력 구조

### 입력 (stdin JSON)

```json
{
  "session_id": "abc123",
  "cwd": "/Users/sarah/myproject",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": { "command": "npm test" }
}
```

### 출력 (exit code)

| exit code | 동작 |
|-----------|------|
| **0** | 진행 허용. stdout → 컨텍스트 추가 (SessionStart, UserPromptSubmit) |
| **2** | **차단**. stderr → Claude에 피드백 |
| **기타** | 진행. 트랜스크립트에 에러 표시 |

### 구조화 JSON 출력 (exit 0 + stdout)

exit code보다 세밀한 제어:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "deny",
    "permissionDecisionReason": "Use rg instead of grep"
  }
}
```

`permissionDecision` 값: `allow`, `deny`, `ask`, `defer`(비대화형 모드)

> `allow`는 interactive 프롬프트를 건너뛰지만 settings의 **deny 규칙은 무시할 수 없다**. Hook은 제한을 강화할 수 있지만 완화할 수는 없다.

---

## 3. `if` 필드 — 도구 이름 + 인자 필터

matcher는 도구 이름만 필터. `if`는 인자까지 필터하여 hook 프로세스 스폰 자체를 제어:

```json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{
        "type": "command",
        "if": "Bash(git *)",
        "command": ".claude/hooks/check-git-policy.sh"
      }]
    }]
  }
}
```

→ `git`으로 시작하는 Bash 명령만 hook 실행. 나머지는 스킵.

---

## 4. 주요 패턴

### 알림 (Notification)

```json
{ "hooks": { "Notification": [{ "matcher": "", "hooks": [{
  "type": "command",
  "command": "osascript -e 'display notification \"Claude Code needs your attention\" with title \"Claude Code\"'"
}]}]}}
```

### 자동 포맷 (PostToolUse)

```json
{ "hooks": { "PostToolUse": [{ "matcher": "Edit|Write", "hooks": [{
  "type": "command",
  "command": "jq -r '.tool_input.file_path' | xargs npx prettier --write"
}]}]}}
```

### 파일 보호 (PreToolUse)

```bash
#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
PROTECTED=(".env" "package-lock.json" ".git/")
for pattern in "${PROTECTED[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "Blocked: $FILE_PATH matches '$pattern'" >&2
    exit 2
  fi
done
exit 0
```

### Compact 후 컨텍스트 재주입 (SessionStart + compact matcher)

```json
{ "hooks": { "SessionStart": [{ "matcher": "compact", "hooks": [{
  "type": "command",
  "command": "echo 'Reminder: use Bun, not npm. Run bun test before committing.'"
}]}]}}
```

### 권한 자동 승인 (PermissionRequest)

```json
{ "hooks": { "PermissionRequest": [{ "matcher": "ExitPlanMode", "hooks": [{
  "type": "command",
  "command": "echo '{\"hookSpecificOutput\": {\"hookEventName\": \"PermissionRequest\", \"decision\": {\"behavior\": \"allow\"}}}'"
}]}]}}
```

### 설정 변경 감사 (ConfigChange)

```json
{ "hooks": { "ConfigChange": [{ "matcher": "", "hooks": [{
  "type": "command",
  "command": "jq -c '{timestamp: now | todate, source: .source, file: .file_path}' >> ~/claude-config-audit.log"
}]}]}}
```

### 환경변수 리로드 (CwdChanged + direnv)

```json
{ "hooks": { "CwdChanged": [{ "hooks": [{
  "type": "command",
  "command": "direnv export bash >> \"$CLAUDE_ENV_FILE\""
}]}]}}
```

---

## 5. Hook 타입 4가지

### command (셸 명령)

기본 타입. stdin으로 JSON 수신, exit code와 stdout/stderr로 응답.

### http (웹훅)

```json
{ "type": "http", "url": "http://localhost:8080/hooks/tool-use",
  "headers": { "Authorization": "Bearer $MY_TOKEN" },
  "allowedEnvVars": ["MY_TOKEN"] }
```

동일 JSON 입출력. 2xx + JSON body로 차단 가능.

### prompt (LLM 단일 판단)

판단이 필요한 상황에서 Haiku(기본)에 yes/no 판단 위임:

```json
{ "type": "prompt",
  "prompt": "Check if all tasks are complete. Return {\"ok\": false, \"reason\": \"...\"} if not." }
```

`ok: true` → 진행, `ok: false` → 차단 + reason을 Claude에 전달.

### agent (LLM + 도구 사용 검증)

파일 읽기, 코드 검색 등 도구를 사용한 다중 턴 검증:

```json
{ "type": "agent",
  "prompt": "Verify that all unit tests pass. Run the test suite.",
  "timeout": 120 }
```

최대 50턴, 기본 60초 타임아웃.

---

## 6. 설정 위치

| 위치 | 스코프 | 공유 |
|------|--------|------|
| `~/.claude/settings.json` | 전 프로젝트 | 로컬 |
| `.claude/settings.json` | 프로젝트 | VCS |
| `.claude/settings.local.json` | 프로젝트 | gitignored |
| Managed policy | 조직 전체 | 관리자 |
| Plugin `hooks/hooks.json` | 플러그인 활성 시 | 플러그인 |
| Skill/Agent frontmatter | 해당 컴포넌트 활성 시 | 컴포넌트 파일 |

`/hooks` — 설정된 모든 훅 브라우징 (읽기 전용).
`"disableAllHooks": true` — 전체 비활성화.

---

## 7. 복수 Hook 실행 규칙

- 매칭되는 모든 훅이 **병렬 실행**, 동일 명령은 자동 중복 제거
- 결정이 충돌하면 **가장 제한적인** 것이 적용 (deny > ask > allow)
- `additionalContext`는 모든 훅에서 수집하여 Claude에 전달

---

## 8. Hook과 권한 모드

- `PreToolUse` 훅은 **권한 모드 체크 전에** 실행됨
- `permissionDecision: "deny"` → `bypassPermissions`에서도 차단 가능
- `permissionDecision: "allow"` → settings의 deny 규칙은 무시 불가
- **Hook은 제한 강화만 가능, 완화는 불가**

---

## 9. 트러블슈팅

| 문제 | 원인/해결 |
|------|---------|
| Hook 미실행 | `/hooks`에서 확인. matcher 대소문자 정확 매칭. 이벤트 타입 확인 |
| 에러 출력 | 스크립트를 수동 테스트: `echo '{"tool_name":"Bash",...}' \| ./hook.sh` |
| JSON 파싱 실패 | 셸 프로필(`~/.zshrc`)의 `echo`가 JSON 앞에 출력됨 → `[[ $- == *i* ]]` 가드 |
| Stop hook 무한루프 | `stop_hook_active: true`일 때 `exit 0`으로 조기 반환 필수 |
| `/hooks`에 안 보임 | JSON 유효성 확인 (trailing comma, 주석 불가). 위치 확인 |
| PermissionRequest 비대화형 미작동 | `-p` 모드에서는 `PreToolUse` 사용 |

디버그: `claude --debug-file /tmp/claude.log` 또는 세션 중 `/debug`. `Ctrl+O`로 트랜스크립트 확인.

> [insight] Hook은 권한 모드 체크 **전에** 실행된다. `permissionDecision: "deny"`는 `bypassPermissions`에서도 차단한다. 이는 Hook이 모든 권한 모드를 관통하는 **최상위 정책 집행자**라는 의미다. 반면 `allow`는 settings의 deny 규칙을 무시할 수 없다. 즉 Hook은 제한을 강화만 할 수 있고 완화할 수 없다 — 하네스의 보안 레이어 설계에서 핵심적인 속성.

> [insight] `SessionStart` + `compact` matcher로 compact 후 컨텍스트를 재주입할 수 있다. CLAUDE.md는 compact 후 자동 재로드되지만, 대화 중 주어진 동적 컨텍스트는 사라진다. 이 Hook 패턴으로 "현재 스프린트", "최근 커밋" 등 동적 정보를 compact 후에도 유지할 수 있다.

> [insight] `prompt`와 `agent` 타입 Hook은 LLM을 사용하므로 토큰을 소비한다. `prompt`는 단일 판단(Haiku 기본), `agent`는 다중 턴 + 도구 사용. 하네스에서 Hook 비용을 관리하려면 가능한 한 `command` 타입으로 결정론적 검증을 하고, 판단이 정말 필요한 경우에만 `prompt`/`agent`를 사용해야 한다.

> [insight] 복수 PreToolUse 훅이 `updatedInput`으로 도구 인자를 수정하면, 병렬 실행이므로 **마지막으로 끝나는 훅의 결과가 적용**된다 (비결정론적). 같은 도구의 입력을 여러 훅이 동시에 수정하지 않도록 설계해야 한다.
