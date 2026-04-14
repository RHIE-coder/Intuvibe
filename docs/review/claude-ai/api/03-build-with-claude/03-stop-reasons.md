# Handling Stop Reasons — 응답 중지 이유 처리

---

`stop_reason`은 Claude가 응답 생성을 **성공적으로 완료한 이유**를 나타냄. 에러와 다름.

---

## 1. stop_reason 값 전체

| stop_reason | 의미 | 처리 |
|-------------|------|------|
| `end_turn` | 자연스러운 응답 완료 | 정상 처리 |
| `max_tokens` | `max_tokens` 한도 도달 | 잘림. 이어서 요청 또는 한도 증가 |
| `stop_sequence` | 커스텀 stop sequence 만남 | `stop_sequence` 필드에 매칭 시퀀스 |
| `tool_use` | 도구 호출 요청 | 도구 실행 → 결과 반환 → 루프 |
| `pause_turn` | 서버 도구 실행 루프 반복 한도 도달 (기본 10) | 응답 그대로 재전송하여 계속 |
| `refusal` | 안전 문제로 거부 | 요청 수정 검토 |
| `model_context_window_exceeded` | 모델 컨텍스트 윈도우 한계 도달 | 유효하지만 잘린 응답 |

---

## 2. 주요 패턴

### end_turn + 빈 응답 문제

Claude가 빈 응답(2-3 토큰, content 없음) + `end_turn`을 반환하는 경우:

**원인**:
- tool_result 직후에 텍스트 블록 추가 → Claude가 턴 완료로 학습
- 빈 응답을 그대로 재전송 → 이미 완료 결정됨

**해결**:
```python
# 잘못된 패턴: tool_result 뒤에 텍스트 추가
{"type": "tool_result", ...},
{"type": "text", "text": "Here's the result"}  # ← 이거 하지 마라

# 올바른 패턴: tool_result만 전송
{"type": "tool_result", "tool_use_id": "toolu_123", "content": "6912"}

# 그래도 빈 응답이면: 새 user 메시지로 이어가기
messages.append({"role": "user", "content": "Please continue"})
```

### max_tokens + 불완전 tool_use

`max_tokens`로 잘린 응답에 불완전한 tool_use 블록이 있으면 → **더 높은 max_tokens로 재요청**.

### pause_turn 연속 처리

```python
for _ in range(max_continuations):
    response = client.messages.create(...)
    if response.stop_reason != "pause_turn":
        return response
    # 응답을 그대로 assistant 메시지로 추가하여 계속
    messages = [
        {"role": "user", "content": user_query},
        {"role": "assistant", "content": response.content},
    ]
```

### model_context_window_exceeded

입력 크기를 모를 때 최대 토큰 요청:
```python
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=64000,  # 비스트리밍 실용 한도 (스트리밍 시 128K)
    messages=[...],
)
# stop_reason으로 어떤 한도에 도달했는지 판단
```

Sonnet 4.5+ 기본 지원. 이전 모델: `model-context-window-exceeded-2025-08-26` 베타 헤더.

---

## 3. 에이전틱 루프 핵심 패턴

```python
def complete_tool_workflow(client, user_query, tools):
    messages = [{"role": "user", "content": user_query}]
    while True:
        response = client.messages.create(
            model="claude-opus-4-6", messages=messages, tools=tools
        )
        if response.stop_reason == "tool_use":
            tool_results = execute_tools(response.content)
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})
        else:
            return response  # end_turn, max_tokens 등
```

---

## 4. Stop Reason vs Error

| | Stop Reason | Error |
|---|------------|-------|
| **위치** | 응답 body의 `stop_reason` 필드 | HTTP 4xx/5xx 상태 코드 |
| **의미** | 생성이 정상 중지된 이유 | 요청 처리 실패 |
| **콘텐츠** | 유효한 응답 포함 | 에러 상세 |

---

## 5. 스트리밍에서의 stop_reason

- `message_start`: `null`
- `message_delta`: **여기서 제공**
- 다른 이벤트: 없음

```python
with client.messages.stream(...) as stream:
    for event in stream:
        if event.type == "message_delta":
            stop_reason = event.delta.stop_reason
```

> [insight] `stop_reason`은 에이전틱 루프의 **분기 조건**이다. `tool_use` → 도구 실행 루프, `pause_turn` → 서버 도구 계속, `end_turn` → 완료, `max_tokens` → 잘림 처리. 하네스의 메인 루프는 이 7가지 stop_reason에 대한 분기 처리가 핵심 구조.

> [insight] `pause_turn`은 서버 사이드 도구(web search/fetch) 전용이다. 서버가 10회 반복 한도에 도달하면 발생. 응답을 그대로 assistant 메시지로 돌려보내면 계속 진행. 하네스에서 서버 도구를 사용할 때 이 stop_reason을 처리하지 않으면 불완전 응답으로 끝남.

> [insight] tool_result 직후에 텍스트를 추가하면 빈 응답이 발생할 수 있다. 이것은 **하네스 에이전틱 루프에서 흔한 버그**. tool_result만 단독으로 전송하는 것이 올바른 패턴.

> [insight] `model_context_window_exceeded`는 입력 토큰 수를 모를 때 "최대한 많이 생성해달라"는 패턴을 가능하게 한다. `max_tokens`를 크게 설정하고 이 stop_reason으로 실제 한도 도달을 감지. 하네스에서 가변 길이 입력의 최대 출력을 얻는 안전한 방법.
