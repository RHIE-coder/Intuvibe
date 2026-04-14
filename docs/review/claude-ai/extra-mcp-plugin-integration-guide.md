# MCP 연동 플러그인 구축 가이드

---

하네스 플러그인이 MCP 서버를 활용해 외부 서비스와 통합하는 방법.  
Anthropic Messages API의 MCP Connector + Agent SDK의 MCP 설정 + 직접 MCP 클라이언트 구현을 포함.

---

## 1. MCP 연동의 3가지 경로

| 경로 | 방식 | 사용 시점 |
|------|------|---------|
| **A. MCP Connector (Messages API)** | `mcp_servers` + `mcp_toolset` 파라미터 | 서버사이드에서 원격 MCP 서버에 직접 연결 |
| **B. Agent SDK `mcp_servers` 옵션** | SDK가 로컬/원격 MCP 서버 자동 관리 | Agent SDK 기반 플러그인에서 MCP 활용 |
| **C. 직접 MCP 클라이언트 구현** | MCP SDK로 클라이언트 코드 작성 | 세밀한 제어가 필요할 때 |

---

## 2. 경로 A: MCP Connector (Messages API)

API 레벨에서 원격 MCP 서버에 직접 연결. 별도 MCP 클라이언트 불필요.

### 기본 구조

```python
response = client.beta.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1000,
    messages=[{"role": "user", "content": "내 캘린더 일정 보여줘"}],
    # 1. MCP 서버 연결 정의
    mcp_servers=[{
        "type": "url",
        "url": "https://calendar.example.com/mcp/sse",
        "name": "calendar",
        "authorization_token": "Bearer YOUR_TOKEN",
    }],
    # 2. 툴셋 설정
    tools=[{"type": "mcp_toolset", "mcp_server_name": "calendar"}],
    betas=["mcp-client-2025-11-20"],
)
```

### 툴 접근 제어 패턴

#### Allowlist (특정 툴만 허용)
```json
{
  "type": "mcp_toolset",
  "mcp_server_name": "calendar",
  "default_config": { "enabled": false },
  "configs": {
    "search_events": { "enabled": true },
    "get_event": { "enabled": true }
  }
}
```

#### Denylist (위험한 툴 차단)
```json
{
  "type": "mcp_toolset",
  "mcp_server_name": "calendar",
  "configs": {
    "delete_all_events": { "enabled": false }
  }
}
```

#### Deferred Loading (대규모 MCP 서버용)
```json
{
  "type": "mcp_toolset",
  "mcp_server_name": "salesforce",
  "default_config": { "defer_loading": true },
  "configs": {
    "search_records": { "enabled": true, "defer_loading": false }
  }
}
```

수백 개 툴을 가진 SaaS MCP 서버에서 초기 컨텍스트 효율 유지.

### 응답 처리

```python
for block in response.content:
    if block.type == "mcp_tool_use":
        print(f"Tool: {block.name}, Server: {block.server_name}")
    elif block.type == "mcp_tool_result":
        print(f"Result (error={block.is_error}): {block.content}")
```

### 제한사항

- **HTTPS 공개 서버만** (stdio 로컬 서버 불가)
- Bedrock/Vertex 미지원
- ZDR 미지원
- 툴 호출만 (프롬프트/리소스 미지원)

---

## 3. 경로 B: Agent SDK `mcp_servers` 옵션

Agent SDK가 MCP 서버 연결을 자동 관리. stdio + HTTP 모두 지원.

### Python

```python
from claude_agent_sdk import query, ClaudeAgentOptions

options = ClaudeAgentOptions(
    # 로컬 stdio MCP 서버
    mcp_servers={
        "filesystem": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
        },
        # 원격 HTTP MCP 서버
        "notion": {
            "url": "https://mcp.notion.so/sse",
            "authorization_token": "Bearer ntn_xxx",
        },
    },
    allowed_tools=["mcp__filesystem__read_file", "mcp__notion__search"],
    permission_mode="dontAsk",
)

async for msg in query(prompt="README.md 파일 읽어줘", options=options):
    print(msg)
```

### TypeScript

```typescript
import { query, type Options } from "@anthropic-ai/claude-agent-sdk";

const options: Options = {
  mcpServers: {
    filesystem: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"],
    },
    jira: {
      url: "https://mcp.atlassian.com/jira/sse",
      authorizationToken: "Bearer xxx",
    },
  },
  allowedTools: ["mcp__filesystem__*", "mcp__jira__search_issues"],
  permissionMode: "dontAsk",
};

for await (const msg of query({ prompt: "이슈 목록 조회", options })) {
  console.log(msg);
}
```

### MCP 서버 설정을 파일로 분리

```python
# mcp_config.json 파일 경로 전달
options = ClaudeAgentOptions(
    mcp_servers="/path/to/mcp_config.json",
)
```

```json
// mcp_config.json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_TOKEN": "ghp_xxx" }
    }
  }
}
```

### MCP 서버 상태 관리

```python
async with ClaudeSDKClient(options=options) as client:
    # MCP 서버 상태 확인
    status = await client.get_mcp_status()
    
    # 서버 재연결
    await client.reconnect_mcp_server("notion")
    
    # 서버 활성화/비활성화
    await client.toggle_mcp_server("filesystem", enabled=False)
```

---

## 4. 경로 C: 직접 MCP 클라이언트 구현

TS SDK의 클라이언트 사이드 헬퍼로 로컬 stdio MCP 서버를 직접 연결.

```typescript
import { mcpTools, mcpMessages, mcpResourceToContent }
  from "@anthropic-ai/sdk/helpers/beta/mcp";

// MCP 도구 → Claude API 도구 변환
const tools = mcpTools(mcpClient.listTools(), mcpClient);

// MCP 프롬프트 → Claude API 메시지 변환
const messages = mcpMessages(mcpClient.getPrompt("analyze").messages);

// MCP 리소스 → 콘텐츠 블록 변환
const content = mcpResourceToContent(mcpClient.readResource("file:///data.csv"));
```

| 헬퍼 | 설명 |
|------|------|
| `mcpTools(tools, mcpClient)` | MCP 툴 → Claude API 툴 변환 (tool runner 포함) |
| `mcpMessages(messages)` | MCP 프롬프트 메시지 → Claude API 메시지 변환 |
| `mcpResourceToContent(resource)` | MCP 리소스 → 콘텐츠 블록 |
| `mcpResourceToFile(resource)` | MCP 리소스 → 파일 업로드 객체 |

---

## 5. 플러그인 아키텍처 패턴

### 패턴 A: MCP 래퍼 플러그인 (외부 SaaS 통합)

```
사용자 → 하네스 → Agent SDK → MCP Client → 원격 MCP Server (Notion/Jira/Salesforce)
```

플러그인 코드는 Agent SDK `mcp_servers` 설정만 정의. 실제 기능은 외부 MCP 서버가 제공.

```python
# 플러그인 설정 (코드 최소화)
PLUGIN_MCP_CONFIG = {
    "notion": {
        "url": "https://mcp.notion.so/sse",
        "authorization_token": f"Bearer {user_token}",
    }
}

options = ClaudeAgentOptions(
    mcp_servers=PLUGIN_MCP_CONFIG,
    tools=[{"type": "mcp_toolset", "mcp_server_name": "notion"}],
)
```

### 패턴 B: 커스텀 MCP 서버 플러그인 (자체 로직)

```
사용자 → 하네스 → Agent SDK → MCP Client → 자체 MCP Server (FastMCP)
                                                   └── 내부 DB / API
```

플러그인이 자체 MCP 서버를 번들로 포함. FastMCP로 구현.

```python
# my_plugin/mcp_server.py
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("my-analytics")

@mcp.tool()
async def query_metrics(metric_name: str, period: str = "7d") -> str:
    """Query internal analytics metrics."""
    # 내부 DB 조회 로직
    return f"{metric_name}: 1234 over {period}"

if __name__ == "__main__":
    mcp.run(transport="stdio")
```

```python
# 플러그인 등록
options = ClaudeAgentOptions(
    mcp_servers={
        "my-analytics": {
            "command": "python",
            "args": ["/plugins/my-plugin/mcp_server.py"],
        }
    },
)
```

### 패턴 C: 하이브리드 (자체 서버 + 외부 서버)

```python
options = ClaudeAgentOptions(
    mcp_servers={
        # 자체 MCP 서버 (로컬 stdio)
        "internal-db": {
            "command": "python",
            "args": ["/plugins/db-server/main.py"],
        },
        # 외부 MCP 서버 (원격 HTTP)
        "github": {
            "url": "https://mcp.github.com/sse",
            "authorization_token": f"Bearer {github_token}",
        },
    },
)
```

---

## 6. 보안 설계

### 플러그인 레벨 보안

| 항목 | 구현 |
|------|------|
| 파괴적 툴 차단 | `mcp_toolset` denylist로 `delete_*`, `drop_*` 등 기본 차단 |
| OAuth 토큰 관리 | 하네스가 토큰 발급/갱신 관리, 플러그인에 `authorization_token`으로 주입 |
| 입력 유효성 검사 | MCP 서버 내부에서 `inputSchema` 기반 자동 검증 |
| 레이트 리밋 | MCP 서버 레벨에서 tool 호출 빈도 제한 |
| 감사 로깅 | `mcp_tool_use` / `mcp_tool_result` 블록을 실행 로그에 기록 |

### 원격 MCP 서버 신뢰성 검증

Anthropic이 보증하지 않는 서드파티 서버 → 플러그인 등록 심사 시:

1. MCP 서버의 TLS 인증서 검증
2. OAuth 스코프 최소화 확인
3. 데이터 처리 정책 검토 (GDPR/HIPAA 영향)
4. 서버 가용성 SLA 확인

---

## 7. 테스트 및 디버깅

### MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

- MCP 서버에 연결하여 tool/resource/prompt 목록 확인
- tool 호출 테스트
- OAuth 플로우 테스트 (Quick OAuth Flow)

### 로그 확인 (Claude Desktop)

```bash
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```

### Agent SDK에서 MCP 디버깅

```python
# SystemMessage의 init 서브타입으로 MCP 서버 연결 상태 확인
async for msg in query(prompt="...", options=options):
    if hasattr(msg, 'subtype') and msg.subtype == 'init':
        print(f"MCP servers: {msg.data.get('mcp_servers')}")
```

---

## 8. 주요 MCP 서버 생태계

| 서비스 | MCP 서버 | 주요 Tool |
|--------|---------|----------|
| GitHub | `@modelcontextprotocol/server-github` | 이슈/PR 관리 |
| Filesystem | `@modelcontextprotocol/server-filesystem` | 파일 읽기/쓰기 |
| PostgreSQL | `@modelcontextprotocol/server-postgres` | DB 쿼리 |
| Notion | 공식 MCP 서버 | 페이지/DB 검색 |
| Jira | Atlassian 공식 | 이슈 관리 |
| Salesforce | 공식 MCP 서버 | CRM 데이터 |
| Slack | 공식 MCP 서버 | 메시지/채널 관리 |

전체 목록: https://github.com/modelcontextprotocol/servers (수백 개)

---

> [insight] 하네스의 플러그인 마켓플레이스에서 MCP 래퍼 플러그인(패턴 A)은 개발 비용이 가장 낮다. 기존 SaaS의 MCP 서버를 그대로 활용하므로 플러그인 코드는 설정 파일 수준이며, 하네스는 OAuth 토큰 관리와 denylist 정책만 제공하면 된다. 마켓플레이스에서 "MCP 래퍼" 카테고리를 별도로 만들어 생태계를 빠르게 확장하는 전략이 유효하다.

> [insight] Agent SDK의 `mcp_servers` 딕셔너리와 Messages API의 `mcp_servers` 배열은 설정 형식이 다르다. 하네스가 플러그인 설정을 통합 관리하려면 양쪽 형식을 모두 생성할 수 있는 설정 어댑터가 필요하다. 특히 Agent SDK는 stdio 로컬 서버를 지원하지만 Messages API의 MCP Connector는 HTTPS만 지원하므로, 플러그인이 어느 경로를 사용할지에 따라 호환 가능한 MCP 서버 transport가 달라진다.

> [insight] `defer_loading: true` + Tool Search 조합은 수십~수백 개 툴을 가진 Salesforce/Jira 같은 대규모 SaaS MCP 서버를 래핑할 때 필수다. 초기 컨텍스트에 모든 툴 설명을 로딩하면 토큰 낭비와 성능 저하가 발생한다. 하네스의 대규모 SaaS 래퍼 플러그인은 이 패턴을 기본 적용해야 한다.
