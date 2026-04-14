# Tool Use with Prompt Caching

---

툴 정의에 캐시 적용, 캐시 무효화 규칙, `defer_loading`으로 캐시 보존 방법.

---

## 1. 툴 정의 캐싱

`cache_control`을 `tools` 배열의 **마지막 툴**에 적용 → 첫 번째 툴부터 해당 지점까지 전체 툴 정의 프리픽스 캐시:

```json
{
  "tools": [
    {"name": "get_weather", ...},
    {
      "name": "get_time",
      ...,
      "cache_control": {"type": "ephemeral"}  // ← 마지막 툴에 배치
    }
  ]
}
```

`mcp_toolset`의 경우: `mcp_toolset` 엔트리 자체에 `cache_control` 배치 → API가 마지막 확장 툴에 자동 적용.

---

## 2. 캐시 무효화 계층

캐시는 `tools → system → messages` 프리픽스 계층을 따름. 상위 레벨 변경 시 하위 레벨 전체 무효화:

| 변경 사항 | 무효화 범위 |
|-----------|-----------|
| 툴 정의 수정 | **전체** (tools + system + messages) |
| web_search/citations 토글 | system + messages |
| `tool_choice` 변경 | messages |
| `disable_parallel_tool_use` 변경 | messages |
| 이미지 유무 변경 | messages |
| thinking 파라미터 변경 | messages |

> `tool_choice`를 대화 중간에 변경해야 한다면, 변경 지점 앞에 캐시 브레이크포인트 배치 고려.

---

## 3. defer_loading과 캐시 보존

`defer_loading` 툴은 시스템 프롬프트 프리픽스에 포함되지 않음. Tool Search로 동적 발견 시 `tool_reference` block으로 대화 히스토리에 인라인 추가 → **프리픽스 캐시 보존**.

- 초기에 자주 쓰는 툴(캐시됨) + 필요 시 Tool Search로 추가 툴 발견
- 매 턴마다 동일한 캐시 히트 유지
- strict 모드의 문법 컴파일도 전체 툴셋 기준으로 별도 처리 → 동적 로딩과 무관하게 문법 캐시 보존

---

## 4. 툴별 캐싱 특이사항

| 툴 | 캐싱 고려사항 |
|----|-------------|
| web_search, web_fetch | 활성화/비활성화 시 system + messages 캐시 무효화 |
| code_execution | 컨테이너 상태는 프롬프트 캐시와 독립적 |
| tool_search | 발견 툴이 `tool_reference` block으로 추가 → 프리픽스 캐시 보존 |
| computer_use | 스크린샷 유무가 messages 캐시에 영향 |
| text_editor, bash, memory | 표준 클라이언트 툴, 캐싱 특이사항 없음 |

---

> [insight] 툴 정의 캐싱의 핵심은 마지막 툴에 `cache_control`을 배치하는 것이다. 하네스에서 툴 세트를 동적으로 구성할 때, 고정 툴 세트(항상 사용)와 가변 툴 세트를 분리하고 고정 툴의 마지막에 캐시 브레이크포인트를 두면 최대 캐시 효율을 얻을 수 있다.

> [insight] `defer_loading` + Tool Search 조합은 대규모 툴 라이브러리를 가진 하네스에서 핵심 패턴이다. 수십~수백 개의 플러그인 툴을 모두 프리픽스에 로드하는 대신, 자주 쓰는 10-20개만 캐시하고 나머지는 필요 시 동적 발견으로 처리하면 캐시 효율과 확장성을 동시에 확보할 수 있다.

> [insight] `tool_choice` 변경이 messages 캐시만 무효화한다는 점은 중요하다. 툴 정의와 시스템 프롬프트는 캐시가 유지되므로, 동일 대화 내에서 `auto` ↔ 특정 툴 강제 전환이 있어도 툴 정의 캐시 비용은 발생하지 않는다.

> [insight] web_search/citations 토글이 system 캐시를 무효화한다. 하네스에서 web_search를 조건부로 활성화하는 에이전트(예: 일부 요청에만 검색 허용)는 매번 system 캐시가 깨지므로, 검색 필요 여부를 시스템 프롬프트 로직이 아닌 툴 설명이나 에이전트 라우팅으로 처리하는 것이 캐시 효율에 유리하다.
