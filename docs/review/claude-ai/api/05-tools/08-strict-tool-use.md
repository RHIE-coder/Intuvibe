# Strict Tool Use

---

`strict: true` 설정으로 문법 제약 샘플링(grammar-constrained sampling)을 사용해 Claude의 툴 입력이 JSON Schema를 정확히 준수하도록 보장.

---

## 1. 적용 방법

```python
{
    "name": "get_weather",
    "description": "...",
    "strict": True,                          # ← 여기
    "input_schema": {
        "type": "object",
        "properties": { ... },
        "required": ["location"],
        "additionalProperties": False,       # ← 권장 (추가 필드 차단)
    }
}
```

**보장 사항:**
- `tool_use.input`이 `input_schema`를 항상 준수
- 툴 `name`이 항상 유효한 값
- 타입 불일치 없음 (`"2"` 대신 `2`, `"two"` 대신 `2`)

---

## 2. 사용 시점

- 툴 파라미터 검증이 필요할 때
- 에이전틱 워크플로우 (멀티스텝, 반복 호출)
- 타입 안전한 함수 호출 보장
- 중첩 속성이 있는 복잡한 툴

**예시**: 항공편 예약에서 `passengers: int` 필요
- strict 없음: `"two"` 또는 `"2"` 반환 가능
- strict 있음: 항상 `2` 반환 보장

---

## 3. JSON Schema 제한사항

Structured Outputs와 동일한 스키마 서브셋 사용. 제약: 24개 선택 파라미터, 16개 유니언 타입, 복잡도 한계. (`04-model-capabilities/05-structured-outputs.md` 참조)

---

## 4. 데이터 보존

- 스키마 컴파일 → 24시간 캐시 (마지막 사용 기준)
- HIPAA 대상: **input_schema에 PHI 포함 금지** (property name, enum 값, const 값, pattern regex)
- PHI는 메시지 content에만 포함 (프롬프트·응답은 HIPAA 보호 대상)

---

## 5. Extended Thinking 호환성

`strict: true`와 Extended Thinking 동시 사용 시 `tool_choice: auto` 또는 `none`만 가능. `any`, `tool` 강제 호출 불가.

---

> [insight] `strict: true` + `additionalProperties: false` 조합은 하네스의 프로덕션 에이전트 툴 정의 표준이어야 한다. 툴 실행 레이어에서 파라미터 검증·재시도 로직을 제거할 수 있어 코드가 단순해지고 에이전트 안정성이 높아진다.

> [insight] HIPAA 환경에서 input_schema에 PHI를 절대 포함하면 안 된다는 제약은 하네스의 헬스케어/의료 플러그인 설계에서 중요하다. 스키마는 구조만 정의하고, 실제 환자 데이터는 메시지 content로만 전달해야 한다.

> [insight] Structured Outputs와 동일한 문법 컴파일 파이프라인을 사용하므로 스키마가 24시간 캐시된다. 동일한 스키마를 반복 사용하는 배치 에이전트에서는 첫 번째 호출 이후 컴파일 오버헤드가 없어 응답 속도가 개선된다.

> [insight] `strict: true`를 `tool_choice: "any"` 또는 `"tool"`과 조합하면 "이 툴이 반드시 호출되고, 스키마를 정확히 준수한다"는 이중 보장을 얻을 수 있다. 하네스에서 데이터 수집·분류·태깅 에이전트처럼 출력 형식이 엄격하게 정의되어야 하는 경우 이 조합이 최적이다.
