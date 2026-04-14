# Messages API — 핵심 요청/응답 패턴

---

Messages API는 **stateless** — 매 요청마다 전체 대화 이력을 전송.
ZDR 적격.

---

## 1. 기본 요청

```python
message = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello, Claude"}],
)
```

### 응답 구조

```json
{
  "id": "msg_01XFDUDYJgAACzvnptvVoYEL",
  "type": "message",
  "role": "assistant",
  "content": [{ "type": "text", "text": "Hello!" }],
  "model": "claude-opus-4-6",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": { "input_tokens": 12, "output_tokens": 6 }
}
```

### 필수 파라미터

| 파라미터 | 설명 |
|---------|------|
| `model` | 모델 ID 또는 alias |
| `max_tokens` | 최대 출력 토큰 수 |
| `messages` | 메시지 배열 (`role` + `content`) |

### SDK 지원

Python, TypeScript, C#, Go, Java, PHP, Ruby + cURL 직접 호출

---

## 2. 멀티턴 대화

Stateless이므로 **전체 이력을 매번 전송**. 합성 `assistant` 메시지로 이력 구성 가능.

```python
messages=[
    {"role": "user", "content": "Hello, Claude"},
    {"role": "assistant", "content": "Hello!"},        # 합성 가능
    {"role": "user", "content": "Can you describe LLMs to me?"},
]
```

메시지 규칙: `user`와 `assistant`가 **교대**해야 함.

---

## 3. Prefill (응답 미리 채우기)

마지막 메시지를 `assistant`로 두어 응답 시작점을 지정.

```python
messages=[
    {"role": "user", "content": "Latin for Ant? (A) Apoidea (B) Rhopalocera (C) Formicidae"},
    {"role": "assistant", "content": "The answer is ("},  # prefill
]
# max_tokens=1 → 응답: "C"
```

**Opus 4.6, Sonnet 4.6, Mythos Preview에서 prefill 미지원** → 400 에러.
대안: structured outputs, system prompt, `output_config.format`

---

## 4. Vision (이미지 입력)

### 이미지 소스 3종

| 타입 | 설명 |
|------|------|
| `base64` | Base64 인코딩 데이터 + `media_type` |
| `url` | URL 직접 참조 |
| `file` | Files API로 업로드한 파일 참조 |

### 지원 미디어 타입

`image/jpeg`, `image/png`, `image/gif`, `image/webp`

### content 배열 구조

```python
messages=[{
    "role": "user",
    "content": [
        {"type": "image", "source": {"type": "url", "url": "https://..."}},
        {"type": "text", "text": "What is in the above image?"},
    ],
}]
```

`content`가 문자열이 아닌 **배열**일 때 복수 콘텐츠 블록(이미지 + 텍스트) 혼합 가능.

---

## 5. 핵심 설계 원칙

| 원칙 | 의미 |
|------|------|
| **Stateless** | 서버에 대화 상태 없음. 클라이언트가 전체 이력 관리 |
| **content = 배열** | 텍스트, 이미지, tool_use, thinking 블록 혼합 가능 |
| **교대 규칙** | user → assistant → user → assistant 순서 |
| **합성 메시지** | assistant 메시지를 직접 구성하여 대화 조작 가능 |

> [insight] Messages API가 stateless라는 것은 하네스의 핵심 설계 제약이다. 모든 대화 상태 관리가 하네스(클라이언트)의 책임. Claude Code의 세션/체크포인트/compact는 모두 이 stateless API 위에 클라이언트가 구축한 상태 관리 레이어. 하네스에서 대화 이력 저장, 압축, 재구성 로직을 직접 구현하거나 Compaction API(서버 사이드)에 위임해야 한다.

> [insight] `content`가 문자열 또는 배열 둘 다 가능하다는 것이 중요한 유연성이다. 단순 텍스트는 문자열, 복합 입력(이미지+텍스트, 다중 이미지)은 배열. 하네스에서 메시지 구성 시 이 이중 타입을 처리하는 유틸리티가 필요.

> [insight] Prefill이 Opus 4.6/Sonnet 4.6에서 제거되었으므로, 응답 형식 제어에 prefill을 의존하던 패턴은 structured outputs로 전환해야 한다. 레거시 모델(Sonnet 4.5 이하)에서는 여전히 동작하므로 모델별 분기가 필요할 수 있다.
