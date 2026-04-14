# Adaptive Thinking

---

Adaptive thinking은 extended thinking의 권장 사용 방식. `budget_tokens`를 수동 지정하는 대신, Claude가 요청 복잡도에 따라 thinking 여부와 깊이를 스스로 결정한다.

---

## 1. 지원 모델

| 모델 | 기본값 | 비고 |
|------|--------|------|
| Claude Mythos Preview (`claude-mythos-preview`) | adaptive (기본) | `thinking: {type: "disabled"}` 미지원 |
| Claude Opus 4.6 | 없음 | adaptive 권장 |
| Claude Sonnet 4.6 | 없음 | adaptive 권장 |

> Opus 4.6, Sonnet 4.6에서 `thinking.type: "enabled"` + `budget_tokens` 조합은 **deprecated** (기능은 유지되나 마이그레이션 권장). 이전 모델(Sonnet 4.5, Opus 4.5 등)은 여전히 `type: "enabled"` + `budget_tokens` 필요.

---

## 2. 동작 방식

- 모델이 요청 복잡도를 평가해 thinking 여부/깊이 결정
- **interleaved thinking 자동 활성화** → 툴 호출 사이에도 thinking 가능 (에이전틱 워크플로우에 중요)
- Opus 4.6 manual mode에서는 interleaved thinking 불가 → 에이전틱 워크플로우는 adaptive 필수

---

## 3. 기본 사용법

```python
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=16000,
    thinking={"type": "adaptive"},
    messages=[{"role": "user", "content": "..."}],
)

for block in response.content:
    if block.type == "thinking":
        print(block.thinking)
    elif block.type == "text":
        print(block.text)
```

---

## 4. effort 파라미터 조합

`output_config.effort`로 thinking 깊이를 소프트 가이드.

| effort | thinking 동작 |
|--------|--------------|
| `max` | 항상 thinking, 깊이 제한 없음 (Opus 4.6, Sonnet 4.6) |
| `high` (기본) | 항상 thinking |
| `medium` | 중간 수준. 단순 쿼리는 thinking 생략 가능 |
| `low` | thinking 최소화. 단순 작업에서 속도 우선 |

```python
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=16000,
    thinking={"type": "adaptive"},
    output_config={"effort": "medium"},
    messages=[...],
)
```

---

## 5. 스트리밍

adaptive thinking은 스트리밍과 seamless하게 동작. thinking 블록은 `thinking_delta` 이벤트로 스트림됨.

```python
with client.messages.stream(
    model="claude-opus-4-6",
    max_tokens=16000,
    thinking={"type": "adaptive"},
    messages=[...],
) as stream:
    for event in stream:
        if event.type == "content_block_delta":
            if event.delta.type == "thinking_delta":
                print(event.delta.thinking, end="")
            elif event.delta.type == "text_delta":
                print(event.delta.text, end="")
```

---

## 6. adaptive vs manual vs disabled 비교

| 모드 | 설정 | 사용 시점 |
|------|------|-----------|
| **Adaptive** | `thinking: {type: "adaptive"}` | Claude가 판단. effort로 가이드. 권장 |
| **Manual** | `thinking: {type: "enabled", budget_tokens: N}` | 정확한 thinking 토큰 비용 제어 필요 시. Opus/Sonnet 4.6에서는 deprecated |
| **Disabled** | `thinking` 생략 또는 `{type: "disabled"}` | thinking 불필요, 최저 레이턴시 |

---

## 7. 주요 고려사항

### Validation
adaptive 모드에서는 이전 어시스턴트 턴이 thinking 블록으로 시작하지 않아도 됨 (manual과 달리).

### Prompt Caching
- 같은 `adaptive` 모드 연속 요청: 캐시 브레이크포인트 유지
- `adaptive` ↔ `enabled`/`disabled` 전환: **메시지 캐시 브레이크포인트 깨짐** (시스템 프롬프트, 툴 정의는 유지)

### Thinking 동작 튜닝
시스템 프롬프트로 thinking 빈도 조정 가능:
```
Extended thinking adds latency and should only be used when it
will meaningfully improve answer quality — typically for problems
that require multi-step reasoning. When in doubt, respond directly.
```
→ 단, thinking 줄이면 품질 저하 가능. 먼저 낮은 effort 레벨로 테스트 권장.

### 비용 제어
- `max_tokens`: thinking + 응답 텍스트 합산 hard limit
- `effort`: thinking 할당량 소프트 가이드
- `high`/`max` effort에서 `stop_reason: "max_tokens"` 발생 시 → `max_tokens` 증가 또는 effort 낮추기

---

## 8. thinking 블록 처리

### Summarized Thinking (Claude 4 모델 기본)
- Claude 4 모델은 전체 thinking 과정 요약을 반환 (`display` 미설정 또는 `"summarized"`)
- **과금은 원본 thinking 토큰 기준** (응답에 보이는 요약 토큰 아님)
- Mythos Preview는 `display` 기본값이 `"omitted"` → 요약 보려면 `display: "summarized"` 명시 필요

### display 필드
| 값 | 동작 |
|----|------|
| `"summarized"` | 요약된 thinking 텍스트 반환 (Claude 4 기본) |
| `"omitted"` | thinking 필드 비어 있음. `signature`는 그대로 (스트리밍 시 텍스트 응답 빠르게 시작) |

```python
# omitted 사용 예시
thinking = {"type": "adaptive", "display": "omitted"}
```

> SDK 타입 정의에 `display` 미포함. Python SDK는 dict 키 그대로 전달. TypeScript는 type assertion 필요.

### Thinking Encryption
- 전체 thinking 내용은 암호화되어 `signature` 필드로 반환
- 멀티턴에서 thinking 블록 재전달 시 `signature` 그대로 유지 필요
- `signature` 값은 Claude APIs / Bedrock / Vertex AI 간 호환

### 과금 구조 (summarized 기준)
- 입력 토큰: 원래 요청 토큰
- 출력 토큰 (과금): Claude 내부에서 생성한 **원본** thinking 토큰
- 출력 토큰 (응답에 보이는): 요약된 thinking 토큰
- 요약 생성 토큰: 무과금

---

> [insight] adaptive thinking은 `thinking.type: "adaptive"` 하나로 extended thinking의 "언제, 얼마나" 문제를 Claude에게 위임한다. 하네스에서 에이전틱 워크플로우를 설계할 때 **interleaved thinking이 자동 활성화된다는 점이 핵심** — 툴 호출 사이에도 추론이 가능하므로, 멀티스텝 작업에서 실질적인 품질 향상을 기대할 수 있다.

> [insight] effort 파라미터는 하네스의 에이전트 타입별 설정에 활용하기 좋다. 탐색형 에이전트(Explore)는 `high`/`max`, 단순 조회나 포매팅 에이전트는 `low`/`medium`으로 구성하면 비용과 속도의 균형을 잡을 수 있다.

> [insight] `adaptive` ↔ `enabled`/`disabled` 전환이 캐시 브레이크포인트를 깨뜨린다는 점은 하네스 설계 시 중요하다. 에이전트 파이프라인 내에서 thinking 모드를 동적으로 바꾸는 패턴은 prompt caching 효율을 떨어뜨리므로, 가능하면 에이전트별로 thinking 모드를 고정하는 것이 낫다.

> [insight] `display: "omitted"`는 thinking 결과를 사용자에게 노출하지 않는 하네스 에이전트(백엔드 추론 전용)에 적합하다. 레이턴시를 줄이면서도 멀티턴 continuity(`signature`)를 유지할 수 있다. 단, 비용은 동일하게 부과된다는 점 주의.
