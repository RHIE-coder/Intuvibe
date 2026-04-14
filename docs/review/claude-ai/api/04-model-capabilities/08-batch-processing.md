# Batch Processing (Message Batches API)

---

대용량 요청을 비동기로 처리하는 API. 즉각적인 응답이 불필요할 때 비용을 50% 절감하면서 처리량 향상.

- 대부분 1시간 내 완료
- ZDR **미지원** (표준 데이터 보존 정책 적용)
- 모든 active 모델 지원

---

## 1. 제한사항

| 항목 | 값 |
|------|-----|
| 배치당 최대 요청 수 | 100,000개 |
| 배치당 최대 크기 | 256 MB |
| 처리 만료 시간 | 24시간 |
| 결과 보존 기간 | 생성 후 29일 |
| 범위 | Workspace 단위 |

- Rate limit: Batches API HTTP 요청 + 배치 내 처리 대기 요청 수 모두 적용
- Spend limit 약간 초과 가능 (고처리량/병렬 특성상)

---

## 2. 가격 (표준 대비 50%)

| 모델 | 입력 | 출력 |
|------|------|------|
| Opus 4.6 | $2.50/MTok | $12.50/MTok |
| Sonnet 4.6 | $1.50/MTok | $7.50/MTok |
| Haiku 4.5 | $0.50/MTok | $2.50/MTok |
| Haiku 3.5 | $0.40/MTok | $2/MTok |
| Haiku 3 | $0.125/MTok | $0.625/MTok |

→ Prompt caching 할인과 **중첩 적용** 가능

---

## 3. 배치 가능 항목

Messages API로 가능한 모든 요청 포함 (Vision, Tool use, System messages, Multi-turn, beta features 등). 배치 내 서로 다른 타입 혼합 가능.

---

## 4. 배치 생성

```python
message_batch = client.messages.batches.create(
    requests=[
        Request(
            custom_id="my-first-request",  # 고유 ID (결과 매칭용)
            params=MessageCreateParamsNonStreaming(
                model="claude-opus-4-6",
                max_tokens=1024,
                messages=[{"role": "user", "content": "Hello, world"}],
            ),
        ),
        Request(
            custom_id="my-second-request",
            params=MessageCreateParamsNonStreaming(...),
        ),
    ]
)
# 생성 직후: processing_status = "in_progress"
```

> `params` 유효성 검사는 **비동기** — 배치 전체 처리 완료 후에 검증 에러 반환. 사전에 Messages API로 요청 형태 검증 권장.

---

## 5. 상태 폴링

```python
while True:
    batch = client.messages.batches.retrieve(BATCH_ID)
    if batch.processing_status == "ended":
        break
    time.sleep(60)
```

`processing_status` 값:
- `in_progress` → `ended` (정상 완료)
- `in_progress` → `canceling` → `ended` (취소)

---

## 6. 결과 조회

결과 형식: `.jsonl` (한 줄 = 단일 요청 결과). **순서 보장 없음** → `custom_id`로 매칭.

```python
for result in client.messages.batches.results(BATCH_ID):
    match result.result.type:
        case "succeeded":
            print(f"OK: {result.custom_id}")
        case "errored":
            if result.result.error.type == "invalid_request":
                print("요청 수정 필요")  # 재전송 전 파라미터 수정 필요
            else:
                print("서버 에러")       # 그대로 재전송 가능
        case "expired":
            print("24시간 만료")
        case "canceled":
            print("취소됨")
```

결과 타입:

| 타입 | 설명 | 과금 |
|------|------|------|
| `succeeded` | 성공 + 메시지 결과 포함 | O |
| `errored` | 에러 (invalid_request / 서버 에러) | X |
| `canceled` | 취소됨 | X |
| `expired` | 24시간 만료 | X |

---

## 7. 배치 취소

```python
client.messages.batches.cancel(BATCH_ID)
# → processing_status: "canceling" → "ended"
# 취소 전 완료된 요청 결과는 부분적으로 포함
```

---

## 8. Prompt Caching + Batch

- 할인 **중첩** 가능 (50% batch + 캐시 할인)
- 캐시 히트는 best-effort (비동기/병렬 처리 특성상 보장 아님)
- 실제 캐시 히트율: 30%~98% (트래픽 패턴에 따라)
- **배치 처리 시간(~1시간)이 기본 캐시 TTL(5분)보다 길므로** → 1시간 캐시 기간(`cache_control: {type: "ephemeral"}`) 사용 권장

캐시 히트 극대화:
1. 배치 내 모든 요청에 동일한 `cache_control` 블록 포함
2. 꾸준한 요청으로 캐시 만료 방지
3. 공유 컨텍스트(시스템 프롬프트, 문서 등)는 첫 번째에 배치

---

> [insight] Batch API는 하네스에서 "대량 평가", "오프라인 분석", "비동기 컨텐츠 처리" 에이전트 유형을 설계할 때 핵심 인프라다. 즉각적인 응답이 필요 없는 태스크(코드 리뷰, 문서 요약, 데이터 분류 등)를 식별하고 batch 전용 에이전트로 라우팅하면 동일 워크로드에서 비용을 절반으로 줄일 수 있다.

> [insight] `custom_id`로 결과를 매칭해야 한다는 점은 하네스 배치 파이프라인 설계에서 중요하다. `custom_id`에 원본 태스크 ID나 메타데이터를 인코딩해두면 결과 처리 시 context lookup 없이 바로 처리할 수 있다.

> [insight] `errored` 결과의 에러 타입 구분이 중요하다: `invalid_request`는 요청 수정 후 재전송 필요, 서버 에러는 그대로 재전송 가능. 하네스의 배치 결과 처리 레이어는 이 두 케이스를 다르게 처리해야 한다.

> [insight] 배치 캐시 히트율이 30%~98%로 편차가 크다. 캐시 히트를 높이려면 공유 컨텍스트(시스템 프롬프트)를 최대화하고 1시간 캐시를 쓰는 것이 핵심이다. 하네스에서 대량 배치를 설계할 때 시스템 프롬프트를 공통화하는 것만으로도 의미 있는 추가 할인을 기대할 수 있다.
