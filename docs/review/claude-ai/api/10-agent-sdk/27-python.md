# Python Agent SDK Reference

---

## 1. 설치

```bash
pip install claude-agent-sdk
```

---

## 2. `ClaudeAgentOptions` 주요 필드

```python
@dataclass
class ClaudeAgentOptions:
    # 툴 제어
    tools: list[str] | ToolsPreset | None = None
    allowed_tools: list[str] = []
    disallowed_tools: list[str] = []

    # 프롬프트 / 모델
    system_prompt: str | SystemPromptPreset | None = None
    model: str | None = None
    fallback_model: str | None = None
    effort: Literal["low", "medium", "high", "max"] | None = None
    thinking: ThinkingConfig | None = None

    # 세션 관리
    resume: str | None = None
    continue_conversation: bool = False
    fork_session: bool = False
    enable_file_checkpointing: bool = False

    # 제한
    max_turns: int | None = None
    max_budget_usd: float | None = None

    # MCP / 플러그인
    mcp_servers: dict[str, McpServerConfig] | str | Path = {}
    plugins: list[SdkPluginConfig] = []

    # 권한
    permission_mode: PermissionMode | None = None
    can_use_tool: CanUseTool | None = None
    hooks: dict[HookEvent, list[HookMatcher]] | None = None

    # 파일시스템 설정
    setting_sources: list[SettingSource] | None = None  # ["user","project","local"]
    cwd: str | Path | None = None
    add_dirs: list[str | Path] = []

    # 출력
    output_format: dict[str, Any] | None = None
    include_partial_messages: bool = False

    # 기타
    env: dict[str, str] = {}
    extra_args: dict[str, str | None] = {}
    agents: dict[str, AgentDefinition] | None = None
    sandbox: SandboxSettings | None = None
```

---

## 3. `ClaudeSDKClient` 메서드

```python
async with ClaudeSDKClient(options=options) as client:
    await client.query("Hello Claude")
    async for message in client.receive_response():
        print(message)
```

| 메서드 | 설명 |
|--------|------|
| `query(prompt)` | 프롬프트 전송 |
| `receive_response()` | 응답 스트림 이터레이터 |
| `interrupt()` | 쿼리 중단 |
| `set_permission_mode(mode)` | 권한 모드 동적 변경 |
| `set_model(model?)` | 모델 변경 |
| `rewind_files(user_message_id)` | 파일 복원 |
| `get_mcp_status()` | MCP 서버 상태 |
| `reconnect_mcp_server(name)` / `toggle_mcp_server(name, enabled)` | MCP 관리 |
| `stop_task(task_id)` | 백그라운드 태스크 중지 |

---

## 4. 메시지 타입

### `AssistantMessage`
```python
@dataclass
class AssistantMessage:
    content: list[ContentBlock]
    model: str
    usage: dict[str, Any] | None = None   # input_tokens, output_tokens 등
    message_id: str | None = None          # 병렬 툴 중복 제거 키
    parent_tool_use_id: str | None = None
    error: AssistantMessageError | None = None
```

### `ResultMessage`
```python
@dataclass
class ResultMessage:
    subtype: str          # "success" | "error_*"
    session_id: str
    total_cost_usd: float | None = None
    usage: dict[str, Any] | None = None
    model_usage: dict[str, Any] | None = None
    result: str | None = None
    structured_output: Any = None
    num_turns: int
    is_error: bool
```

### `SystemMessage`
```python
@dataclass
class SystemMessage:
    subtype: str          # "init" | "compact_boundary"
    data: dict[str, Any]  # slash_commands, plugins, mcp_servers, ...
```

---

## 5. 훅 설정

```python
async def protect_env(input_data, tool_use_id, context):
    if input_data["tool_input"].get("file_path", "").endswith(".env"):
        return {"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": "Cannot modify .env",
        }}
    return {}

options = ClaudeAgentOptions(
    hooks={"PreToolUse": [HookMatcher(matcher="Write|Edit", hooks=[protect_env])]}
)
```

### `HookMatcher`
```python
@dataclass
class HookMatcher:
    matcher: str | None = None    # 툴명 regex
    hooks: list[HookCallback] = []
    timeout: float | None = None  # 초 단위, 기본 60
```

### `HookEvent` 목록 (Python)
`PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `UserPromptSubmit`, `Stop`, `SubagentStart`, `SubagentStop`, `PreCompact`, `Notification`, `PermissionRequest`

**주의**: Python에서 `SessionStart`/`SessionEnd` 훅 콜백 미지원 (shell command 훅만 가능)

### `SyncHookJSONOutput` 주요 필드
```python
{
    "continue_": bool,        # Python에서는 continue_ (예약어 회피)
    "systemMessage": str,
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "allow" | "deny" | "ask",
        "updatedInput": {...},
        "additionalContext": str,
    }
}
```

---

## 6. `PermissionResult` 타입

```python
PermissionResultAllow(updated_input=None)   # 승인 (입력 수정 가능)
PermissionResultDeny(message="이유")         # 거부
```

`can_use_tool` 콜백의 반환 타입. `AskUserQuestion` 처리 시 `PermissionResultAllow(updated_input={"answers": {...}})` 반환.

---

## 7. `query()` 함수 (단순 사용)

```python
from claude_agent_sdk import query, ClaudeAgentOptions

async for message in query(
    prompt="...",
    options=ClaudeAgentOptions(...)
):
    print(message)
```

`ClaudeSDKClient` 없이 간단하게 사용 가능. 세션 제어가 필요한 경우 `ClaudeSDKClient` 사용.

---

> [insight] Python SDK에서 `continue_` (언더스코어 포함)는 Python 예약어 `continue`와의 충돌을 피하기 위한 네이밍이다. 하네스 Python 백엔드에서 훅 출력 딕셔너리를 직접 작성할 때 이를 놓치면 `continue` 키가 Python 파서에 의해 오류를 발생시킨다. 하네스의 훅 출력 빌더 유틸리티에서 이 차이를 자동으로 처리하는 래퍼를 제공하면 사용자 실수를 방지할 수 있다.
