# Troubleshooting Tool Use

---

툴 사용 시 발생하는 일반적인 오류의 증상→원인→해결책 테이블.

---

## 1. 잘못된 툴 호출

| 증상 | 원인 | 해결 |
|------|------|------|
| 툴 A 대신 툴 B 호출 | 설명 모호성 | 툴 설명에서 "언제" 사용하는지를 차별화 (`define-tools` 참조) |
| 툴을 전혀 호출 안 함 | 이름 충돌 또는 지나치게 일반적인 스키마 | 중복 이름 확인, `input_examples` 추가 |
| 파라미터 타입 오류 | 모호한 스키마에서 추측 | `strict: true` 추가 또는 `input_examples` 추가 |

---

## 2. 없는 파라미터 생성

| 증상 | 원인 | 해결 |
|------|------|------|
| 스키마에 없는 파라미터 반환 | strict 모드 없음 | `strict: true` 추가 |
| enum 범위 밖의 값 반환 | strict 모드 없음 또는 enum이 너무 큼 | enum 축소 또는 `input_examples` 추가 |

---

## 3. 병렬 호출 미작동

| 증상 | 원인 | 해결 |
|------|------|------|
| 순차 호출 | 메시지 히스토리 포맷 오류 | 모든 `tool_result`를 **하나의** user 메시지로 전송 |
| `disable_parallel_tool_use` 무시됨 | 너무 늦게 설정 | `tool_use`를 반환하는 요청에 설정해야 함 |

---

## 4. 캐시 무효화 반복

| 증상 | 원인 | 해결 |
|------|------|------|
| 매 요청이 캐시 미스 | `tool_choice`가 요청마다 변경됨 | `tool_choice` 안정화 또는 변경 지점 전에 캐시 브레이크포인트 |
| 툴 추가 시 캐시 파괴 | 툴이 배열 앞에 삽입됨 | `defer_loading: true` + Tool Search로 인라인 추가 |

---

## 5. 요청 시 에러

| 에러 | 원인 | 해결 |
|------|------|------|
| `tool_use ids were found without tool_result blocks immediately after` | tool_result 누락 또는 순서 오류 | 모든 tool_use에 대응하는 tool_result 반환, tool_result를 content 배열 맨 앞에 배치 |
| `Input schema is not compatible with strict mode: string patterns are not supported` | strict 모드에서 `pattern` 키워드 사용 | pattern 제거 또는 strict 비활성화 |
| `All tools have defer_loading: true` | 즉시 로드 툴 없음 | 최소 1개 툴은 즉시 로드 필요, tool_search 자체는 defer_loading 불가 |

---

## 6. JSON 이스케이핑 차이 (Opus 4.6+)

| 증상 | 원인 | 해결 |
|------|------|------|
| 툴 입력 문자열 비교 실패 | 모델 버전별 Unicode/슬래시 이스케이핑 차이 | `json.loads()` / `JSON.parse()`로 파싱. 직렬화된 입력에 raw 문자열 매칭 금지 |

---

> [insight] "tool_result를 content 배열 맨 앞에 배치"와 "모든 tool_result를 하나의 user 메시지로"는 하네스의 툴 결과 조합 레이어에서 가장 자주 실수하는 규칙이다. 이 두 규칙을 강제하는 헬퍼 함수를 만들어 모든 에이전트에서 일관되게 사용해야 한다.

> [insight] "Opus 4.6+에서 JSON 이스케이핑이 달라졌다"는 점은 하네스가 모델 버전을 업그레이드할 때 주의해야 할 호환성 이슈다. 툴 입력 처리 레이어는 절대 raw 문자열 비교를 하지 않고 항상 JSON 파싱을 거쳐야 한다. 이를 테스트하는 회귀 테스트를 모델 업그레이드 파이프라인에 포함해야 한다.

> [insight] `defer_loading: true` 없이 툴을 추가하면 캐시가 파괴된다는 점은 하네스의 동적 툴 등록 시스템 설계에서 핵심이다. 플러그인을 동적으로 활성화·비활성화하는 기능이 있다면, 반드시 Tool Search + defer_loading 패턴으로 구현해야 캐시 효율을 유지할 수 있다.
