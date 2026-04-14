# Hooks Reference — 이벤트, 설정 스키마, 입출력, 고급 기능

---

가이드(`15-hooks-guide.md`)와 별개의 **레퍼런스**. 이벤트 스키마, JSON I/O, exit code, 비동기/HTTP/프롬프트/에이전트 훅 상세.

---

## 1. 라이프사이클 이벤트 전체 (26개)

### 세션

| 이벤트 | 시점 | 차단 가능 |
|--------|------|:---------:|
| `SessionStart` | 세션 시작/재개 | X |
| `SessionEnd` | 세션 종료 | X |

### 에이전틱 루프

| 이벤트 | 시점 | 차단 가능 |
|--------|------|:---------:|
| `UserPromptSubmit` | 프롬프트 제출, 처리 전 | O |
| `PreToolUse` | 도구 실행 전 | O |
| `PermissionRequest` | 권한 다이얼로그 표시 시 | O |
| `PermissionDenied` | auto mode 분류기가 거부 시 | X (retry만) |
| `PostToolUse` | 도구 성공 후 | X (피드백만) |
| `PostToolUseFailure` | 도구 실패 후 | X |
| `Stop` | Claude 응답 완료 | O |
| `StopFailure` | API 에러로 턴 종료 | X (무시됨) |

### 서브에이전트 & 팀

| 이벤트 | 시점 | 차단 가능 |
|--------|------|:---------:|
| `SubagentStart` | 서브에이전트 스폰 | X (컨텍스트 주입만) |
| `SubagentStop` | 서브에이전트 완료 | O |
| `TaskCreated` | TaskCreate로 태스크 생성 시 | O |
| `TaskCompleted` | 태스크 완료 마킹 시 | O |
| `TeammateIdle` | 팀메이트 유휴 전환 전 | O |

### 컨텍스트 & 설정

| 이벤트 | 시점 | 차단 가능 |
|--------|------|:---------:|
| `PreCompact` | 압축 전 | X |
| `PostCompact` | 압축 후 | X |
| `InstructionsLoaded` | CLAUDE.md/rules 로드 시 | X |
| `ConfigChange` | 설정 파일 변경 시 | O (policy 제외) |

### 환경 & 파일

| 이벤트 | 시점 | 차단 가능 |
|--------|------|:---------:|
| `CwdChanged` | 작업 디렉토리 변경 시 | X |
| `FileChanged` | 감시 파일 디스크 변경 시 | X |
| `WorktreeCreate` | worktree 생성 시 | O (기본 동작 대체) |
| `WorktreeRemove` | worktree 제거 시 | X |

### MCP

| 이벤트 | 시점 | 차단 가능 |
|--------|------|:---------:|
| `Elicitation` | MCP 서버가 사용자 입력 요청 시 | O |
| `ElicitationResult` | 사용자 응답 후, 서버 전송 전 | O |

### 알림

| 이벤트 | 시점 | 차단 가능 |
|--------|------|:---------:|
| `Notification` | 알림 전송 시 | X |

---

## 2. 설정 스키마

### 3단 계층

```
이벤트 선택 → matcher 그룹으로 필터 → hook handler(들) 실행
```

### 훅 위치

| 위치 | 스코프 |
|------|--------|
| `~/.claude/settings.json` | 전 프로젝트 (개인) |
| `.claude/settings.json` | 프로젝트 (커밋 가능) |
| `.claude/settings.local.json` | 프로젝트 (gitignored) |
| Managed policy | 조직 전체 |
| Plugin `hooks/hooks.json` | 플러그인 활성 범위 |
| Skill/Agent frontmatter | 컴포넌트 활성 기간 |

`allowManagedHooksOnly`로 사용자/프로젝트/플러그인 훅 차단 가능.

### Matcher 패턴 (정규식)

| 이벤트 그룹 | matcher 대상 | 예시 |
|-------------|-------------|------|
| PreToolUse, PostToolUse, PostToolUseFailure, PermissionRequest, PermissionDenied | 도구 이름 | `Bash`, `Edit\|Write`, `mcp__.*` |
| SessionStart | 시작 방식 | `startup`, `resume`, `clear`, `compact` |
| SessionEnd | 종료 이유 | `clear`, `resume`, `logout`, `prompt_input_exit` |
| Notification | 알림 타입 | `permission_prompt`, `idle_prompt` |
| SubagentStart/Stop | 에이전트 타입 | `Explore`, `Plan`, 커스텀 이름 |
| PreCompact/PostCompact | 트리거 | `manual`, `auto` |
| StopFailure | 에러 타입 | `rate_limit`, `authentication_failed`, `billing_error` |
| InstructionsLoaded | 로드 이유 | `session_start`, `path_glob_match`, `nested_traversal` |
| ConfigChange | 설정 소스 | `user_settings`, `project_settings`, `policy_settings` |
| FileChanged | 파일명 (basename) | `.envrc`, `.env` |
| Elicitation/ElicitationResult | MCP 서버명 | |
| UserPromptSubmit, Stop, TeammateIdle, TaskCreated/Completed, WorktreeCreate/Remove, CwdChanged | matcher 미지원 | 항상 발화 |

MCP 도구 매칭: `mcp__<server>__<tool>` 패턴. `mcp__memory__.*` = memory 서버 전체.

### `if` 필드

도구 이벤트에서 handler 레벨 추가 필터. permission rule syntax: `"Bash(git *)"`, `"Edit(*.ts)"`.
도구 이벤트 외에서는 `if` 설정 시 **실행 안 됨**.

---

## 3. 핸들러 4종

### 공통 필드

| 필드 | 필수 | 설명 |
|------|:----:|------|
| `type` | O | `"command"`, `"http"`, `"prompt"`, `"agent"` |
| `if` | X | permission rule syntax 필터 (도구 이벤트 전용) |
| `timeout` | X | 초. 기본: command=600, prompt=30, agent=60 |
| `statusMessage` | X | 실행 중 스피너 메시지 |
| `once` | X | `true` → 세션 당 1회. Skill 전용 |

### Command (`type: "command"`)

| 필드 | 설명 |
|------|------|
| `command` | 셸 명령 |
| `async` | `true` → 백그라운드 (fire-and-forget) |
| `shell` | `"bash"` (기본) 또는 `"powershell"` |

### HTTP (`type: "http"`)

| 필드 | 설명 |
|------|------|
| `url` | POST 요청 URL |
| `headers` | 추가 헤더 (키-값). `$VAR_NAME` 환경변수 보간 |
| `allowedEnvVars` | 보간 허용 환경변수 목록 (미등록 시 빈 문자열) |

- 비2xx / 연결 실패 / 타임아웃 = **비차단 에러** (실행 계속)
- 차단하려면 2xx + JSON body로 decision 반환

### Prompt (`type: "prompt"`)

| 필드 | 설명 |
|------|------|
| `prompt` | Claude에게 보낼 프롬프트. `$ARGUMENTS`로 입력 JSON 삽입 |
| `model` | 평가 모델 (기본: 빠른 모델) |

"yes"로 시작 → 허용, 그 외 → 차단.

### Agent (`type: "agent"`)

prompt 훅과 동일 필드. 차이: **서브에이전트가 Read/Grep/Glob 등 도구 사용 가능**.
복잡한 조건 검증에 적합 (파일 검사, 패턴 매칭).

---

## 4. 입출력

### 공통 입력 필드 (JSON stdin / POST body)

| 필드 | 설명 |
|------|------|
| `session_id` | 세션 ID |
| `transcript_path` | 대화 JSON 경로 |
| `cwd` | 현재 작업 디렉토리 |
| `permission_mode` | 현재 권한 모드 (일부 이벤트만) |
| `hook_event_name` | 이벤트명 |
| `agent_id` | 서브에이전트 내부에서만 |
| `agent_type` | `--agent` 또는 서브에이전트 타입 |

### Exit Code

| 코드 | 의미 |
|------|------|
| **0** | 성공. stdout JSON 파싱 |
| **2** | **차단 에러**. stderr → Claude에게 에러 메시지 |
| **기타** | 비차단 에러. 트랜스크립트에 1줄 공지, 실행 계속 |

**주의**: exit code 1은 **비차단** — Unix 관례와 다름. 정책 강제는 반드시 `exit 2`.
예외: `WorktreeCreate`는 모든 비0 코드가 중단.

### JSON 출력 (exit 0에서만 파싱)

| 필드 | 기본 | 설명 |
|------|------|------|
| `continue` | `true` | `false` → Claude 완전 중지 |
| `stopReason` | - | `continue: false` 시 사용자 표시 메시지 |
| `suppressOutput` | `false` | `true` → stdout 디버그 로그 생략 |
| `systemMessage` | - | 사용자 경고 메시지 |

출력 캡: **10,000자**. 초과 시 파일 저장 + 프리뷰로 교체.

### HTTP 응답

| 상태 | 동작 |
|------|------|
| 2xx + 빈 body | exit 0과 동일 |
| 2xx + 텍스트 | 컨텍스트에 추가 |
| 2xx + JSON | exit 0 + JSON과 동일 |
| 비2xx / 실패 | 비차단 에러 |

HTTP 훅은 상태 코드만으로는 차단 불가 → JSON body의 decision 필드 필요.

---

## 5. 주요 이벤트별 Decision Control 요약

### PreToolUse (가장 풍부)

| 필드 | 설명 |
|------|------|
| `permissionDecision` | `allow` / `deny` / `ask` / `defer` |
| `permissionDecisionReason` | allow/ask→사용자, deny→Claude, defer→무시 |
| `updatedInput` | 도구 입력 수정 (전체 교체) |
| `additionalContext` | Claude 컨텍스트에 추가 |

복수 훅 우선순위: `deny` > `defer` > `ask` > `allow`

**`defer`** (v2.1.89+): 비인터랙티브(`-p`) 전용. 도구 실행을 중단하고 `stop_reason: "tool_deferred"`로 종료. 호출 프로세스가 `--resume`으로 재개 시 다시 발화. 단일 도구 호출에서만 동작 (배치 불가).

### PermissionRequest

| 필드 | 설명 |
|------|------|
| `decision.behavior` | `allow` / `deny` |
| `decision.updatedInput` | allow 시 입력 수정 |
| `decision.updatedPermissions` | 권한 규칙 추가/교체/제거, 모드 변경, 디렉토리 추가/제거 |
| `decision.message` | deny 시 Claude에게 이유 |
| `decision.interrupt` | deny 시 `true` → Claude 중지 |

`updatedPermissions` destination: `session` (메모리), `localSettings`, `projectSettings`, `userSettings`

### Stop / SubagentStop

`decision: "block"` + `reason` → Claude가 멈추지 않고 계속.

### UserPromptSubmit

`decision: "block"` + `reason` → 프롬프트 처리 차단 + 삭제.
`additionalContext` / `sessionTitle` 반환 가능.

### SessionStart

stdout 텍스트 또는 `additionalContext` → Claude 컨텍스트에 추가.
`CLAUDE_ENV_FILE`에 `export` 작성 → 환경변수 지속.

---

## 6. 도구 입력 스키마 (PreToolUse)

| 도구 | 주요 필드 |
|------|----------|
| **Bash** | `command`, `description`, `timeout`, `run_in_background` |
| **Write** | `file_path`, `content` |
| **Edit** | `file_path`, `old_string`, `new_string`, `replace_all` |
| **Read** | `file_path`, `offset`, `limit` |
| **Glob** | `pattern`, `path` |
| **Grep** | `pattern`, `path`, `glob`, `output_mode`, `-i`, `multiline` |
| **WebFetch** | `url`, `prompt` |
| **WebSearch** | `query`, `allowed_domains`, `blocked_domains` |
| **Agent** | `prompt`, `description`, `subagent_type`, `model` |
| **AskUserQuestion** | `questions[]`, `answers{}` |

---

## 7. 환경변수

| 변수 | 설명 |
|------|------|
| `CLAUDE_PROJECT_DIR` | 프로젝트 루트 |
| `CLAUDE_PLUGIN_ROOT` | 플러그인 설치 디렉토리 (업데이트 시 변경) |
| `CLAUDE_PLUGIN_DATA` | 플러그인 영구 데이터 디렉토리 |
| `CLAUDE_CODE_REMOTE` | 원격 웹 환경에서 `"true"` |
| `CLAUDE_ENV_FILE` | SessionStart/CwdChanged/FileChanged에서 환경변수 지속용 파일 |
| `CLAUDE_SESSION_ID` | 세션 ID |
| `CLAUDE_TRANSCRIPT_PATH` | 트랜스크립트 경로 |
| `CLAUDE_CWD` | 현재 작업 디렉토리 |
| `CLAUDE_PERMISSION_MODE` | 현재 권한 모드 |
| `CLAUDE_HOOK_EVENT_NAME` | 이벤트명 |
| `CLAUDE_AGENT_ID` / `CLAUDE_AGENT_TYPE` | 서브에이전트 전용 |

---

## 8. 비활성화

- `"disableAllHooks": true` → 전체 비활성화 (개별 불가)
- Managed 레벨 훅은 Managed 레벨에서만 비활성화 가능
- 설정 파일 직접 편집 → 파일 워처가 자동 감지

> [insight] 훅 레퍼런스에서 가장 중요한 발견: **exit code 1은 비차단**이다. Unix 관례와 달리 exit 1은 에러를 로깅만 하고 실행을 계속한다. 정책 강제는 반드시 exit 2를 사용해야 한다. 이걸 모르면 "차단했다고 생각했는데 실제로 통과됨"이 발생. 하네스에서 보안 훅을 작성할 때 가장 흔한 실수가 될 수 있다.

> [insight] `PreToolUse`의 `defer`는 Agent SDK 연동의 핵심 메커니즘이다. 비인터랙티브에서 도구 실행을 중단하고 외부 프로세스에 제어를 넘긴 후, `--resume`으로 재개 시 다시 발화. `AskUserQuestion` + `defer`로 커스텀 UI를 통한 사용자 입력 수집이 가능. 하네스에서 외부 승인 워크플로를 구현하는 핵심 패턴.

> [insight] 4종 핸들러 타입은 복잡도 스펙트럼을 형성한다: command(셸 스크립트) → http(외부 서비스) → prompt(LLM 단일 평가) → agent(도구 사용 LLM 평가). prompt/agent 훅은 API 호출을 수반하므로 비용이 발생하지만, 코드 없이 자연어로 정책을 표현할 수 있다.

> [insight] `CLAUDE_ENV_FILE`은 SessionStart, CwdChanged, FileChanged 3개 이벤트에서만 사용 가능하다. Bash 도구의 환경변수 비지속 제약을 우회하는 공식 메커니즘. 하네스에서 direnv 스타일의 디렉토리별 환경 관리를 CwdChanged 훅으로 구현 가능.
