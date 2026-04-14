# Tool Search Tool

---

대규모 툴 카탈로그에서 필요한 툴만 온디맨드로 로드. 컨텍스트 블로트 방지 + 툴 선택 정확도 유지.

- 버전: `tool_search_tool_regex_20251119` (Python regex) / `tool_search_tool_bm25_20251119` (자연어)
- ZDR: 서버 사이드 버전은 툴 카탈로그 메타데이터 보관 (제한적). 클라이언트 사이드 구현은 완전 ZDR.
- 지원 모델: Claude Mythos Preview, Sonnet 4.0+, Opus 4.0+ (Haiku 미지원)
- 최대 툴 수: 10,000개

---

## 1. 문제와 해결

**문제**:
- GitHub + Slack + Sentry + Grafana + Splunk 조합 시 툴 정의만 ~55k 토큰 소비
- 툴 30~50개 초과 시 Claude의 툴 선택 정확도 급락

**해결**: 처음에 툴 검색 툴 하나만 전달 → Claude가 필요 시 검색 → 관련 툴 3~5개만 로드

**효과**: 컨텍스트 사용량 85% 이상 감소, 선택 정확도 유지

---

## 2. 버전별 차이

| 버전 | 쿼리 방식 | 특징 |
|------|---------|------|
| `regex_20251119` | Python `re.search()` 정규식 | `"(?i)slack"`, `"get_.*_data"` 등 |
| `bm25_20251119` | 자연어 | "find weather tools" 등 |

**Regex 예시**:
- `"weather"` → weather 포함 이름/설명 매치
- `"get_.*_data"` → get_user_data, get_weather_data 등
- `"database.*query|query.*database"` → OR 패턴
- `"(?i)slack"` → 대소문자 무관

최대 쿼리 길이: 200자

---

## 3. 구성

```json
// 툴 검색 툴 (defer_loading 없음)
{"type": "tool_search_tool_regex_20251119", "name": "tool_search_tool_regex"}

// 지연 로드 툴
{
  "name": "get_weather",
  "description": "Get current weather for a location",
  "input_schema": {...},
  "defer_loading": true
}
```

**규칙**:
- 툴 검색 툴 자체에는 절대 `defer_loading: true` 설정 금지
- 자주 사용하는 3~5개 툴은 non-deferred로 유지 (최적 성능)
- 적어도 1개는 non-deferred 필수 (전부 deferred 시 400 에러)

---

## 4. 응답 구조

```json
{
  "content": [
    {"type": "server_tool_use", "name": "tool_search_tool_regex", "input": {"query": "weather"}},
    {
      "type": "tool_search_tool_result",
      "content": {
        "type": "tool_search_tool_search_result",
        "tool_references": [{"type": "tool_reference", "tool_name": "get_weather"}]
      }
    },
    {"type": "tool_use", "name": "get_weather", "input": {...}}
  ]
}
```

`tool_reference` 블록은 API가 자동으로 전체 툴 정의로 확장. 개발자가 직접 처리 불필요.

---

## 5. 클라이언트 사이드 커스텀 구현

임베딩·시맨틱 검색 등 자체 검색 로직 사용 시:

```json
// 커스텀 툴 검색 결과 반환 형식
{
  "type": "tool_result",
  "tool_use_id": "toolu_xxx",
  "content": [{"type": "tool_reference", "tool_name": "discovered_tool_name"}]
}
```

참조된 모든 툴은 `tools` 배열에 `defer_loading: true`와 함께 정의 필수.

---

## 6. 에러 코드

| 코드 | 설명 |
|------|------|
| `too_many_requests` | 레이트 리밋 초과 |
| `invalid_pattern` | 잘못된 정규식 패턴 |
| `pattern_too_long` | 200자 초과 |
| `unavailable` | 서비스 일시 불가 |

**400 에러 케이스**:
- 모든 툴이 deferred: `"At least one tool must be non-deferred"`
- 툴 참조에 정의 없음: `"Tool reference 'x' has no corresponding tool definition"`

---

## 7. 사용량 추적

```json
{
  "usage": {
    "server_tool_use": {"tool_search_requests": 2}
  }
}
```

---

## 8. 최적화 팁

- 서비스/리소스별 네임스페이스 접두사 사용: `github_`, `slack_`, `jira_`
- 툴 설명에 사용자가 태스크를 표현하는 방식의 키워드 포함
- 시스템 프롬프트에 사용 가능 툴 카테고리 설명
- 자주 사용되는 3~5개 툴은 항상 non-deferred로 유지

---

## 9. defer_loading과 캐시 보존

지연 툴은 시스템 프롬프트 prefix에서 제외 → 캐시 무효화 없음. 발견된 툴은 대화 본문에 `tool_reference`로 인라인 삽입. strict 모드와도 호환 (문법 재컴파일 불필요).

---

> [insight] Tool search의 85% 이상 컨텍스트 감소는 하네스의 플러그인 마켓플레이스에서 수십~수백 개 플러그인을 활성화해도 실질적인 컨텍스트 비용이 최소화됨을 의미한다. 플러그인 20개 초과 시 자동으로 tool search 모드 전환하는 하네스 구성 레이어가 필요하다.

> [insight] `regex` vs `bm25` 선택은 하네스의 툴 카탈로그 설계와 연관된다. 툴 이름에 일관된 네임스페이스(`github_`, `slack_`)를 사용한다면 regex 패턴 검색이 더 정확하고 예측 가능하다. 자연어 기반 카탈로그라면 bm25가 적합.

> [insight] 클라이언트 사이드 커스텀 구현(임베딩 검색)은 하네스에서 ZDR을 완전히 지원하면서도 더 정교한 툴 발견 로직을 구현할 수 있는 핵심 경로다. 서버 사이드 tool search는 툴 카탈로그 메타데이터를 보관하지만, 클라이언트 사이드 구현 + `tool_reference` 반환 패턴은 완전한 ZDR을 유지한다.

> [insight] `defer_loading`이 프롬프트 캐시를 보존한다는 점은 하네스의 비용 최적화 복합 전략의 핵심이다. tool search(컨텍스트 감소) + prompt caching(반복 비용 감소) + defer_loading(캐시 무효화 방지) 세 가지를 동시에 적용하면 대규모 툴셋에서 비용과 정확도를 모두 최적화할 수 있다.
