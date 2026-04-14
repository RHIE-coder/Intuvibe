# Streaming Refusals

---

Claude 4 모델부터: 스트리밍 중 정책 위반 감지 시 **`stop_reason: "refusal"`** 반환.

---

## 1. API 응답 형식

```json
{
  "role": "assistant",
  "content": [{ "type": "text", "text": "Hello.." }],
  "stop_reason": "refusal"
}
```

**주의**: 추가 거부 메시지 없음 → 앱에서 직접 사용자 대면 메시지 처리 필요.  
**과금**: 거부 시점까지의 출력 토큰은 청구됨.

---

## 2. 거부 후 컨텍스트 리셋 필수

`stop_reason: "refusal"` 수신 시 → **거부된 턴을 제거/업데이트** 후 계속.  
리셋 없이 계속하면 계속 거부됨.

---

## 3. 구현 패턴

### Python
```python
with client.messages.stream(
    max_tokens=1024,
    messages=messages + [{"role": "user", "content": "Hello"}],
    model="claude-sonnet-4-6",
) as stream:
    for event in stream:
        if hasattr(event, "type") and event.type == "message_delta":
            if event.delta.stop_reason == "refusal":
                messages = []  # 컨텍스트 리셋
                break
```

### TypeScript
```typescript
for await (const event of stream) {
    if (event.type === "message_delta" && event.delta.stop_reason === "refusal") {
        messages = [];  // 컨텍스트 리셋
        break;
    }
}
```

---

## 4. 거부 유형 비교

| 거부 유형 | 응답 형식 | 발생 시점 |
|----------|----------|---------|
| 스트리밍 분류기 거부 | `stop_reason: "refusal"` | 스트리밍 중 정책 위반 감지 |
| API 입력/저작권 검증 실패 | HTTP 400 에러 | 입력 유효성 검사 실패 |
| 모델 자체 거부 | 일반 텍스트 응답 | 모델이 직접 거부 결정 |

> 향후 API 버전에서 모든 거부 유형을 `stop_reason: "refusal"`로 통일 예정.

---

## 5. 베스트 프랙티스

- `stop_reason: "refusal"` 체크를 모든 에러 핸들링에 포함
- 거부 감지 시 컨텍스트 자동 리셋 구현
- 사용자 친화적 커스텀 메시지 제공
- 거부 패턴 모니터링 → 프롬프트 문제 조기 발견

---

> [insight] 하네스의 스트리밍 플러그인 실행 레이어에서 `stop_reason: "refusal"` 처리는 필수 에러 핸들링이다. 특히 멀티턴 플러그인에서 거부 발생 시 대화 컨텍스트를 자동으로 정리하고 사용자에게 적절한 안내 메시지를 보내는 로직을 하네스 SDK에 내장해야 한다. 거부 빈도 모니터링 데이터는 플러그인 품질 지표로도 활용 가능하다.
