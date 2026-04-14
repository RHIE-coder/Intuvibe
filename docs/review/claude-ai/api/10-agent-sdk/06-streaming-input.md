# Streaming Input vs Single Message Input

---

Agent SDK의 두 가지 입력 모드.

---

## 1. 비교

| 항목 | Streaming Input (권장) | Single Message Input |
|------|----------------------|---------------------|
| 이미지 첨부 | ✅ | ❌ |
| 메시지 큐잉 | ✅ | ❌ |
| 실시간 인터럽트 | ✅ | ❌ |
| 멀티턴 자연스러운 흐름 | ✅ | ❌ |
| 구현 복잡도 | 중간 | 낮음 |
| 적합한 환경 | 장기 실행 프로세스 | Lambda, stateless |

---

## 2. Streaming Input 패턴

```typescript
// 비동기 제너레이터로 메시지 스트림 생성
async function* generateMessages() {
  yield {
    type: "user" as const,
    message: { role: "user" as const, content: "코드베이스 보안 분석해줘" }
  };

  await new Promise(resolve => setTimeout(resolve, 2000));

  yield {
    type: "user" as const,
    message: {
      role: "user" as const,
      content: [
        { type: "text", text: "이 아키텍처 다이어그램도 리뷰해줘" },
        { type: "image", source: { type: "base64", media_type: "image/png", data: "..." } }
      ]
    }
  };
}

for await (const message of query({
  prompt: generateMessages(),
  options: { maxTurns: 10, allowedTools: ["Read", "Grep"] }
})) { ... }
```

Python: `ClaudeSDKClient` + `await client.query(message_generator())`

---

## 3. Single Message 패턴

```python
# 단순 단발 쿼리
async for message in query(
    prompt="인증 플로우 설명해줘",
    options=ClaudeAgentOptions(max_turns=1, allowed_tools=["Read"]),
):
    if isinstance(message, ResultMessage):
        print(message.result)

# 세션 이어받기
async for message in query(
    prompt="이제 인가 프로세스 설명해줘",
    options=ClaudeAgentOptions(continue_conversation=True, max_turns=1),
):
    ...
```

---

> [insight] Streaming Input의 이미지 첨부 지원은 하네스에서 시각적 컨텍스트가 필요한 에이전트(다이어그램 분석, UI 스크린샷 기반 작업)를 구현하는 방법이다. Single Message 모드에서는 이미지를 직접 첨부할 수 없으므로, 이미지가 포함된 인터랙티브 에이전트는 반드시 Streaming Input + ClaudeSDKClient(Python) 또는 비동기 제너레이터(TS) 패턴으로 구현해야 한다.
