# Custom Tools in Agent SDK

---

`@tool` 데코레이터(Python) / `tool()` 헬퍼(TS)로 커스텀 툴 정의 → `create_sdk_mcp_server`로 인프로세스 MCP 서버 생성 → `mcpServers`에 등록.

---

## 1. 툴 정의 구조

| 구성요소 | 설명 |
|---------|------|
| name | 고유 식별자 |
| description | Claude가 언제 이 툴을 호출할지 판단하는 기준 |
| input schema | Python: dict(`{"key": type}`) 또는 JSON Schema / TS: Zod 스키마 |
| handler | async 함수, `{"content": [...]}` 반환 |

```python
from claude_agent_sdk import tool, create_sdk_mcp_server

@tool(
    "get_temperature",
    "Get current temperature at a location",
    {"latitude": float, "longitude": float},
)
async def get_temperature(args):
    # ... API 호출
    return {"content": [{"type": "text", "text": f"{temp}°F"}]}

weather_server = create_sdk_mcp_server(
    name="weather", version="1.0.0", tools=[get_temperature]
)
```

---

## 2. 등록 및 사용

```python
options = ClaudeAgentOptions(
    mcp_servers={"weather": weather_server},
    allowed_tools=["mcp__weather__get_temperature"],
    # 또는 와일드카드: ["mcp__weather__*"]
)
```

툴 네이밍: `mcp__{서버명}__{툴명}`

---

## 3. 툴 어노테이션

```python
from claude_agent_sdk import ToolAnnotations

@tool(..., annotations=ToolAnnotations(readOnlyHint=True))
```

| 필드 | 기본 | 의미 |
|------|------|------|
| `readOnlyHint` | false | 읽기 전용 → 다른 읽기 전용 툴과 병렬 실행 가능 |
| `destructiveHint` | true | 파괴적 업데이트 가능 (정보용) |
| `idempotentHint` | false | 멱등성 (정보용) |

어노테이션은 메타데이터일 뿐, 실제 핸들러 동작 제한 안 함.

---

## 4. 에러 처리

```python
# 에러를 던지지 말고, isError로 반환
return {
    "content": [{"type": "text", "text": "API error: 404"}],
    "is_error": True,  # Python
    # isError: true  # TypeScript
}
```

예외를 던지면 SDK가 포착해 Claude에 에러 결과로 전달 (루프 계속). `is_error` 반환이 더 명확한 에러 메시지 제공.

---

## 5. 반환 콘텐츠 타입

| 타입 | 필드 |
|------|------|
| `text` | `{"type": "text", "text": "..."}` |
| `image` | `{"type": "image", "data": "<base64>", "mimeType": "image/png"}` |
| `resource` | `{"type": "resource", "resource": {"uri": "...", "text": "..."}}` |

이미지: URL 아닌 raw base64. URL 이미지는 핸들러에서 직접 fetch 후 base64 인코딩 필요.

---

## 6. Python 스키마 패턴

```python
# enum 사용 시 dict 스키마로는 불가 → 전체 JSON Schema 필요
@tool("convert", "...", {
    "type": "object",
    "properties": {
        "unit_type": {"type": "string", "enum": ["length", "temperature"]},
        ...
    },
    "required": ["unit_type", ...]
})
```

옵션 파라미터: 스키마에서 제외 + description에 언급 + `args.get()` 으로 읽기.

---

## 7. `tools` vs `allowedTools` 구분

| 옵션 | 레이어 | 효과 |
|------|--------|------|
| `tools: ["Read", "Grep"]` | 가용성 | 나열된 내장 툴만 컨텍스트에 포함 |
| `tools: []` | 가용성 | 모든 내장 툴 제거 (MCP 툴만 사용) |
| `allowed_tools` | 권한 | 나열된 툴 자동 승인 |
| `disallowed_tools` | 권한 | 나열된 툴 호출 거부 (컨텍스트에는 여전히 포함) |

---

> [insight] `tools: []` + MCP only 패턴은 하네스의 플러그인 전용 에이전트 구성에서 중요하다. 내장 툴을 모두 제거하고 마켓플레이스 플러그인 MCP 서버 툴만 활성화하면, 플러그인별 샌드박스 에이전트를 최소 권한 원칙으로 구성할 수 있다. 각 플러그인 실행 컨텍스트에서 `tools=[]` + `allowed_tools=["mcp__{plugin}__*"]`를 표준 패턴으로 채택하면 플러그인 간 의도치 않은 내장 툴 호출을 원천 차단한다.

> [insight] `readOnlyHint=True` 어노테이션은 하네스의 병렬 처리 최적화에서 직접 활용 가능하다. 데이터 조회형 플러그인 툴들에 이 어노테이션을 표준으로 적용하면, Claude가 여러 플러그인의 읽기 전용 툴을 동시에 호출해 전체 처리 시간을 단축할 수 있다. 플러그인 마켓플레이스에서 `readOnly` 플러그인 카테고리를 별도로 관리하고, 해당 카테고리의 모든 툴에 이 어노테이션을 자동 적용하는 규칙을 구성할 수 있다.
