# TypeScript SDK V2 Interface (Preview)

---

**unstable preview** — API 변경 가능. V1의 async generator 패턴을 `send()` + `stream()` 분리 패턴으로 단순화.

---

## 1. 핵심 개념 (3가지)

| 개념 | 설명 |
|------|------|
| `unstable_v2_createSession()` | 새 세션 시작 |
| `unstable_v2_resumeSession(sessionId, options)` | 기존 세션 재개 |
| `session.send()` / `session.stream()` | 메시지 전송 / 응답 스트리밍 |

---

## 2. V1 vs V2 비교

| 패턴 | V1 | V2 |
|------|-----|-----|
| 단일 질의 | `for await (const msg of query(...))` | `await unstable_v2_prompt(...)` |
| 멀티턴 | async generator + yield 조율 필요 | `send()` / `stream()` 분리 반복 |
| 세션 재개 | `query({ resume: sessionId })` | `unstable_v2_resumeSession(sessionId, opts)` |

---

## 3. 사용 패턴

### 단일 쿼리
```typescript
const result = await unstable_v2_prompt("What is 2 + 2?", { model: "claude-opus-4-6" });
if (result.subtype === "success") console.log(result.result);
```

### 멀티턴 세션
```typescript
await using session = unstable_v2_createSession({ model: "claude-opus-4-6" });

// Turn 1
await session.send("What is 5 + 3?");
for await (const msg of session.stream()) {
  if (msg.type === "assistant") { /* 응답 처리 */ }
}

// Turn 2 (컨텍스트 유지)
await session.send("Multiply that by 2");
for await (const msg of session.stream()) { ... }
```

`await using` (TypeScript 5.2+): 블록 종료 시 자동 `session.close()`. 구버전은 수동 `session.close()`.

### 세션 재개
```typescript
// sessionId는 stream()에서 수신한 msg.session_id
await using resumed = unstable_v2_resumeSession(sessionId, { model: "..." });
await resumed.send("...");
for await (const msg of resumed.stream()) { ... }
```

---

## 4. `SDKSession` 인터페이스

```typescript
interface SDKSession {
  readonly sessionId: string;
  send(message: string | SDKUserMessage): Promise<void>;
  stream(): AsyncGenerator<SDKMessage, void>;
  close(): void;
}
```

---

## 5. V2 미지원 기능 (V1 필요)

- Session forking (`forkSession`)
- 일부 고급 스트리밍 입력 패턴

---

> [insight] V2의 `send()` + `stream()` 분리 패턴은 하네스의 플러그인 실행 제어 UX에서 V1보다 훨씬 직관적이다. 특히 멀티턴 플러그인에서 "사용자 입력 수집 → 전송 → 응답 처리 → 다음 입력"의 루프를 명확하게 구현할 수 있다. `await using`으로 세션 라이프사이클도 자동 관리되어 리소스 누수 위험이 줄어든다. 단, 아직 unstable이므로 하네스 코어에서는 V1을 사용하되 실험적 기능 레이어에서 V2를 평가하는 전략이 적합하다.
