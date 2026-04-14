# Structured Outputs in Agent SDK

---

에이전트 실행 결과를 JSON Schema로 정의된 형태로 반환. 멀티턴 툴 사용 후에도 검증된 구조화 데이터 획득.

---

## 1. 기본 사용

```python
schema = {
    "type": "object",
    "properties": {
        "company_name": {"type": "string"},
        "founded_year": {"type": "number"},
        "headquarters": {"type": "string"},
    },
    "required": ["company_name"],
}

async for message in query(
    prompt="Research Anthropic and provide key company information",
    options=ClaudeAgentOptions(
        output_format={"type": "json_schema", "schema": schema}
    ),
):
    if isinstance(message, ResultMessage) and message.structured_output:
        print(message.structured_output)
        # {'company_name': 'Anthropic', 'founded_year': 2021, ...}
```

`ResultMessage.structured_output` 필드에 검증된 데이터 포함.

---

## 2. 타입 안전 스키마 (Pydantic / Zod)

### Python (Pydantic)
```python
from pydantic import BaseModel

class Step(BaseModel):
    step_number: int
    description: str
    estimated_complexity: str  # 'low', 'medium', 'high'

class FeaturePlan(BaseModel):
    feature_name: str
    summary: str
    steps: list[Step]
    risks: list[str]

# JSON Schema 자동 생성
output_format={"type": "json_schema", "schema": FeaturePlan.model_json_schema()}

# 결과 파싱
plan = FeaturePlan.model_validate(message.structured_output)
```

### TypeScript (Zod)
```typescript
const FeaturePlan = z.object({
  feature_name: z.string(),
  steps: z.array(z.object({
    step_number: z.number(),
    estimated_complexity: z.enum(["low", "medium", "high"])
  })),
});

// JSON Schema 변환
const schema = z.toJSONSchema(FeaturePlan);

// 파싱
const parsed = FeaturePlan.safeParse(message.structured_output);
```

**장점**: 타입 추론, 런타임 검증, 더 나은 에러 메시지, 재사용 가능한 스키마

---

## 3. output_format 설정

```python
output_format={
    "type": "json_schema",  # 현재 지원 타입
    "schema": { ... }       # JSON Schema 객체
}
```

지원 JSON Schema 기능: 기본 타입, `enum`, `const`, `required`, 중첩 객체, `$ref` 정의

---

## 4. 에러 처리

| ResultMessage.subtype | 의미 |
|-----------------------|------|
| `success` | 스키마 검증 통과, `structured_output` 사용 가능 |
| `error_max_structured_output_retries` | 재시도 후에도 유효한 출력 생성 실패 |

```python
if isinstance(message, ResultMessage):
    if message.subtype == "success" and message.structured_output:
        plan = FeaturePlan.model_validate(message.structured_output)
    elif message.subtype == "error_max_structured_output_retries":
        print("구조화 출력 생성 실패")
```

### 에러 방지 팁
- 스키마는 최대한 단순하게 (과도한 중첩 required 필드 피하기)
- 정보 누락 가능성 있는 필드는 optional로
- 명확한 프롬프트 작성

---

> [insight] Agent SDK Structured Outputs는 하네스의 플러그인 결과 표준화 레이어에서 핵심 패턴이다. 플러그인이 자유 텍스트 대신 Pydantic/Zod 스키마로 결과를 정의하면, 하네스가 플러그인 출력을 파싱/검증 없이 직접 다음 단계(UI 렌더링, DB 저장, 다른 플러그인 입력)로 파이프라인할 수 있다. 플러그인 정의 스펙에 `output_schema` 필드를 표준으로 추가하는 것이 타당하다.

> [insight] `error_max_structured_output_retries` 처리는 하네스의 플러그인 안정성 보장에서 중요하다. 구조화 출력 실패 시 하네스가 자동으로 단순화된 폴백 스키마로 재시도하거나, 비구조화 텍스트 결과로 graceful degradation하는 전략을 플러그인 런타임 레이어에서 표준화하면 플러그인 개발자가 에러 핸들링을 별도로 구현할 필요가 없다.
