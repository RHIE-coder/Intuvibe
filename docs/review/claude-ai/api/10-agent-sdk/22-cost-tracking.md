# Cost Tracking in Agent SDK

---

토큰 사용량 추적, 병렬 툴 호출 중복 제거, 비용 계산.

---

## 1. 기본 개념

| 단위 | 설명 |
|------|------|
| `query()` 호출 | SDK 함수 1회 실행 → 여러 스텝 포함, 마지막에 `result` 메시지 1개 |
| 스텝 | 단일 요청/응답 사이클, 각 `AssistantMessage`에 사용량 포함 |
| 세션 | `resume`으로 연결된 여러 `query()` 호출 — 세션 합계는 직접 계산 필요 |

---

## 2. 총 비용 조회 (가장 간단)

```python
async for message in query(prompt="Summarize this project"):
    if isinstance(message, ResultMessage):
        print(f"Total cost: ${message.total_cost_usd or 0}")
```

`ResultMessage.total_cost_usd` = 해당 `query()` 호출의 전체 비용. 성공/에러 모두 포함.

---

## 3. 스텝별 사용량 추적 (중복 제거 필수)

**병렬 툴 호출 시**: 같은 턴의 여러 `AssistantMessage`가 **동일 ID + 동일 usage** 공유  
→ ID로 중복 제거 안 하면 비용 과대 계산.

```python
# Python: message.message_id, message.usage
seen_ids = set()
total_input = total_output = 0

async for message in query(prompt="..."):
    if hasattr(message, "message_id") and message.message_id:
        if message.message_id not in seen_ids:
            seen_ids.add(message.message_id)
            usage = message.usage or {}
            total_input += usage.get("input_tokens", 0)
            total_output += usage.get("output_tokens", 0)
```

---

## 4. 모델별 사용량 분리

```python
# ResultMessage.model_usage: 모델명 → {costUSD, inputTokens, outputTokens, ...}
if isinstance(message, ResultMessage) and message.model_usage:
    for model_name, usage in message.model_usage.items():
        print(f"{model_name}: ${usage['costUSD']:.4f}")
```

서브에이전트에 Haiku, 메인 에이전트에 Opus 사용 시 모델별 비용 분리 확인 가능.

---

## 5. 여러 query() 호출 누적

SDK는 세션 레벨 합계 미제공 → 직접 누적:

```python
total_spend = 0.0
for prompt in prompts:
    async for message in query(prompt=prompt):
        if isinstance(message, ResultMessage):
            total_spend += message.total_cost_usd or 0
print(f"Total spend: ${total_spend:.4f}")
```

---

## 6. 캐시 토큰 추적

SDK가 자동으로 프롬프트 캐싱 적용 (별도 설정 불필요).

| 필드 | 요금 | 설명 |
|------|------|------|
| `input_tokens` | 표준 | 일반 입력 |
| `cache_creation_input_tokens` | 높음 | 캐시 생성 비용 |
| `cache_read_input_tokens` | 낮음 | 캐시 적중 비용 |

```python
usage = message.usage or {}
cache_savings = usage.get("cache_read_input_tokens", 0)
```

---

## 7. 주의사항

- 실패한 대화도 실패 시점까지 토큰 소비 → `ResultMessage`에서 비용 반드시 확인
- `output_tokens` 불일치 시: 같은 ID 그룹 중 가장 높은 값 사용, `total_cost_usd`가 권위적

---

> [insight] `ResultMessage.total_cost_usd` + `model_usage`는 하네스의 플러그인별 비용 모니터링 인프라의 핵심 데이터다. 각 플러그인 실행 시 `query()` 호출의 `total_cost_usd`를 플러그인 ID와 함께 로깅하면, 어떤 플러그인이 비용을 많이 소비하는지 분석하고 사용자에게 플러그인별 비용을 투명하게 보여주는 대시보드를 구현할 수 있다. `model_usage`로 서브에이전트(Haiku)와 메인 에이전트(Opus) 비용을 분리하면 비용 최적화 포인트도 파악 가능하다.
