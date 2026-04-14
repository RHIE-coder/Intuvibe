# Fine-Grained Tool Streaming

---

툴 입력 파라미터를 버퍼링·JSON 검증 없이 문자 단위로 스트리밍. 대용량 파라미터 수신 레이턴시 감소.

- `eager_input_streaming: true` 설정 (사용자 정의 툴 전용)
- ZDR: ✅ 지원
- 전 모델·전 플랫폼 GA (Claude API, Bedrock, Vertex AI, Foundry)

---

## 1. 설정

```json
{
  "name": "make_file",
  "description": "Write text to a file",
  "eager_input_streaming": true,
  "input_schema": {
    "type": "object",
    "properties": {
      "filename": {"type": "string"},
      "lines_of_text": {"type": "array"}
    },
    "required": ["filename", "lines_of_text"]
  }
}
```

스트리밍 요청 (`"stream": true`)과 함께 사용.

---

## 2. 레이턴시 비교

| | 일반 스트리밍 | fine-grained |
|-|-------------|-------------|
| 첫 청크 수신 | 15초 지연 | 3초 지연 |
| 청크 특성 | 짧고 자주 | 길고 단어 단절 없음 |
| JSON 검증 | 있음 | 없음 |

---

## 3. 입력 델타 누적 패턴

```python
tool_inputs = {}  # index → accumulated JSON string

# 1. content_block_start (type: "tool_use") → 빈 문자열 초기화
if event.type == "content_block_start" and event.content_block.type == "tool_use":
    tool_inputs[event.index] = ""

# 2. content_block_delta (type: "input_json_delta") → partial_json 누적
elif event.type == "content_block_delta" and event.delta.type == "input_json_delta":
    tool_inputs[event.index] += event.delta.partial_json

# 3. content_block_stop → json.loads() 파싱
elif event.type == "content_block_stop" and event.index in tool_inputs:
    parsed = json.loads(tool_inputs[event.index])
```

**주의**: `content_block_start`의 `input: {}`는 빈 객체(placeholder). 실제 값은 델타 문자열에서 누적.

SDK 헬퍼(`stream.get_final_message()`, `stream.finalMessage()`)가 이 누적을 자동 처리. 부분 입력에 즉각 반응해야 할 때만 수동 패턴 사용.

---

## 4. 주의사항

**불완전 JSON 가능성**:
- `stop_reason: "max_tokens"` 시 파라미터 중간에 스트림 종료 가능
- 수신된 JSON이 유효하지 않을 수 있음

**에러 응답 처리**:
유효하지 않은 JSON을 모델에 반환할 때:
```json
{"INVALID_JSON": "<원래 잘못된 JSON 문자열>"}
```
특수문자 이스케이프 필수.

---

> [insight] `eager_input_streaming`은 하네스에서 대용량 파라미터를 생성하는 툴(파일 작성, 긴 쿼리 생성, 대형 JSON 구조 생성)에 적용하면 사용자 체감 레이턴시를 15초→3초 수준으로 줄일 수 있다. 특히 코드 생성 플러그인이나 문서 생성 툴에 핵심이다.

> [insight] `max_tokens` 도달 시 불완전 JSON 처리는 하네스의 에러 핸들링 체크리스트에 포함되어야 한다. `stop_reason == "max_tokens"` + `eager_input_streaming` 조합을 감지하면 JSON 파싱 실패를 graceful하게 처리하고, `{"INVALID_JSON": "..."}` 래퍼로 모델에 피드백하는 로직이 필요하다.

> [insight] Anthropic 스키마 툴(bash, text_editor 등)은 `eager_input_streaming` 미지원 (사용자 정의 툴 전용). 하네스에서 자체 정의 파일 생성·코드 실행 툴에만 적용 가능하며, Anthropic 제공 툴과 혼합 사용 시 각 툴의 스트리밍 동작이 다름을 인지해야 한다.
