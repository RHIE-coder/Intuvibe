# MCP 서버 구축 가이드

---

Model Context Protocol(MCP) 서버를 직접 구축하기 위한 아키텍처 이해 + 실전 구현 가이드.

---

## 1. MCP 아키텍처 개요

### 참여자 (3-Tier)

```
MCP Host (AI 앱: Claude Code, VS Code 등)
  ├── MCP Client 1 ──── MCP Server A (Local, stdio)
  ├── MCP Client 2 ──── MCP Server B (Local, stdio)
  └── MCP Client 3 ──── MCP Server C (Remote, Streamable HTTP)
```

| 참여자 | 역할 |
|--------|------|
| **MCP Host** | AI 앱. 하나 이상의 MCP Client를 조율 |
| **MCP Client** | 특정 MCP Server와 1:1 연결 유지 |
| **MCP Server** | 컨텍스트(Tools/Resources/Prompts) 제공 |

### 2-Layer 구조

| 레이어 | 역할 | 프로토콜 |
|--------|------|---------|
| **Data Layer** | 메시지 구조/의미론 정의 | JSON-RPC 2.0 |
| **Transport Layer** | 통신 채널 + 인증 | stdio 또는 Streamable HTTP |

---

## 2. 핵심 Primitive (서버가 노출하는 3가지)

| Primitive | 제어 주체 | 설명 | 메서드 |
|-----------|----------|------|--------|
| **Tools** | 모델 제어 (Model-controlled) | LLM이 호출하는 실행 가능한 함수 | `tools/list`, `tools/call` |
| **Resources** | 앱 제어 (Application-driven) | 컨텍스트 데이터 소스 (파일, DB 등) | `resources/list`, `resources/read` |
| **Prompts** | 사용자 제어 | 재사용 가능한 LLM 상호작용 템플릿 | `prompts/list`, `prompts/get` |

### Tool 정의 스키마

```json
{
  "name": "get_weather",
  "title": "Weather Information Provider",
  "description": "Get current weather for a location",
  "inputSchema": {
    "type": "object",
    "properties": {
      "location": { "type": "string", "description": "City name or zip code" }
    },
    "required": ["location"]
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "temperature": { "type": "number" },
      "conditions": { "type": "string" }
    },
    "required": ["temperature", "conditions"]
  }
}
```

### Tool 결과 타입

| 타입 | 설명 |
|------|------|
| `text` | 텍스트 응답 |
| `image` | Base64 인코딩 이미지 |
| `audio` | Base64 인코딩 오디오 |
| `resource_link` | 리소스 URI 링크 |
| `resource` | 임베디드 리소스 (인라인) |
| `structuredContent` | JSON 구조화 응답 (`outputSchema` 기반 검증) |

### Resource 정의

```json
{
  "uri": "file:///project/src/main.rs",
  "name": "main.rs",
  "title": "Main Application File",
  "mimeType": "text/x-rust",
  "annotations": {
    "audience": ["assistant"],
    "priority": 0.9,
    "lastModified": "2025-01-12T15:00:58Z"
  }
}
```

- URI 스킴: `https://`, `file://`, `git://`, 커스텀 스킴 가능
- 구독(subscribe) 지원: 리소스 변경 시 실시간 알림

---

## 3. Transport 비교

### stdio (로컬 서버)

- 클라이언트가 서버를 **서브프로세스**로 실행
- stdin/stdout으로 JSON-RPC 메시지 교환
- **개행 구분**, 메시지 내 개행 금지
- stderr로 로깅 (stdout에 비-MCP 데이터 쓰기 금지)

### Streamable HTTP (원격 서버)

단일 HTTP 엔드포인트에서 POST + GET 처리:

| 메서드 | 용도 |
|--------|------|
| **POST** | 클라이언트 → 서버 메시지 전송 |
| **GET** | 서버 → 클라이언트 SSE 스트림 열기 |

**세션 관리**: `Mcp-Session-Id` 헤더로 stateful 세션 유지.  
**보안**: Origin 헤더 검증 필수 (DNS 리바인딩 방지), localhost 바인딩 권장.

---

## 4. Lifecycle (연결 수명)

```
Client                          Server
  │── initialize ──────────────→│  (capability 협상)
  │←── InitializeResult ────────│
  │── notifications/initialized →│
  │                              │
  │── tools/list ──────────────→│  (도구 발견)
  │←── tool list ───────────────│
  │                              │
  │── tools/call ──────────────→│  (도구 실행)
  │←── tool result ─────────────│
  │                              │
  │←── notifications/tools/     │  (실시간 업데이트)
  │    list_changed ────────────│
```

**Capability 협상** 예시:

```json
// Client → Server
{
  "method": "initialize",
  "params": {
    "protocolVersion": "2025-06-18",
    "capabilities": { "elicitation": {} },
    "clientInfo": { "name": "my-client", "version": "1.0.0" }
  }
}

// Server → Client
{
  "result": {
    "protocolVersion": "2025-06-18",
    "capabilities": {
      "tools": { "listChanged": true },
      "resources": { "subscribe": true }
    },
    "serverInfo": { "name": "my-server", "version": "1.0.0" }
  }
}
```

---

## 5. 구현 (Python — FastMCP)

### 환경 설정

```bash
uv init my-server && cd my-server
uv venv && source .venv/bin/activate
uv add "mcp[cli]" httpx
```

### 서버 코드

```python
from typing import Any
import httpx
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("weather")

NWS_API_BASE = "https://api.weather.gov"
USER_AGENT = "weather-app/1.0"


async def make_nws_request(url: str) -> dict[str, Any] | None:
    headers = {"User-Agent": USER_AGENT, "Accept": "application/geo+json"}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, timeout=30.0)
            response.raise_for_status()
            return response.json()
        except Exception:
            return None


@mcp.tool()
async def get_alerts(state: str) -> str:
    """Get weather alerts for a US state.
    Args:
        state: Two-letter US state code (e.g. CA, NY)
    """
    url = f"{NWS_API_BASE}/alerts/active/area/{state}"
    data = await make_nws_request(url)
    if not data or "features" not in data:
        return "Unable to fetch alerts or no alerts found."
    if not data["features"]:
        return "No active alerts for this state."
    alerts = []
    for feature in data["features"]:
        props = feature["properties"]
        alerts.append(f"Event: {props.get('event')}\nSeverity: {props.get('severity')}")
    return "\n---\n".join(alerts)


@mcp.tool()
async def get_forecast(latitude: float, longitude: float) -> str:
    """Get weather forecast for a location.
    Args:
        latitude: Latitude of the location
        longitude: Longitude of the location
    """
    points_url = f"{NWS_API_BASE}/points/{latitude},{longitude}"
    points_data = await make_nws_request(points_url)
    if not points_data:
        return "Unable to fetch forecast data."
    forecast_url = points_data["properties"]["forecast"]
    forecast_data = await make_nws_request(forecast_url)
    if not forecast_data:
        return "Unable to fetch detailed forecast."
    periods = forecast_data["properties"]["periods"]
    forecasts = []
    for p in periods[:5]:
        forecasts.append(f"{p['name']}: {p['temperature']}{p['temperatureUnit']}, {p['detailedForecast']}")
    return "\n---\n".join(forecasts)


if __name__ == "__main__":
    mcp.run(transport="stdio")
```

**핵심**: `@mcp.tool()` 데코레이터 + 타입 힌트 + docstring → tool 정의 자동 생성.

### Claude Desktop 연결

`~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "weather": {
      "command": "uv",
      "args": ["--directory", "/absolute/path/to/weather", "run", "weather.py"]
    }
  }
}
```

---

## 6. 구현 (TypeScript — MCP SDK)

```bash
mkdir weather && cd weather && npm init -y
npm install @modelcontextprotocol/sdk zod@3
npm install -D @types/node typescript
```

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({ name: "weather", version: "1.0.0" });

server.registerTool(
  "get_alerts",
  {
    description: "Get weather alerts for a state",
    inputSchema: {
      state: z.string().length(2).describe("Two-letter state code"),
    },
  },
  async ({ state }) => {
    // 구현...
    return { content: [{ type: "text", text: "..." }] };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Weather MCP Server running on stdio");
}
main().catch(console.error);
```

---

## 7. 다른 언어 지원

| 언어 | SDK / 프레임워크 | Tool 정의 방식 |
|------|----------------|---------------|
| **Java** | Spring AI MCP (`spring-ai-starter-mcp-server`) | `@Tool` annotation |
| **Kotlin** | `io.modelcontextprotocol:kotlin-sdk` | `server.addTool()` |
| **C#** | `ModelContextProtocol` NuGet | `[McpServerToolType]` attribute |
| **Ruby** | `mcp` gem | `MCP::Tool` subclass |
| **Rust** | `rmcp` crate | `#[tool]` macro |
| **Go** | `github.com/modelcontextprotocol/go-sdk/mcp` | `mcp.AddTool()` |

---

## 8. 에러 처리

| 에러 유형 | 보고 방식 | 예시 |
|----------|----------|------|
| **프로토콜 에러** | JSON-RPC `error` 객체 | 알 수 없는 도구명, 잘못된 인수 |
| **실행 에러** | `isError: true` in result | API 레이트 리밋 초과, 비즈니스 로직 실패 |

```json
// 프로토콜 에러
{ "error": { "code": -32602, "message": "Unknown tool: invalid_tool_name" } }

// 실행 에러
{ "result": { "content": [{ "type": "text", "text": "API rate limit exceeded" }], "isError": true } }
```

---

## 9. 보안 요구사항

### 서버 MUST:
- 모든 tool 입력 유효성 검사
- 적절한 접근 제어 구현
- tool 호출 레이트 리밋
- 출력 새니타이징

### 클라이언트 SHOULD:
- 민감 작업에 사용자 확인 프롬프트
- tool 입력을 사용자에게 표시 (데이터 유출 방지)
- tool 결과를 LLM 전달 전 검증
- tool 호출 타임아웃 구현
- 감사용 tool 사용 로깅

---

## 10. STDIO 서버의 로깅 주의사항

```python
# ❌ 금지 — stdout에 비-MCP 데이터 쓰기 (JSON-RPC 메시지 손상)
print("Processing request")

# ✅ 올바른 방법
print("Processing request", file=sys.stderr)
import logging
logging.info("Processing request")
```

---

> [insight] 하네스 플러그인이 외부 서비스를 통합할 때, MCP 서버를 직접 구축하는 것이 가장 표준화된 방법이다. FastMCP의 `@mcp.tool()` 데코레이터 패턴을 하네스의 "플러그인 → MCP 서버 자동 생성" 스캐폴딩 도구에 내장하면, 플러그인 개발자가 함수만 작성하고 MCP 프로토콜 세부사항은 하네스가 처리할 수 있다.

> [insight] stdio vs Streamable HTTP 선택은 하네스의 플러그인 배포 토폴로지에 따라 결정된다. 하네스 서버와 같은 머신에서 실행되는 플러그인은 stdio가 최적(네트워크 오버헤드 없음), SaaS 외부 서비스는 Streamable HTTP + OAuth가 필수다. 하네스 플러그인 설정 스키마에 `transport: "stdio" | "http"` 옵션을 제공하고, http 선택 시 세션 관리(`Mcp-Session-Id`)와 Origin 검증을 자동으로 처리해야 한다.

> [insight] `outputSchema`를 제공하는 Tool은 구조화된 응답을 강제할 수 있어, 하네스가 플러그인 출력을 파이프라인으로 연결하는 데 유리하다. 플러그인 A의 outputSchema가 플러그인 B의 inputSchema와 호환되는지를 하네스가 자동 검증하면, 플러그인 체이닝의 타입 안전성을 보장할 수 있다.
