# Quickstart — 첫 API 호출

---

## 1. 사전 요건

- Anthropic Console 계정
- API 키

API 키 설정:
```bash
export ANTHROPIC_API_KEY='your-api-key-here'
```

---

## 2. SDK별 호출

### cURL (직접 호출)

```bash
curl https://api.anthropic.com/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-opus-4-6",
    "max_tokens": 1000,
    "messages": [{ "role": "user", "content": "..." }]
  }'
```

필수 헤더: `x-api-key`, `anthropic-version: 2023-06-01`, `Content-Type: application/json`

### Python

```bash
pip install anthropic
```

```python
import anthropic

client = anthropic.Anthropic()
message = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1000,
    messages=[{ "role": "user", "content": "..." }],
)
```

### TypeScript

```bash
npm install @anthropic-ai/sdk
```

```typescript
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();
const msg = await anthropic.messages.create({
  model: "claude-opus-4-6",
  max_tokens: 1000,
  messages: [{ role: "user", content: "..." }],
});
```

실행: `npx tsx quickstart.ts`

### Java

```groovy
// Gradle
implementation("com.anthropic:anthropic-java:2.18.0")
```

```java
AnthropicClient client = AnthropicOkHttpClient.fromEnv();
MessageCreateParams params = MessageCreateParams.builder()
    .model("claude-opus-4-6")
    .maxTokens(1000)
    .addUserMessage("...")
    .build();
Message message = client.messages().create(params);
```

---

## 3. 응답 구조

```json
{
  "id": "msg_01HCDu5LRGeP2o7s2xGmxyx8",
  "type": "message",
  "role": "assistant",
  "content": [{ "type": "text", "text": "..." }],
  "model": "claude-opus-4-6",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 21,
    "output_tokens": 305
  }
}
```

| 필드 | 설명 |
|------|------|
| `id` | 메시지 고유 ID |
| `type` | 항상 `"message"` |
| `role` | 항상 `"assistant"` |
| `content` | 응답 콘텐츠 배열 (`text` 블록) |
| `model` | 사용된 모델 |
| `stop_reason` | 중지 이유 (`end_turn` 등) |
| `usage` | 입력/출력 토큰 수 |

---

## 4. 다음 단계

1. **Messages API** → 멀티턴, 시스템 프롬프트, stop reason 패턴
2. **Models overview** → 모델별 능력/비용 비교
3. **Features overview** → 도구, 컨텍스트 관리, structured outputs 등
4. **Client SDKs** → Python, TypeScript, Java 등 레퍼런스

> [insight] API 엔드포인트는 `https://api.anthropic.com/v1/messages`이고 버전 헤더 `anthropic-version: 2023-06-01`이 필수다. SDK 사용 시 환경변수 `ANTHROPIC_API_KEY`를 자동 인식하므로 명시적 전달 불필요. 하네스에서 직접 API를 호출할 때 이 3가지 헤더 세트가 최소 요구사항.

> [insight] 응답의 `content`가 배열이라는 점이 중요하다. 단일 텍스트가 아닌 `[{ "type": "text", "text": "..." }]` 형태. tool use 시 `tool_use` 블록이 추가되고, thinking 활성화 시 `thinking` 블록이 추가된다. 하네스에서 응답 파싱 시 배열 구조를 전제해야 한다.
