# Web Search Tool

---

Claude에게 실시간 웹 검색 능력 부여. 응답에 자동 출처 인용 포함.

- 버전: `web_search_20260209` (동적 필터링) / `web_search_20250305` (기본)
- ZDR: `_20250305` 버전만 해당, `_20260209` + `allowed_callers: ["direct"]` 필요
- 가격: **$10 / 1,000 검색** + 검색 결과 토큰 비용
- 에러 시 과금 없음

---

## 1. 버전별 차이

| 버전 | 동적 필터링 | ZDR | 특징 |
|------|-----------|-----|------|
| `web_search_20260209` | ✅ | ❌ (기본) | 검색 결과를 코드로 필터링 후 컨텍스트에 로드 |
| `web_search_20250305` | ❌ | ✅ | 기본 검색, 전체 HTML을 컨텍스트에 로드 |

**동적 필터링 (`_20260209`)**: 내부 `code_execution` 사용 → 기술 문서, 문헌 리뷰, 검증 작업에 특히 효과적. 코드로 불필요한 콘텐츠를 제거하므로 토큰 소비 감소 + 응답 품질 향상.

---

## 2. 툴 정의

```json
{
  "type": "web_search_20250305",
  "name": "web_search",
  "max_uses": 5,                           // 검색 횟수 제한 (초과 시 max_uses_exceeded 에러)
  "allowed_domains": ["example.com"],      // 허용 도메인 (blocked_domains와 동시 불가)
  "blocked_domains": ["untrusted.com"],
  "user_location": {                       // 검색 결과 지역화
    "type": "approximate",
    "city": "Seoul",
    "region": "Seoul",
    "country": "KR",
    "timezone": "Asia/Seoul"
  }
}
```

---

## 3. 응답 구조

```json
{
  "content": [
    {"type": "text", "text": "I'll search for..."},           // 1. 검색 결정
    {"type": "server_tool_use", "name": "web_search",         // 2. 검색 쿼리
     "input": {"query": "..."}},
    {"type": "web_search_tool_result", "content": [           // 3. 검색 결과
      {
        "type": "web_search_result",
        "url": "...", "title": "...",
        "encrypted_content": "...",                           // 멀티턴 시 반드시 전달
        "page_age": "..."
      }
    ]},
    {"type": "text", "text": "...",                           // 4. 인용 포함 응답
     "citations": [{
       "type": "web_search_result_location",
       "url": "...", "title": "...",
       "encrypted_index": "...",                              // 멀티턴 시 반드시 전달
       "cited_text": "..."                                    // 최대 150자, 토큰 비용 미포함
     }]}
  ],
  "usage": {
    "server_tool_use": {"web_search_requests": 1}
  }
}
```

---

## 4. 에러 코드

| 코드 | 의미 |
|------|------|
| `too_many_requests` | 레이트 리밋 초과 |
| `invalid_input` | 잘못된 검색 쿼리 |
| `max_uses_exceeded` | max_uses 초과 |
| `query_too_long` | 쿼리 최대 길이 초과 |
| `unavailable` | 내부 에러 |

에러 발생 시 HTTP 200 응답 (에러는 응답 body 내 `web_search_tool_result_error`로 표현).

---

## 5. 비용 구조

- 검색 1회: **$10 / 1,000 searches** (에러 시 미과금)
- 검색 결과 텍스트: 입력 토큰으로 과금
- 인용 필드(`cited_text`, `url`, `title`): 토큰 비용 미포함

---

## 6. 플랫폼 호환성

- Claude API, Microsoft Azure/Foundry: `_20260209` 동적 필터링 지원
- Google Vertex AI: 기본 버전만 지원 (`_20250305`)
- Amazon Bedrock: Claude Mythos Preview에서 미지원

---

> [insight] 동적 필터링(`_20260209`)은 하네스의 연구·분석 에이전트에서 핵심 성능 향상 요소다. 기본 web_search는 전체 HTML을 컨텍스트에 로드하므로 토큰이 폭발적으로 증가하지만, 동적 필터링은 코드로 필터링 후 필요한 정보만 로드한다. 기술 문서 분석, 시장 조사, 사실 검증 에이전트에서 비용과 품질을 동시에 개선한다.

> [insight] `encrypted_content`와 `encrypted_index`는 멀티턴 대화에서 반드시 그대로 전달해야 한다. 하네스의 웹 검색 에이전트가 대화 히스토리를 관리할 때 이 암호화된 필드를 누락하거나 수정하면 인용이 깨진다. 대화 히스토리 직렬화/역직렬화 로직에서 특히 주의해야 한다.

> [insight] 검색 당 $10/1,000 과금은 배치 처리에서도 동일하다. 대량 검색 태스크를 배치 API로 처리하면 토큰 비용은 50% 절감되지만 검색 비용은 동일하다. 하네스에서 비용 추정 시 검색 횟수를 별도 항목으로 계산해야 한다.

> [insight] `user_location`을 활용하면 한국 사용자에게 한국어 지역 콘텐츠를 더 잘 제공할 수 있다. 하네스의 지역화 레이어에서 사용자의 로케일 정보를 web_search 툴 설정에 동적으로 주입하는 패턴이 유용하다.
