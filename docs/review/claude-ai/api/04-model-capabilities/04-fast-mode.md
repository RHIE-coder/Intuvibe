# Fast Mode (beta: research preview)

---

Claude Opus 4.6 전용 고속 출력 모드. `speed: "fast"` 설정으로 최대 2.5x 높은 출력 토큰/초(OTPS)를 제공하며, 모델 가중치·능력 변화 없이 동일 모델을 빠른 추론 설정으로 실행.

> **beta (research preview)** — 대기자 명단 신청 필요. 현재 제한적 제공.

---

## 1. 지원 모델

- Claude Opus 4.6 (`claude-opus-4-6`) **전용**

---

## 2. 동작 방식

- 최대 **2.5x** 높은 OTPS (출력 토큰/초)
- **TTFT(첫 토큰까지 시간) 개선 아님** — 출력 속도 개선
- 모델 웨이트·행동 동일 (다른 모델 아님)
- beta 헤더 `anthropic-beta: fast-mode-2026-02-01` 필요

---

## 3. 기본 사용법

```python
response = client.beta.messages.create(
    model="claude-opus-4-6",
    max_tokens=4096,
    speed="fast",
    betas=["fast-mode-2026-02-01"],
    messages=[{"role": "user", "content": "..."}],
)
print(response.content[0].text)
```

사용된 속도 확인:
```python
print(response.usage.speed)  # "fast" or "standard"
```

---

## 4. 가격

| Input | Output |
|-------|--------|
| $30 / MTok | $150 / MTok |

- 표준 Opus 요금의 **6배** (200k 토큰 초과 포함)
- Prompt caching 배수 및 Data residency 배수 **추가 적용**

---

## 5. Rate Limits

- 표준 Opus rate limit과 **별도** 관리
- 초과 시 `429` + `retry-after` 헤더 반환
- 응답 헤더로 fast mode 사용량 추적:
  - `anthropic-fast-input-tokens-limit/remaining/reset`
  - `anthropic-fast-output-tokens-limit/remaining/reset`

---

## 6. Fallback 전략

Rate limit 초과 시 `speed: "fast"` 제거 후 standard로 폴백:

```python
def create_message_with_fast_fallback(max_retries=None, max_attempts=3, **params):
    try:
        return client.beta.messages.create(**params, max_retries=max_retries)
    except anthropic.RateLimitError:
        if params.get("speed") == "fast":
            del params["speed"]
            return create_message_with_fast_fallback(**params)
        raise
    except (anthropic.InternalServerError, anthropic.OverloadedError, anthropic.APIConnectionError):
        if max_attempts > 1:
            return create_message_with_fast_fallback(max_attempts=max_attempts - 1, **params)
        raise
```

> fast → standard 전환 시 **prompt cache miss** 발생. 다른 speed끼리 캐시 공유 안 됨.

---

## 7. 제약사항

| 항목 | 내용 |
|------|------|
| 지원 모델 | Opus 4.6 전용. 다른 모델에 `speed: "fast"` 전달 시 에러 |
| Prompt caching | fast ↔ standard 전환 시 캐시 무효화 |
| TTFT | 개선 없음 (OTPS만 개선) |
| Batch API | 미지원 |
| Priority Tier | 미지원 |

---

> [insight] Fast mode는 레이턴시 민감한 에이전틱 워크플로우에 유용하지만, **Opus 4.6 전용 + 6배 요금 + beta**라는 제약이 크다. 하네스에서 fast mode를 지원할 때는 기본 off, 옵션으로 활성화 가능한 구조가 적절하며, rate limit 초과 시 standard로 폴백하는 로직을 에이전트 레이어에 내장하는 것이 권장 패턴이다.

> [insight] fast ↔ standard 전환이 prompt cache를 무효화한다는 점은 하네스 설계에서 중요하다. 동일 파이프라인 내에서 speed를 동적으로 바꾸는 패턴은 피해야 한다. fast mode 에이전트는 항상 fast mode로 고정하거나, 폴백 시 캐시 miss 비용을 감수할 것인지 명시적으로 결정해야 한다.

> [insight] `response.usage.speed` 필드로 실제 사용된 speed를 확인할 수 있다. 하네스에서 비용 추적 시 fast mode 사용 여부를 로깅하는 훅을 PostToolUse/응답 처리 단계에 추가하면 정확한 비용 분석이 가능하다.
