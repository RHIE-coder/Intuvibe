# Token Counting

---

메시지 생성 전 입력 토큰 수를 미리 추정. 비용 관리와 컨텍스트 한도 초과 방지에 활용.

- 엔드포인트: `POST /v1/messages/count_tokens`
- 반환: `{"input_tokens": N}`
- **무료** (별도 요금 없음, 단 Rate Limit 별도)
- ZDR: ✅ 지원

---

## 1. 기본 사용법

```python
response = client.messages.count_tokens(
    model="claude-opus-4-6",
    system="You are a scientist.",
    messages=[{"role": "user", "content": "Hello, Claude"}],
)
print(response.input_tokens)  # 예: 14
```

---

## 2. Rate Limits (메시지 생성과 별도)

| Tier | RPM |
|------|-----|
| 1 | 100 |
| 2 | 2,000 |
| 3 | 4,000 |
| 4 | 8,000 |

---

## 3. 추정치 특성

- **추정값** (실제 청구 토큰과 다를 수 있음)
- 시스템이 자동 추가하는 토큰 포함 가능
- 실제 API 호출 시 토큰 수와 미세한 차이 발생 가능

---

## 4. 지원 콘텐츠

| 콘텐츠 | 지원 |
|--------|------|
| 시스템 프롬프트 | ✅ |
| 툴 정의 | ✅ |
| 이미지 | ✅ |
| PDF | ✅ |
| Extended Thinking | ✅ |

---

## 5. 툴 & Extended Thinking 특이사항

**서버 툴** (web_search 등): 첫 번째 샘플링 호출에만 적용되는 토큰 반영

**Extended Thinking**:
- 이전 어시스턴트 턴의 thinking 블록 → **무시됨** (카운트 안 됨)
- 현재 턴 thinking 예산 (`budget_tokens`) → 카운트에 포함

---

## 6. 캐시 동작

`cache_control`을 제공해도 **캐시 로직 미적용**. 캐시 읽기/쓰기 토큰 구분 없이 전체 입력 토큰만 반환.

---

> [insight] Token Counting API가 무료라는 점은 하네스에서 사전 검증 레이어를 부담 없이 추가할 수 있다는 의미다. 긴 문서나 툴 세트를 포함한 요청 전에 count_tokens로 컨텍스트 한도 초과 여부를 확인하고, 초과 시 compaction이나 context editing을 선제적으로 트리거하는 안전망 패턴이 가능하다.

> [insight] 이전 어시스턴트 턴의 thinking 블록이 카운트에서 무시된다는 점은 Extended Thinking 활성화 시 실제 청구 토큰과 추정치 간 괴리의 주요 원인이다. 하네스에서 thinking + 멀티턴 대화의 비용 추정 시 이 차이를 보정 계수로 반영해야 한다.

> [insight] Rate Limit이 메시지 생성과 별도로 관리된다는 점은 하네스에서 token counting을 핫패스에 넣어도 메시지 생성 quota를 잠식하지 않는다는 보장이다. 모든 에이전트 루프 시작 전 count_tokens 호출을 표준화해도 실제 요청 처리량에 영향이 없다.
