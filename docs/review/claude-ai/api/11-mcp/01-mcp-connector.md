# MCP Connector (Messages API)

---

별도 MCP 클라이언트 없이 Messages API에서 직접 원격 MCP 서버에 연결.

**Beta header**: `"anthropic-beta": "mcp-client-2025-11-20"`  
**ZDR**: ❌ 미지원  
**제한**: HTTP(S) 공개 서버만 지원 (stdio 로컬 서버 불가), Bedrock/Vertex 미지원, 툴 호출만 지원 (프롬프트/리소스 미지원)

---

## 1. 기본 구조 (2개 컴포넌트)

```python
response = client.beta.messages.create(
    model="claude-opus-4-6",
    max_tokens=1000,
    messages=[{"role": "user", "content": "..."}],
    # 1. MCP 서버 연결 정의
    mcp_servers=[{
        "type": "url",
        "url": "https://example-server.modelcontextprotocol.io/sse",
        "name": "example-mcp",
        "authorization_token": "YOUR_TOKEN",
    }],
    # 2. 툴셋 설정
    tools=[{"type": "mcp_toolset", "mcp_server_name": "example-mcp"}],
    betas=["mcp-client-2025-11-20"],
)
```

---

## 2. `mcp_servers` 필드

| 필드 | 필수 | 설명 |
|------|------|------|
| `type` | ✅ | `"url"` 고정 |
| `url` | ✅ | HTTPS URL (Streamable HTTP 또는 SSE) |
| `name` | ✅ | 고유 식별자 (MCPToolset에서 참조) |
| `authorization_token` | - | OAuth Bearer 토큰 |

---

## 3. `mcp_toolset` 설정 패턴

### 전체 허용 (기본)
```json
{ "type": "mcp_toolset", "mcp_server_name": "example-mcp" }
```

### Allowlist (특정 툴만 허용)
```json
{
  "type": "mcp_toolset",
  "mcp_server_name": "example-mcp",
  "default_config": { "enabled": false },
  "configs": {
    "search_events": { "enabled": true },
    "create_event": { "enabled": true }
  }
}
```

### Denylist (특정 툴만 차단)
```json
{
  "type": "mcp_toolset",
  "mcp_server_name": "example-mcp",
  "configs": {
    "delete_all_events": { "enabled": false }
  }
}
```

### 설정 우선순위: `configs` > `default_config` > 시스템 기본값

---

## 4. 툴 설정 필드

| 필드 | 기본값 | 설명 |
|------|--------|------|
| `enabled` | `true` | 툴 활성화 여부 |
| `defer_loading` | `false` | `true` 시 초기 컨텍스트에 툴 설명 미포함 (Tool Search와 함께 사용) |

---

## 5. 응답 콘텐츠 타입

```json
// MCP 툴 호출
{ "type": "mcp_tool_use", "id": "mcptoolu_...", "name": "echo", "server_name": "example-mcp", "input": {...} }

// MCP 툴 결과
{ "type": "mcp_tool_result", "tool_use_id": "mcptoolu_...", "is_error": false, "content": [...] }
```

---

## 6. OAuth 인증

SDK가 OAuth 플로우 자동 처리 안 함 → 외부에서 토큰 취득 후 `authorization_token`에 전달.  
테스트용 토큰 취득: `npx @modelcontextprotocol/inspector` → Quick OAuth Flow

---

## 7. TS SDK 클라이언트 사이드 헬퍼 (로컬 서버용)

원격 MCP Connector가 아닌 로컬 stdio 서버, 프롬프트, 리소스 사용 시:

```typescript
import { mcpTools, mcpMessages, mcpResourceToContent, mcpResourceToFile }
  from "@anthropic-ai/sdk/helpers/beta/mcp";
```

| 헬퍼 | 설명 |
|------|------|
| `mcpTools(tools, mcpClient)` | MCP 툴 → Claude API 툴 변환 (tool runner용) |
| `mcpMessages(messages)` | MCP 프롬프트 메시지 → Claude API 메시지 변환 |
| `mcpResourceToContent(resource)` | MCP 리소스 → 콘텐츠 블록 |
| `mcpResourceToFile(resource)` | MCP 리소스 → 파일 업로드 객체 |

---

> [insight] MCP Connector의 `mcp_toolset` allowlist/denylist 패턴은 하네스의 플러그인 툴 접근 제어 모델과 동일한 구조다. 플러그인이 연결하는 외부 MCP 서버에서 어떤 툴을 노출할지를 `mcp_toolset` 설정으로 중앙 관리하면, 플러그인 코드 변경 없이 운영자가 허용/차단 목록을 동적으로 조정할 수 있다. 특히 `delete_all` 류의 파괴적 툴을 기본적으로 차단하는 denylist 정책을 하네스 플랫폼 레벨에서 강제하는 것이 타당하다.

> [insight] `defer_loading: true` + Tool Search 조합은 하네스에서 대규모 MCP 서버(수십-수백 개 툴 보유)를 연결할 때 컨텍스트 효율을 높이는 패턴이다. 초기 컨텍스트에 툴 설명을 로딩하지 않고 필요 시에만 검색으로 가져오므로, 많은 툴을 제공하는 외부 SaaS MCP 서버(Notion, Jira, Salesforce 등)를 플러그인으로 래핑할 때 효과적이다.
