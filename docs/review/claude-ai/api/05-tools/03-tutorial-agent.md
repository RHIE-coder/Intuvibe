# Tutorial: Tool-Using Agent (5 Rings)

---

단일 툴 호출부터 프로덕션 에이전틱 루프까지 단계적으로 구현하는 튜토리얼. 예제 툴: `create_calendar_event` (중첩 객체·배열·선택 필드 포함 현실적 스키마).

---

## Ring 1: 단일 툴, 단일 턴

```python
# 1. tools 파라미터로 툴 정의 전달
response = client.messages.create(model=..., tools=tools, messages=[user_msg])

# 2. tool_use block 찾기 (content 배열 순서 가정 금지)
tool_use = next(b for b in response.content if b.type == "tool_use")

# 3. 툴 실행 후 tool_result로 반환 (tool_use_id 매칭 필수)
followup = client.messages.create(..., messages=[
    user_msg,
    {"role": "assistant", "content": response.content},
    {"role": "user", "content": [{"type": "tool_result", "tool_use_id": tool_use.id, "content": json.dumps(result)}]}
])
```

흐름: `stop_reason: tool_use` → 실행 → `stop_reason: end_turn` + 자연어 응답

---

## Ring 2: 에이전틱 루프

```python
messages = [{"role": "user", "content": "..."}]
response = client.messages.create(...)

while response.stop_reason == "tool_use":
    tool_use = next(b for b in response.content if b.type == "tool_use")
    result = run_tool(tool_use.name, tool_use.input)
    
    messages.append({"role": "assistant", "content": response.content})
    messages.append({"role": "user", "content": [{"type": "tool_result", "tool_use_id": tool_use.id, "content": json.dumps(result)}]})
    
    response = client.messages.create(..., messages=messages)
```

핵심: 대화 히스토리를 누적 리스트로 유지.

---

## Ring 3: 멀티 툴 + 병렬 호출

```python
while response.stop_reason == "tool_use":
    tool_results = []
    for block in response.content:
        if block.type == "tool_use":
            result = run_tool(block.name, block.input)
            tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": json.dumps(result)})
    
    # 모든 tool_result를 하나의 user 메시지로 일괄 반환
    messages.append({"role": "assistant", "content": response.content})
    messages.append({"role": "user", "content": tool_results})
```

병렬 tool_use block → **전체를 한 번의 user 메시지로 반환**.

---

## Ring 4: 에러 처리

```python
try:
    result = run_tool(block.name, block.input)
    tool_results.append({"type": "tool_result", "tool_use_id": block.id, "content": json.dumps(result)})
except Exception as exc:
    tool_results.append({
        "type": "tool_result",
        "tool_use_id": block.id,
        "content": str(exc),
        "is_error": True,   # Claude가 에러 인식 후 재시도 또는 사용자에게 설명
    })
```

`is_error: true` → Claude가 에러 내용을 읽고 재시도·우회·안내 중 선택.

---

## Ring 5: Tool Runner SDK 추상화

```python
from anthropic import beta_tool

@beta_tool
def create_calendar_event(title: str, start: str, end: str, ...) -> str:
    """Create a calendar event... (docstring → 툴 설명으로 자동 변환)"""
    ...

final_message = client.beta.messages.tool_runner(
    model=..., tools=[create_calendar_event, list_calendar_events], messages=[...]
).until_done()
```

루프·에러 랩핑·결과 포맷팅 자동화. Python: `@beta_tool` 데코레이터 + 타입힌트·docstring으로 스키마 자동 생성. TypeScript: `betaZodTool` + Zod 스키마.

> Tool Runner는 Python, TypeScript, Ruby SDK에서만 사용 가능. curl 기반은 Ring 4 루프 유지.

---

> [insight] Ring별 증분 학습 구조(단일 호출 → 루프 → 병렬 → 에러처리 → SDK 추상화)는 하네스의 에이전트 실행 엔진 설계 청사진으로 직접 활용 가능하다. 초기 구현은 Ring 2~4 패턴으로 직접 루프를 작성하고, 안정화 후 Tool Runner로 대체하는 단계적 전략이 적합하다.

> [insight] 병렬 tool_use block을 **하나의 user 메시지**로 일괄 반환해야 한다는 점(Ring 3)이 중요하다. 각 block을 별도 메시지로 나눠 보내면 대화 구조가 깨진다. 하네스의 툴 실행 레이어는 한 턴의 모든 tool_use를 모아 단일 tool_result 배열을 구성해야 한다.

> [insight] `is_error: true` 플래그(Ring 4)는 단순 에러 전달 이상의 의미를 가진다. Claude가 에러 내용을 이해하고 스스로 재시도하거나 우회 전략을 취할 수 있다. 하네스에서 툴 실패 시 즉시 예외를 던지는 대신 `is_error` 패턴으로 Claude에게 에러를 위임하는 것이 더 강인한 에이전트 설계다.

> [insight] Tool Runner의 `@beta_tool` 데코레이터는 타입힌트와 docstring에서 JSON Schema를 자동 생성한다. 하네스 플러그인 시스템에서 Python 함수를 툴로 등록할 때 별도 스키마 작성 없이 이 패턴을 활용하면 플러그인 개발 비용이 크게 줄어든다.
