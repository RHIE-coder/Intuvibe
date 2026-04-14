# Define Tools

---

툴 스키마 작성, 효과적인 설명 작성, Claude의 툴 호출 제어 방법.

---

## 1. 툴 정의 구조

```json
{
  "name": "get_weather",              // ^[a-zA-Z0-9_-]{1,64}$
  "description": "...",              // 상세 설명 (가장 중요)
  "input_schema": { ... },           // JSON Schema
  "input_examples": [ ... ]          // 선택적: 복잡한 툴에 유용
}
```

추가 선택 속성: `cache_control`, `strict`, `defer_loading`, `allowed_callers`

---

## 2. 툴 설명 베스트 프랙티스

**설명이 가장 중요한 요소.** 포함할 내용:
- 툴이 하는 일
- 언제 사용해야 하는지 (그리고 언제 쓰지 말아야 하는지)
- 각 파라미터의 의미와 영향
- 중요한 주의사항·한계 (툴 이름이 불명확한 경우 반환하지 않는 정보 등)

**좋은 예:**
```json
{
  "name": "get_stock_price",
  "description": "Retrieves the current stock price for a given ticker symbol. The ticker symbol must be a valid symbol for a publicly traded company on a major US stock exchange like NYSE or NASDAQ. The tool will return the latest trade price in USD. It should be used when the user asks about the current or most recent price of a specific stock. It will not provide any other information about the stock or company."
}
```

**나쁜 예:**
```json
{ "name": "get_stock_price", "description": "Gets the stock price for a ticker." }
```

### 추가 설계 원칙
- **관련 작업은 통합**: `create_pr` + `review_pr` + `merge_pr` → `pr` 툴 + `action` 파라미터. 툴 수를 줄이면 선택 모호성 감소.
- **의미 있는 네임스페이스**: `github_list_prs`, `slack_send_message` 등 서비스 접두사 사용
- **응답은 고신호 정보만**: 불투명 내부 참조 대신 slug/UUID, Claude가 다음 단계 추론에 필요한 필드만 반환

---

## 3. input_examples

복잡한 툴(중첩 객체, 선택 파라미터, 형식 민감한 입력)에 구체적 예시 제공:

```python
{
  "name": "get_weather",
  "input_schema": {...},
  "input_examples": [
    {"location": "San Francisco, CA", "unit": "fahrenheit"},
    {"location": "Tokyo, Japan", "unit": "celsius"},
    {"location": "New York, NY"}   # unit 선택적임을 보여줌
  ]
}
```

**제약사항:**
- 각 예시는 input_schema를 통과해야 함 (위반 시 400 에러)
- 서버 툴 (web_search 등)에는 미지원
- 토큰 비용: 단순 예시 ~20-50, 복잡한 중첩 ~100-200 토큰

---

## 4. tool_choice로 호출 제어

| 값 | 동작 |
|----|------|
| `auto` (기본) | Claude가 툴 호출 여부 결정 |
| `any` | 제공된 툴 중 하나 반드시 호출 |
| `{"type": "tool", "name": "..."}` | 특정 툴 강제 호출 |
| `none` | 툴 사용 금지 |

> `any` / `tool` 사용 시: 어시스턴트 메시지가 프리필되어 **tool_use 전 자연어 설명 없음**.
> 자연어 설명 원하면 `auto` + 유저 메시지에 "Use the X tool" 명시 권장.

**Extended Thinking 호환성**: `auto`, `none`만 지원. `any`, `tool` 강제 호출 불가.

**Claude Mythos Preview**: `any`, `tool` 미지원 (400 에러). `auto` 또는 `none`만 사용.

---

## 5. 모델 선택 가이드

| 상황 | 권장 모델 |
|------|---------|
| 복잡한 툴, 모호한 쿼리 | Opus 4.6 (멀티 툴 처리 우수, 파라미터 부족 시 명확화 요청) |
| 단순한 툴 | Haiku (단, 누락 파라미터 추론 가능성 있음) |

---

> [insight] "툴 설명이 가장 중요한 요소"라는 원칙은 하네스의 플러그인 등록 시스템 설계에 직접 영향을 미친다. 플러그인 개발자가 제출하는 툴 정의에서 description 품질을 검증하는 lint/review 단계가 필요하다. 설명이 빈약한 툴은 Claude가 잘못된 시점에 호출하거나 호출하지 않는다.

> [insight] 관련 작업을 단일 툴로 통합(action 파라미터)하는 패턴은 하네스의 플러그인 API 설계에서 중요하다. `create_event`, `list_events`, `delete_event` 대신 `calendar` 툴 + `action` enum으로 통합하면 툴 수가 줄어 토큰도 절약되고 Claude의 선택 정확도도 높아진다.

> [insight] `tool_choice: "any"` + `strict: true` 조합은 특정 작업에서 툴 호출과 스키마 준수를 동시에 보장한다. 하네스에서 구조화된 데이터 수집(폼 입력, 분류 태깅 등)이 필요한 에이전트에서 이 조합을 사용하면 출력 신뢰성이 극대화된다.

> [insight] `tool_choice` 변경이 prompt cache를 무효화한다. 동일한 툴 세트로 `auto`와 `tool` 사이를 자주 전환하는 에이전트는 캐시 효율이 떨어진다. 하네스에서 tool_choice를 동적으로 변경하는 로직은 캐시 비용 트레이드오프를 고려해야 한다.

> [insight] `input_examples` 필드는 서버 툴에 미지원이다. 하네스에서 web_search 같은 서버 툴을 활용할 때 예시 기반 가이드가 필요하다면 시스템 프롬프트나 description에 포함해야 한다.
