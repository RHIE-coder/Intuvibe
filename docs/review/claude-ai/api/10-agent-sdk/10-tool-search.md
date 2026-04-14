# Tool Search in Agent SDK

---

툴 정의를 컨텍스트에 사전 로딩 없이, 필요 시 온디맨드 검색해 로딩. 기본값: 항상 활성화.

- 최대 툴 카탈로그: **10,000개**
- 검색 결과: 쿼리당 가장 관련성 높은 **3-5개** 반환
- Haiku 모델: ❌ 미지원

---

## 1. 작동 방식

툴 정의를 컨텍스트에 미포함 → 에이전트가 필요한 역량 탐색 → 관련 툴 3-5개 로딩 → 이후 턴에서 해당 툴 유지. Compaction 시 이전 로딩 툴 제거, 필요 시 재검색.

**트레이드오프**: 첫 발견 시 추가 라운드트립 1회 ↔ 매 턴 컨텍스트 절약.

---

## 2. ENABLE_TOOL_SEARCH 설정

```python
options = ClaudeAgentOptions(
    env={"ENABLE_TOOL_SEARCH": "auto:5"},
    ...
)
```

| 값 | 동작 |
|----|------|
| (미설정) / `true` | 항상 활성 (기본) |
| `auto` | 툴 정의 합계가 컨텍스트의 10% 초과 시 활성 |
| `auto:N` | 커스텀 임계값 (예: `auto:5` → 5% 초과 시 활성) |
| `false` | 비활성 (모든 툴 매 턴 로딩) |

`false` 권장 상황: 툴 10개 이하 + 정의가 컨텍스트에 쉽게 맞을 때.

---

## 3. 검색 최적화 팁

- 툴 이름: `query_slack` → `search_slack_messages` (더 많은 쿼리에 매칭)
- 툴 설명: 구체적 키워드 포함 ("Search Slack messages by keyword, channel, or date range")
- 시스템 프롬프트에 툴 카테고리 힌트 제공:
  ```
  You can search for tools to interact with Slack, GitHub, and Jira.
  ```

---

> [insight] Tool Search의 기본 활성화(항상 on)는 하네스 플러그인 마켓플레이스에서 스케일 문제를 자동으로 해결한다. 사용자가 수십-수백 개의 플러그인을 등록해도 컨텍스트 폭발 없이 동작한다. 단, `auto:N` 모드가 소규모 플러그인 세트에서 더 효율적일 수 있다. 하네스에서 플러그인 수에 따른 동적 `ENABLE_TOOL_SEARCH` 설정 전략(플러그인 10개 이하 → `false`, 이상 → `auto:5`)을 구현하면 성능과 컨텍스트 효율을 최적화할 수 있다.
