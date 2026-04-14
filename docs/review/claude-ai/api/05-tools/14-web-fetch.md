# Web Fetch Tool

---

특정 URL의 전체 콘텐츠(웹페이지·PDF)를 Claude 컨텍스트로 가져오는 서버 툴.

- 버전: `web_fetch_20260209` (동적 필터링) / `web_fetch_20250910` (기본)
- 추가 과금 없음 (가져온 콘텐츠의 토큰 비용만 발생)
- ZDR: `_20250910` 기본 버전 해당

---

## 1. web_search와의 차이

| | web_search | web_fetch |
|-|-----------|----------|
| 방식 | 쿼리 기반 검색 | URL 직접 지정 |
| 인용 | 항상 활성화 | 선택적 (`citations: {enabled: true}`) |
| 비용 | $10/1,000 검색 | 추가 없음 (토큰만) |
| PDF | ❌ | ✅ (base64 반환) |
| JS 렌더링 | 미지원 | 미지원 |

---

## 2. 보안 제약

**데이터 유출 위험**: 신뢰할 수 없는 입력과 민감한 데이터를 함께 처리하는 환경에서는 사용 주의.

**URL 검증**: Claude가 임의 URL을 생성해 fetch 불가. 다음 출처의 URL만 허용:
- 사용자 메시지에 포함된 URL
- 클라이언트 측 tool_result의 URL
- 이전 web_search / web_fetch 결과의 URL

완화 방법: `max_uses` 제한, `allowed_domains` 제한, 또는 툴 완전 비활성화.

---

## 3. 툴 정의

```json
{
  "type": "web_fetch_20250910",
  "name": "web_fetch",
  "max_uses": 10,
  "allowed_domains": ["docs.example.com"],
  "blocked_domains": ["private.example.com"],
  "citations": {"enabled": true},
  "max_content_tokens": 100000    // 대형 문서 토큰 제한 (근사값)
}
```

---

## 4. 응답 구조

```json
{
  "type": "web_fetch_tool_result",
  "content": {
    "type": "web_fetch_result",
    "url": "https://example.com/article",
    "content": {
      "type": "document",
      "source": {"type": "text", "media_type": "text/plain", "data": "..."},
      "citations": {"enabled": true}
    },
    "retrieved_at": "2025-08-25T10:30:00Z"
  }
}
```

PDF의 경우: `source.type = "base64"`, `media_type = "application/pdf"`

> 결과가 캐시될 수 있음 (최신 버전이 아닐 수 있음).

---

## 5. 에러 코드

| 코드 | 원인 |
|------|------|
| `invalid_input` | 잘못된 URL 형식 |
| `url_too_long` | URL 250자 초과 |
| `url_not_allowed` | 도메인 필터링 또는 모델 제한 |
| `url_not_accessible` | HTTP 에러 |
| `unsupported_content_type` | 텍스트/PDF 외 형식 |
| `max_uses_exceeded` | max_uses 초과 |

에러 발생 시 HTTP 200 반환, 응답 body에 에러 포함.

---

## 6. web_search + web_fetch 조합

```python
tools=[
    {"type": "web_search_20250305", "name": "web_search", "max_uses": 3},
    {"type": "web_fetch_20250910", "name": "web_fetch", "max_uses": 5, "citations": {"enabled": True}},
]
# 흐름: 검색 → 관련 URL 선택 → 전체 내용 fetch → 상세 분석 + 인용
```

---

## 7. 토큰 소비 참고

| 콘텐츠 유형 | 크기 | 토큰 |
|-----------|------|------|
| 평균 웹페이지 | 10KB | ~2,500 |
| 대형 문서 페이지 | 100KB | ~25,000 |
| 연구 논문 PDF | 500KB | ~125,000 |

→ `max_content_tokens` 파라미터로 예산 제어 필수.

---

> [insight] web_fetch는 추가 비용이 없지만 토큰 소비가 크다. 하네스의 문서 분석 에이전트에서 `max_content_tokens`를 반드시 설정해야 한다. 500KB PDF 하나가 125k 토큰을 차지하면 Claude 4의 200k 컨텍스트 윈도우 절반 이상을 소모한다.

> [insight] 동적 필터링(`_20260209`)은 긴 문서에서 필요한 섹션만 추출하는 사용 사례에서 핵심이다. 하네스에서 PDF 논문이나 긴 문서에서 특정 정보를 추출하는 에이전트는 `_20260209` 버전을 사용하면 토큰 비용을 크게 줄일 수 있다.

> [insight] URL 검증 제약(Claude가 생성한 URL 페치 불가)은 하네스 설계에서 중요한 보안 경계다. 에이전트가 web_search로 찾은 URL을 web_fetch로 이어받는 패턴은 허용되지만, 에이전트가 임의로 구성한 URL을 페치하려면 사용자/시스템이 먼저 해당 URL을 대화에 명시해야 한다.

> [insight] web_fetch + citations 조합은 하네스의 리서치 에이전트에서 출처 추적의 핵심이다. web_search의 인용이 150자 스니펫 수준이라면, web_fetch는 전체 문서에서 정확한 문자 위치(`start_char_index`, `end_char_index`)로 인용한다. 고품질 인용이 필요한 리포트 생성 에이전트에서는 반드시 web_fetch + citations를 활성화해야 한다.
