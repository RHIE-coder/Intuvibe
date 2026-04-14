# Tool Runner (SDK)

---

에이전틱 루프, 에러 랩핑, 타입 안전성을 자동 처리하는 SDK 추상화. Python, TypeScript, Ruby SDK (beta).

---

## 1. 기본 사용

### Python: `@beta_tool` 데코레이터

```python
from anthropic import Anthropic, beta_tool

client = Anthropic()

@beta_tool
def get_weather(location: str, unit: str = "fahrenheit") -> str:
    """Get the current weather in a given location.

    Args:
        location: The city and state, e.g. San Francisco, CA
        unit: Temperature unit, either 'celsius' or 'fahrenheit'
    """
    return json.dumps({"temperature": "20°C", "condition": "Sunny"})

# 실행
runner = client.beta.messages.tool_runner(
    model="claude-opus-4-6",
    max_tokens=1024,
    tools=[get_weather],
    messages=[{"role": "user", "content": "What's the weather in Paris?"}],
)

# 최종 메시지만 필요할 때
final_message = runner.until_done()
```

> `@beta_tool`: 타입힌트 + docstring → JSON Schema 자동 생성. 비동기: `@beta_async_tool` + `async def`

### TypeScript: `betaZodTool` (권장) 또는 `betaTool`

```typescript
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

const getWeatherTool = betaZodTool({
  name: "get_weather",
  description: "Get the current weather",
  inputSchema: z.object({ location: z.string() }),
  run: async (input) => JSON.stringify({ temperature: "20°C" })
});

const finalMessage = await client.beta.messages.toolRunner({
  model: "claude-opus-4-6",
  max_tokens: 1024,
  tools: [getWeatherTool],
  messages: [{ role: "user", content: "What's the weather in Paris?" }]
});
```

> Zod 3.25.0 이상 필요. `betaTool` (JSON Schema 기반)은 런타임 검증 없음.

---

## 2. 루프 패턴

```python
# 중간 메시지 처리
for message in runner:
    print(message.content)

# 최종 메시지만
final = runner.until_done()
```

루프 종료: Claude가 tool_use 없는 메시지 반환 시. `break`로 조기 종료 가능.

---

## 3. 고급: 툴 결과 수정 (캐시 적용 예)

```python
for message in runner:
    tool_response = runner.generate_tool_call_response()
    
    if tool_response is not None:
        for block in tool_response["content"]:
            if block["type"] == "tool_result":
                block["cache_control"] = {"type": "ephemeral"}  # 캐시 적용
        
        runner.append_messages(message, tool_response)
```

---

## 4. 에러 처리

- 툴 예외 → `is_error: true`로 Claude에 자동 전달 (스택 트레이스 제외)
- 디버그: `ANTHROPIC_LOG=debug` 환경변수로 전체 스택 트레이스 출력

```python
for message in runner:
    tool_response = runner.generate_tool_call_response()
    if tool_response:
        for block in tool_response["content"]:
            if block.get("is_error"):
                raise RuntimeError(f"Tool failed: {block['content']}")  # 즉시 중단
                # 또는 로깅 후 계속 (Claude가 처리)
```

---

## 5. 스트리밍

```python
runner = client.beta.messages.tool_runner(..., stream=True)

for message_stream in runner:
    for event in message_stream:
        print(event)
    print(message_stream.get_final_message())
```

---

## 6. 컨텍스트 자동 압축

Tool Runner는 토큰 사용량이 임계값 초과 시 자동 compaction 지원. 장시간 실행 에이전틱 태스크가 컨텍스트 윈도우 한계를 넘어 계속 실행 가능.

---

> [insight] Tool Runner의 `@beta_tool` 데코레이터 + docstring 스키마 자동 생성은 하네스 플러그인 시스템의 핵심 패턴으로 채택할 수 있다. 플러그인 개발자가 Python 함수만 작성하면 스키마 정의 없이 자동으로 툴이 등록되므로, 플러그인 개발 진입장벽을 크게 낮출 수 있다.

> [insight] `generate_tool_call_response()` + `cache_control` 패가는 Tool Runner에서 RAG 파이프라인 효율을 높이는 핵심 패턴이다. 검색 결과를 툴로 반환할 때 자동으로 캐시를 적용하면, 동일한 문서를 여러 번 참조하는 멀티스텝 에이전트에서 비용을 크게 절감할 수 있다.

> [insight] 자동 compaction 기능은 하네스의 장시간 에이전트(코드 리뷰, 대용량 문서 분석)를 컨텍스트 제한 없이 실행할 수 있게 한다. 단, compaction이 발생할 때 대화 맥락이 요약되므로 정밀한 디테일이 필요한 에이전트는 compaction 임계값 설정을 신중히 조정해야 한다.

> [insight] Tool Runner는 에러를 Claude에 자동으로 전달하고 Claude가 스스로 재시도·우회 전략을 선택하도록 한다. 하네스에서 모든 툴 에러를 즉시 실패로 처리하는 대신, `is_error: true` 패턴으로 Claude에 위임하는 접근이 더 강인한 에이전트를 만든다. 단, 특정 에러(인증 실패, 중요 서비스 다운)는 `generate_tool_call_response()`로 인터셉트해 즉시 중단하는 이중 전략이 필요하다.
