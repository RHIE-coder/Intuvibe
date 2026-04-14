# Streaming Messages

---

`"stream": true` 설정 시 SSE(Server-Sent Events)로 응답을 점진적으로 수신. 대용량 `max_tokens` 요청에서 HTTP 타임아웃을 피하려면 스트리밍 필수.

---

## 1. SDK 기본 사용

```python
# Python — 텍스트만 스트림
with client.messages.stream(
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}],
    model="claude-opus-4-6",
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

```python
# 스트리밍으로 받되 최종 Message 객체만 필요할 때
with client.messages.stream(...) as stream:
    message = stream.get_final_message()
```

> 대용량 응답(128k+ 토큰)은 `stream.get_final_message()` / `.finalMessage()` 사용 권장 (HTTP 타임아웃 방지)

---

## 2. SSE 이벤트 흐름

```
message_start
  content_block_start (index: N)
    content_block_delta × 여러 번
  content_block_stop (index: N)
  ... (다른 content block 반복)
message_delta          ← stop_reason, usage (누적값)
message_stop
```

> `message_delta`의 `usage.output_tokens`는 **누적값**.

ping 이벤트가 중간중간 삽입될 수 있음. 새 이벤트 타입은 graceful하게 처리 필요.

---

## 3. Content Block Delta 타입

| Delta 타입 | 대상 | 설명 |
|-----------|------|------|
| `text_delta` | `text` block | 텍스트 조각 |
| `input_json_delta` | `tool_use` block | 툴 input의 partial JSON 문자열 (`content_block_stop`까지 누적 후 파싱) |
| `thinking_delta` | `thinking` block | Extended thinking 내용 |
| `signature_delta` | `thinking` block | `content_block_stop` 직전 발송. thinking 무결성 검증용 |
| `citations_delta` | `text` block | 단일 citation 추가 |

```sse
# text_delta
{"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "ello frien"}}

# input_json_delta (partial JSON)
{"type": "content_block_delta", "index": 1, "delta": {"type": "input_json_delta", "partial_json": "{\"location\": \"San Fra"}}

# thinking_delta
{"type": "content_block_delta", "index": 0, "delta": {"type": "thinking_delta", "thinking": "..."}}

# signature_delta
{"type": "content_block_delta", "index": 0, "delta": {"type": "signature_delta", "signature": "EqQB..."}}
```

> `display: "omitted"` 설정 시 `thinking_delta` 없이 `signature_delta`만 전송됨.

---

## 4. 에러 이벤트

```sse
event: error
data: {"type": "error", "error": {"type": "overloaded_error", "message": "Overloaded"}}
```

---

## 5. 툴 사용 + 스트리밍

- `input_json_delta`로 partial JSON 전달 → `content_block_stop`에서 누적 후 파싱
- 현재 모델은 input 키-값 쌍 단위로 emit (키+값 완성 전까지 딜레이 가능)
- Fine-grained streaming: 툴별 `eager_input_streaming` 설정으로 파라미터 값 세밀 스트리밍 가능 (`05-tools/06-parallel-tool-use.md` 참조)

---

## 6. 직접 HTTP 구현 시

```bash
curl https://api.anthropic.com/v1/messages \
     --header "anthropic-version: 2023-06-01" \
     --header "content-type: application/json" \
     --header "x-api-key: $ANTHROPIC_API_KEY" \
     --data '{"model": "claude-opus-4-6", "messages": [...], "max_tokens": 256, "stream": true}'
```

---

> [insight] 에이전틱 워크플로우에서 스트리밍은 UX만의 문제가 아니다. `max_tokens`가 큰 요청(코드 생성, 긴 분석)은 SDK가 스트리밍을 HTTP 타임아웃 방지 수단으로 내부 사용하므로, 하네스의 에이전트 호출 레이어는 기본적으로 스트리밍 기반으로 설계하는 것이 안전하다.

> [insight] `input_json_delta`는 partial JSON 문자열이라 `content_block_stop` 전까지 파싱 불가. 툴 호출 스트리밍을 처리하는 에이전트는 block 단위로 누적 → stop 시 파싱하는 상태 머신 패턴이 필요하다. SDK를 쓰면 이 처리가 내부에서 자동화된다.

> [insight] `message_delta`의 `usage.output_tokens`가 누적값이라는 점은 실시간 비용 모니터링 시 주의 필요. 스트리밍 도중 토큰 수를 추적할 때는 최신 `message_delta` 값을 그대로 사용하면 된다 (합산 불필요).

> [insight] `display: "omitted"` + 스트리밍 조합은 thinking 내용을 사용자에게 노출하지 않으면서 텍스트 응답의 TTFT를 개선하는 패턴이다. 하네스의 백엔드 추론 에이전트(사용자에게 thinking 불노출)에서 레이턴시 최적화가 필요할 때 활용 가능.
