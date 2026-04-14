# Structured Outputs

---

Claude 응답을 특정 JSON 스키마에 맞게 강제하는 기능. constrained decoding(문법 기반 샘플링)으로 항상 유효한 JSON을 보장.

두 가지 보완 기능:
- **JSON outputs** (`output_config.format`): Claude 응답 자체를 JSON으로 포맷
- **Strict tool use** (`strict: true`): 툴 입력 파라미터를 스키마로 강제

둘을 동시에 사용 가능. beta 헤더 불필요.

> **지원 모델**: Mythos Preview, Opus 4.6, Sonnet 4.6, Sonnet 4.5, Opus 4.5, Haiku 4.5 (Vertex AI의 Mythos Preview 미지원)

> **beta 마이그레이션**: `output_format` → `output_config.format`, beta 헤더 불필요 (이전 방식도 전환 기간 동안 동작)

---

## 1. JSON Outputs

### 기본 사용

```python
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "..."}],
    output_config={
        "format": {
            "type": "json_schema",
            "schema": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "email": {"type": "string"},
                },
                "required": ["name", "email"],
                "additionalProperties": False,
            }
        }
    },
)
# 응답: response.content[0].text → 스키마에 맞는 JSON 문자열
```

### SDK 헬퍼 (권장)

| 언어 | 방식 |
|------|------|
| Python | Pydantic 모델 + `client.messages.parse()` → `response.parsed_output` |
| TypeScript | Zod 스키마 + `zodOutputFormat()` + `client.messages.parse()` → `response.parsed_output` |
| Java | Java 클래스 + `outputConfig(Class<T>)` → `StructuredMessage<T>` |
| Ruby | `Anthropic::BaseModel` 클래스 + `output_config: {format: Model}` → `message.parsed_output` |
| C#/Go/PHP | raw JSON schema |

```python
# Python Pydantic 예시
from pydantic import BaseModel
class ContactInfo(BaseModel):
    name: str
    email: str

response = client.messages.parse(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[...],
    output_format=ContactInfo,
)
contact = response.parsed_output
```

### SDK 자동 스키마 변환 (Python/TypeScript)

unsupported 제약 조건 자동 처리:
1. 미지원 제약(`minimum`, `maxLength` 등) 제거 → description에 "Must be at least 100" 형태로 추가
2. 모든 object에 `additionalProperties: false` 자동 추가
3. 지원되는 string format만 필터링
4. 응답을 원본 스키마(모든 제약 포함)로 검증

---

## 2. Strict Tool Use

`strict: true` → 툴 입력이 반드시 스키마를 따름. 상세 내용은 `05-tools/08-strict-tool-use.md` 참조.

---

## 3. 두 기능 함께 사용

```python
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[...],
    # 응답 포맷 제어
    output_config={"format": {"type": "json_schema", "schema": {...}}},
    # 툴 파라미터 제어
    tools=[{"name": "search_flights", "strict": True, "input_schema": {...}}],
)
```

---

## 4. JSON Schema 제한사항

### 지원
- 기본 타입: `object`, `array`, `string`, `integer`, `number`, `boolean`, `null`
- `enum` (string/number/bool/null만, 복합 타입 불가)
- `const`, `anyOf`, `allOf` (`allOf` + `$ref` 조합 불가)
- `$ref`, `$def`, `definitions` (외부 `$ref` 불가)
- `default`, `required`, `additionalProperties: false`
- String formats: `date-time`, `time`, `date`, `duration`, `email`, `hostname`, `uri`, `ipv4`, `ipv6`, `uuid`
- Array `minItems` (0 또는 1만)

### 미지원
- Recursive 스키마
- 외부 `$ref` (`'$ref': 'http://...'`)
- 수치 제약 (`minimum`, `maximum`, `multipleOf`)
- 문자열 제약 (`minLength`, `maxLength`)
- `additionalProperties: false` 외 값
- 지원 범위 초과 Array 제약

### Regex 지원/미지원
- 지원: `^...$`, `*`, `+`, `?`, `{n,m}`, `[]`, `.`, `\d`, `\w`, `\s`, `(...)`
- 미지원: 역참조(`\1`), lookahead/lookbehind, `\b`, `\B`, 복잡한 `{n,m}`

---

## 5. 스키마 복잡도 제한

| 제한 | 값 | 설명 |
|------|-----|------|
| Strict 툴 수 | 20개 | 요청당 `strict: true` 툴 최대 수 |
| Optional 파라미터 | 24개 | 모든 strict 스키마의 optional 파라미터 합계 |
| Union 타입 파라미터 | 16개 | `anyOf` 또는 배열 타입 파라미터 합계 |

컴파일 타임아웃: 180초. 초과 시 400 에러 "Schema is too complex for compilation."

**복잡도 줄이기:**
1. 필요한 툴만 strict 지정
2. optional → required 전환 최대화 (optional 1개가 grammar state space를 2배)
3. nested 구조 평탄화
4. 여러 요청/서브에이전트로 분리

---

## 6. 중요 고려사항

### Grammar 컴파일 및 캐싱
- 최초 요청 시 컴파일 추가 레이턴시
- 24시간 자동 캐시 (마지막 사용 기준)
- 캐시 무효화: 스키마 구조 변경, 툴 집합 변경 (`name`/`description`만 변경은 유지)

### Prompt 수정 및 토큰 비용
- 구조화 출력 사용 시 자동 추가 시스템 프롬프트 삽입 → 입력 토큰 증가
- `output_config.format` 변경 시 prompt cache 무효화

### 속성 순서
`required` 속성 → 선택적 속성 순으로 정렬됨 (스키마 정의 순서 아님). 순서가 중요하면 모든 속성을 `required`로.

### Invalid 출력 케이스
- `stop_reason: "refusal"` → 안전 거부 시 스키마 비준수 가능
- `stop_reason: "max_tokens"` → 불완전한 JSON 가능 → `max_tokens` 증가 필요

### 호환성
| 동작 | 미동작 |
|------|--------|
| Batch API (50% 할인 적용) | Citations |
| Streaming | Message Prefilling |
| Token counting | |
| JSON outputs + Strict tool use 동시 사용 | |

> **Grammar 범위**: 툴 호출 결과, thinking 태그에는 적용 안 됨. Claude 직접 출력에만 적용.

### 데이터 보존 (HIPAA 주의)
- JSON 스키마 자체: 24시간 캐시 (별도 저장, PHI 보호 비적용)
- **PHI를 스키마 property name, `enum`, `const`, `pattern`에 포함 금지**
- PHI는 메시지 content(프롬프트/응답)에만 포함

---

> [insight] Structured outputs는 에이전틱 파이프라인에서 에이전트 간 데이터 교환을 타입 안전하게 만드는 핵심 메커니즘이다. 하네스에서 에이전트 출력 → 다음 에이전트 입력으로 이어지는 체인을 구성할 때, JSON outputs로 에이전트 응답을 강제하고 strict tool use로 툴 파라미터를 강제하면 런타임 파싱 오류 없이 안정적인 파이프라인을 구성할 수 있다.

> [insight] Optional 파라미터 1개가 grammar state space를 2배로 늘린다는 점은 스키마 설계 원칙으로 직결된다. 하네스의 에이전트 출력 스키마는 "필요한 것만 optional로, 나머지는 required"로 설계해야 한다. 24개 optional 파라미터 제한도 고려하면, 복잡한 에이전트 출력은 여러 단계로 분리하는 것이 낫다.

> [insight] Grammar 캐시 무효화 조건이 명확하다: 스키마 구조 변경 또는 툴 집합 변경. 하네스에서 에이전트 스키마를 버전 관리할 때, 스키마 변경은 첫 요청에서 컴파일 레이턴시가 발생한다는 점을 배포 전략에 반영해야 한다.

> [insight] PHI를 JSON 스키마 자체(property name, enum, const, pattern)에 포함하면 HIPAA 보호를 받지 못한다. 하네스에서 의료/금융 도메인 에이전트를 구현할 때 스키마는 범용적으로, 실제 민감 데이터는 메시지 content에만 포함하는 아키텍처를 강제해야 한다.
