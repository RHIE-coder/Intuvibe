# TypeScript Agent SDK Reference

---

## 1. 설치

```bash
npm install @anthropic-ai/claude-agent-sdk
```

---

## 2. 주요 함수

### `query()`
```typescript
function query({ prompt, options? }): Query
// prompt: string | AsyncIterable<SDKUserMessage>
```

### `tool()` — 커스텀 MCP 툴 정의 (Zod 스키마)
```typescript
const myTool = tool("name", "description", { q: z.string() }, async ({ q }) => {
  return { content: [{ type: "text", text: "..." }] };
}, { annotations: { readOnlyHint: true } });
```

### `createSdkMcpServer()` — 인프로세스 MCP 서버
```typescript
const server = createSdkMcpServer({ name: "my-server", tools: [myTool] });
```

### 세션 관리 함수
| 함수 | 설명 |
|------|------|
| `listSessions({ dir?, limit?, includeWorktrees? })` | 과거 세션 목록 (lastModified 내림차순) |
| `getSessionMessages(sessionId, { dir?, limit?, offset? })` | 세션 메시지 읽기 |
| `getSessionInfo(sessionId, { dir? })` | 단일 세션 메타데이터 |
| `renameSession(sessionId, title, { dir? })` | 세션 제목 변경 |
| `tagSession(sessionId, tag | null, { dir? })` | 세션 태그 설정/해제 |

---

## 3. `Options` (query 설정 — 주요 필드)

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `allowedTools` | `[]` | 자동 승인 툴 (미승인 툴 → permissionMode로 처리) |
| `disallowedTools` | `[]` | 항상 거부 (모든 모드 우선) |
| `permissionMode` | `'default'` | 권한 모드 |
| `canUseTool` | - | 커스텀 권한 함수 |
| `agents` | - | 서브에이전트 정의 (`Record<string, AgentDefinition>`) |
| `mcpServers` | `{}` | MCP 서버 설정 |
| `plugins` | `[]` | 로컬 플러그인 로딩 |
| `settingSources` | `[]` | 파일시스템 설정 로딩 (`"user"`, `"project"`, `"local"`) |
| `systemPrompt` | minimal | 문자열 또는 `{ type: 'preset', preset: 'claude_code', append? }` |
| `hooks` | `{}` | 훅 콜백 |
| `resume` | - | 재개할 세션 ID |
| `forkSession` | `false` | 재개 시 새 세션 ID로 분기 |
| `maxTurns` | - | 최대 에이전트 턴 수 |
| `maxBudgetUsd` | - | 최대 예산 (USD) |
| `effort` | - | `'low'`/`'medium'`/`'high'`/`'max'` |
| `outputFormat` | - | `{ type: 'json_schema', schema: ... }` |
| `enableFileCheckpointing` | `false` | 파일 체크포인팅 활성화 |
| `includePartialMessages` | `false` | 스트리밍 부분 메시지 포함 |
| `cwd` | `process.cwd()` | 작업 디렉토리 |
| `persistSession` | `true` | `false`로 세션 저장 비활성화 |
| `tools` | - | 툴 목록 또는 `{ type: 'preset', preset: 'claude_code' }` |
| `thinking` | adaptive | `ThinkingConfig` |
| `toolConfig` | - | `{ askUserQuestion: { previewFormat: 'markdown'|'html' } }` |

### `settingSources` 우선순위 (높음 → 낮음)
1. Local (`.claude/settings.local.json`)
2. Project (`.claude/settings.json`)
3. User (`~/.claude/settings.json`)

프로그래매틱 옵션이 파일시스템 설정보다 항상 우선.

---

## 4. `Query` 객체 메서드

| 메서드 | 설명 |
|--------|------|
| `interrupt()` | 쿼리 중단 (스트리밍 입력 모드) |
| `rewindFiles(userMessageId, { dryRun? })` | 파일 복원 |
| `setPermissionMode(mode)` | 권한 모드 동적 변경 |
| `setModel(model?)` | 모델 변경 |
| `mcpServerStatus()` | MCP 서버 상태 |
| `setMcpServers(servers)` | MCP 서버 동적 교체 |
| `reconnectMcpServer(name)` / `toggleMcpServer(name, enabled)` | MCP 서버 관리 |
| `streamInput(stream)` | 멀티턴 입력 스트림 |
| `stopTask(taskId)` | 백그라운드 태스크 중지 |
| `close()` | 쿼리 강제 종료 |
| `initializationResult()` | 초기화 정보 (commands, models, agents, ...) |
| `supportedCommands()` / `supportedModels()` / `supportedAgents()` | 지원 목록 조회 |

---

## 5. 메시지 타입

| 타입 | `type` 필드 | 설명 |
|------|------------|------|
| `SDKAssistantMessage` | `"assistant"` | `message: BetaMessage` (id, content, usage) |
| `SDKUserMessage` | `"user"` | 사용자 입력 |
| `SDKResultMessage` | `"result"` | `subtype: "success"` / `"error_*"`, `total_cost_usd`, `modelUsage`, `structured_output` |
| `SDKSystemMessage` | `"system"` + `subtype: "init"` | 세션 초기화: tools, mcp_servers, plugins, slash_commands |
| `SDKCompactBoundaryMessage` | `"system"` + `subtype: "compact_boundary"` | 컴팩션 완료, `compact_metadata` |
| `SDKPartialAssistantMessage` | `"stream_event"` | `includePartialMessages: true` 시 스트리밍 이벤트 |

### `SDKResultMessage` subtypes
- `success`, `error_max_turns`, `error_during_execution`, `error_max_budget_usd`, `error_max_structured_output_retries`

---

## 6. 훅 입력 타입 요약

모든 훅 입력: `session_id`, `cwd`, `hook_event_name`, `agent_id?`, `agent_type?` 공통 포함.

| 훅 | 추가 필드 |
|----|---------|
| `PreToolUse` | `tool_name`, `tool_input`, `tool_use_id` |
| `PostToolUse` | `tool_name`, `tool_input`, `tool_response`, `tool_use_id` |
| `Notification` | `message`, `title?`, `notification_type` |
| `SubagentStop` | `agent_id`, `agent_transcript_path`, `agent_type` |
| `SessionStart` | `source: "startup"|"resume"|"clear"|"compact"`, `model?` |
| `PreCompact` | `trigger: "manual"|"auto"`, `custom_instructions` |
| `PermissionRequest` | `tool_name`, `tool_input`, `permission_suggestions?` |

### `SyncHookJSONOutput` 주요 필드
```typescript
{
  systemMessage?: string,          // 대화에 컨텍스트 주입
  continue?: boolean,              // 에이전트 계속 실행 여부
  hookSpecificOutput?: {
    hookEventName: "PreToolUse",
    permissionDecision?: "allow" | "deny" | "ask",
    updatedInput?: Record<string, unknown>,
    additionalContext?: string,
  }
}
```

---

## 7. 내장 툴 입력 타입 (주요)

| 툴 | 타입명 | 주요 필드 |
|----|--------|---------|
| `Agent` | `AgentInput` | `prompt`, `subagent_type`, `model?`, `isolation?`, `mode?` |
| `AskUserQuestion` | `AskUserQuestionInput` | `questions[]: { question, options[], multiSelect }` |
| `Bash` | `BashInput` | `command`, `timeout?`, `run_in_background?` |
| `Edit` | `FileEditInput` | `file_path`, `old_string`, `new_string`, `replace_all?` |
| `Read` | `FileReadInput` | `file_path`, `offset?`, `limit?`, `pages?` |
| `Write` | `FileWriteInput` | `file_path`, `content` |

---

## 8. `AgentDefinition` (서브에이전트)

```typescript
type AgentDefinition = {
  description: string;      // 필수: 호출 시점 판단 기준
  prompt: string;           // 필수: 시스템 프롬프트
  tools?: string[];
  disallowedTools?: string[];
  model?: "sonnet" | "opus" | "haiku" | "inherit";
  mcpServers?: AgentMcpServerSpec[];
  skills?: string[];
  maxTurns?: number;
};
```

---

> [insight] TypeScript SDK의 `Query` 객체 메서드들(`setPermissionMode`, `setMcpServers`, `reconnectMcpServer`, `toggleMcpServer`)은 하네스의 동적 에이전트 설정 변경 기능 구현에서 핵심이다. 플러그인 실행 중에 MCP 서버를 동적으로 추가/제거하거나 권한 모드를 전환하는 런타임 제어가 가능해진다. 특히 `toggleMcpServer`는 플러그인을 일시 비활성화하는 간단한 방법으로 활용할 수 있다.
