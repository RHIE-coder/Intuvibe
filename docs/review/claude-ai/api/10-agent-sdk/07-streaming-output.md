# Streaming Output

---

`include_partial_messages=True` / `includePartialMessages: true` 활성화 시 `StreamEvent` 메시지로 실시간 토큰 수신.

---

## 1. 활성화

```python
options = ClaudeAgentOptions(include_partial_messages=True)
```

---

## 2. 메시지 흐름

```
StreamEvent (message_start)
StreamEvent (content_block_start) — 텍스트 블록
StreamEvent (content_block_delta) — 텍스트 청크들...
StreamEvent (content_block_stop)
StreamEvent (content_block_start) — tool_use 블록
StreamEvent (content_block_delta) — tool input 청크들...
StreamEvent (content_block_stop)
StreamEvent (message_stop)
AssistantMessage — 완성된 메시지
... 툴 실행 ...
ResultMessage — 최종 결과
```

---

## 3. 텍스트 스트리밍

```python
if isinstance(message, StreamEvent):
    event = message.event
    if event.get("type") == "content_block_delta":
        delta = event.get("delta", {})
        if delta.get("type") == "text_delta":
            print(delta.get("text", ""), end="", flush=True)
```

---

## 4. 툴 호출 스트리밍

```python
if event_type == "content_block_start":
    if content_block.get("type") == "tool_use":
        current_tool = content_block.get("name")

elif event_type == "content_block_delta":
    if delta.get("type") == "input_json_delta":
        tool_input += delta.get("partial_json", "")

elif event_type == "content_block_stop":
    # 툴 호출 완료
```

---

## 5. 주요 이벤트 타입

| 이벤트 | 내용 |
|--------|------|
| `message_start` | 새 메시지 시작 |
| `content_block_start` | 텍스트/툴 블록 시작 (`type`: `text` or `tool_use`) |
| `content_block_delta` | 증분 업데이트 (`text_delta` or `input_json_delta`) |
| `content_block_stop` | 블록 완료 |
| `message_stop` | 메시지 완료 |

---

## 6. 제한사항

- **Extended thinking** (`max_thinking_tokens` 설정 시): `StreamEvent` 미방출, 완성 메시지만 수신
- **Structured output**: 스트리밍 델타 없음, 최종 `ResultMessage.structured_output`에만 포함

---

> [insight] `in_tool` 플래그로 툴 실행 중 텍스트 스트리밍을 구분하는 패턴은 하네스의 실시간 UI 구현에서 핵심이다. 사용자에게 "분석 중..." 같은 진행 상황을 보여줄 때, 툴 호출 중에는 툴 이름(`[Using Bash...]`)을 표시하고 텍스트 생성 중에는 실시간 타이핑 효과를 주는 이중 상태 패턴으로 에이전트의 내부 동작을 직관적으로 시각화할 수 있다.
