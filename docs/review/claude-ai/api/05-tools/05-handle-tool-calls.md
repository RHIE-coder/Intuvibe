# Handle Tool Calls

---

`tool_use` block 파싱, `tool_result` 포맷, 에러 처리(`is_error`) 레퍼런스.

---

## 1. tool_use block 구조

```json
{
  "stop_reason": "tool_use",
  "content": [
    {"type": "text", "text": "I'll check the weather..."},
    {
      "type": "tool_use",
      "id": "toolu_01A09q90qw90lq917835lq9",
      "name": "get_weather",
      "input": {"location": "San Francisco, CA", "unit": "celsius"}
    }
  ]
}
```

추출: `id` (결과 매칭용), `name` (실행할 툴), `input` (툴 인자)

---

## 2. tool_result 포맷

### 기본 (문자열)
```json
{
  "role": "user",
  "content": [
    {"type": "tool_result", "tool_use_id": "toolu_01A09...", "content": "15 degrees"}
  ]
}
```

### 이미지 포함
```json
{
  "type": "tool_result",
  "tool_use_id": "...",
  "content": [
    {"type": "text", "text": "15 degrees"},
    {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": "..."}}
  ]
}
```

### 빈 결과 (부수효과만 있는 툴)
```json
{"type": "tool_result", "tool_use_id": "..."}
```

content 타입: `text`, `image`, `document` 지원

---

## 3. 포맷 규칙 (위반 시 400 에러)

1. **tool_result는 대응하는 tool_use 직후** 메시지에 위치해야 함
2. **tool_result는 content 배열의 맨 앞**에 위치 (텍스트는 뒤에)

```json
// ❌ 잘못된 순서
{"role": "user", "content": [
  {"type": "text", "text": "Here are the results:"},   // text가 먼저
  {"type": "tool_result", ...}
]}

// ✅ 올바른 순서
{"role": "user", "content": [
  {"type": "tool_result", ...},                         // tool_result 먼저
  {"type": "text", "text": "What should I do next?"}
]}
```

---

## 4. 에러 처리

### 툴 실행 에러 (네트워크, 서비스 오류 등)
```json
{
  "type": "tool_result",
  "tool_use_id": "...",
  "content": "ConnectionError: the weather service API is not available (HTTP 500)",
  "is_error": true
}
```
→ Claude가 에러 내용을 보고 사용자에게 안내하거나 재시도.

> 에러 메시지는 구체적으로: `"failed"` 대신 `"Rate limit exceeded. Retry after 60 seconds."` → Claude가 맥락 파악 후 스스로 복구 가능.

### 잘못된 파라미터 (누락·타입 오류)
```json
{
  "type": "tool_result",
  "tool_use_id": "...",
  "content": "Error: Missing required 'location' parameter",
  "is_error": true
}
```
→ Claude가 수정된 파라미터로 2-3회 재시도 후 실패 시 사용자에게 설명.

> `strict: true` 사용 시 스키마 불일치 자체를 사전 차단 가능.

### 서버 툴 에러
개발자 처리 불필요. Claude가 내부적으로 처리. Web Search 에러 코드: `too_many_requests`, `invalid_input`, `max_uses_exceeded`, `query_too_long`, `unavailable`

---

## 5. 클라이언트 툴 vs 서버 툴 차이

Claude API는 다른 API와 달리 `tool`/`function` 전용 role 없음.
- `user` 메시지: 클라이언트 콘텐츠 + `tool_result`
- `assistant` 메시지: AI 생성 콘텐츠 + `tool_use`

---

> [insight] tool_result 배열에서 **text가 tool_result 뒤에** 와야 한다는 포맷 규칙은 하네스의 툴 결과 조합 레이어 구현 시 주의해야 한다. 여러 tool_result + 추가 텍스트를 조합할 때 순서를 명시적으로 보장하는 헬퍼가 필요하다.

> [insight] 에러 메시지 품질이 에이전트 자가 복구 능력에 직접 영향을 준다. 하네스의 툴 실행 레이어는 단순히 예외 메시지를 `is_error: true`로 전달하는 것을 넘어, Claude가 맥락을 이해하고 재시도·우회 전략을 선택할 수 있도록 충분한 정보(무엇이 실패했고, 어떻게 해야 하는지)를 포함한 에러 포맷 표준을 정의해야 한다.

> [insight] `is_error: true` + 구체적 에러 메시지 패턴은 하네스에서 **자가 치유 에이전트(self-healing agent)**를 구현하는 핵심 메커니즘이다. 툴 실패를 즉시 에이전트 실패로 전파하지 않고 Claude에게 위임하면, 단순 재시도·파라미터 수정·우회 경로 탐색을 Claude가 자율적으로 처리할 수 있다.

> [insight] 서버 툴 에러 코드(web_search: `too_many_requests`, `max_uses_exceeded` 등)는 하네스의 서버 툴 통합 레이어에서 rate limiting과 사용량 제한 처리를 위해 알아두어야 한다. 이 에러들은 Claude가 처리하지만, 로깅·모니터링 레이어에서는 `server_tool_use` block을 파싱해 에러 패턴을 추적해야 한다.
