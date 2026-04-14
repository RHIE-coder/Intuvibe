# Effort

---

`output_config.effort`로 Claude의 토큰 사용량을 제어하는 파라미터. 응답 품질(thoroughness)과 토큰 효율(속도/비용) 사이의 트레이드오프를 단일 파라미터로 조정한다.

- beta 헤더 불필요, 일반 사용 가능
- 지원 모델: Claude Mythos Preview, Opus 4.6, Sonnet 4.6, Opus 4.5
- `effort: "high"` = 파라미터 생략과 동일 (기본값)

---

## 1. effort 레벨

| 레벨 | 설명 | 적합한 케이스 |
|------|------|--------------|
| `max` | 제약 없는 최대 능력 (Mythos Preview, Opus 4.6, Sonnet 4.6) | 최고 수준 추론/분석이 필요한 작업 |
| `high` | 높은 능력. 파라미터 생략과 동일 **(기본값)** | 복잡한 추론, 어려운 코딩, 에이전틱 태스크 |
| `medium` | 균형. 적당한 토큰 절약 | 속도·비용·성능 균형이 필요한 에이전틱 태스크 |
| `low` | 최고 효율. 상당한 토큰 절약, 일부 능력 저하 | 단순 태스크, 서브에이전트, 고속/저비용 워크로드 |

> effort는 strict 토큰 예산이 아닌 **behavioral signal**. 낮은 effort에서도 어려운 문제는 thinking하지만 양이 줄어든다.

---

## 2. 영향 범위

effort는 **모든 토큰**에 적용:
- 텍스트 응답 및 설명
- 툴 호출 및 함수 인자
- Extended thinking (활성화된 경우)

→ thinking 없이도 동작. 툴 호출 수 자체도 줄여 비용 제어 가능.

---

## 3. 기본 사용법

```python
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=4096,
    messages=[{"role": "user", "content": "..."}],
    output_config={"effort": "medium"},
)
```

---

## 4. Sonnet 4.6 권장 설정

Sonnet 4.6은 기본 `high`이나, 예상치 못한 레이턴시를 피하려면 **명시적 설정 권장**:

| 상황 | 권장 effort |
|------|------------|
| 대부분의 앱 (에이전틱 코딩, 툴 워크플로우, 코드 생성) | `medium` |
| 고볼륨/레이턴시 민감 (채팅, 비코딩) | `low` |
| Sonnet 4.6 최고 지능 필요 | `high` |
| 절대 최고 능력 | `max` |

---

## 5. 툴 사용 시 동작

| effort | 툴 호출 패턴 |
|--------|------------|
| 낮은 쪽 | 툴 호출 수 감소, 여러 작업 병합, 전문 없이 바로 실행, 간결한 완료 메시지 |
| 높은 쪽 | 툴 호출 증가, 실행 전 계획 설명, 변경사항 상세 요약, 코드 주석 포함 |

---

## 6. Extended Thinking과 조합

| 모델 | thinking 방식 | effort 역할 |
|------|--------------|------------|
| Mythos Preview | adaptive 기본 (`thinking` 설정 불필요) | thinking 깊이 제어 |
| Opus 4.6 | adaptive 권장 (`budget_tokens` deprecated) | thinking 깊이 제어 |
| Sonnet 4.6 | adaptive 권장 (manual interleaved는 deprecated) | thinking 깊이 제어 |
| Opus 4.5 등 | manual (`type: "enabled"`, `budget_tokens: N`) | 텍스트/툴 토큰 제어. thinking 예산은 별도 설정 |

thinking 없이도 사용 가능 — 텍스트 응답 + 툴 호출 토큰만 제어.

---

## 7. 베스트 프랙티스

1. **명시적 설정**: API 기본은 `high`지만, 모델/워크로드에 맞게 설정
2. **단순/속도 중요 태스크**: `low` 사용 — 응답 시간·비용 대폭 절감
3. **사용 케이스별 테스트**: 태스크 타입마다 효과가 다름
4. **동적 effort**: 태스크 복잡도에 따라 조정 (단순 쿼리 → `low`, 에이전틱 코딩 → `high`)

---

> [insight] effort는 하네스의 에이전트 역할(role)별 기본값으로 구성하기에 최적의 파라미터다. 오케스트레이터(계획·판단)는 `high`/`max`, 서브에이전트(단순 실행·조회)는 `low`/`medium`으로 고정하면 비용과 속도를 동시에 최적화할 수 있다.

> [insight] Sonnet 4.6은 명시적 effort 설정이 권장된다. 하네스에서 모델 설정을 다룰 때, Sonnet 4.6 기반 에이전트는 effort를 항상 명시하는 것이 예상치 못한 레이턴시를 방지하는 안전한 패턴이다.

> [insight] effort가 툴 호출 수 자체에 영향을 준다는 점은 하네스 설계에서 중요하다. `low` effort 서브에이전트는 자연스럽게 호출을 병합하고 줄이므로, 비용 민감한 파이프라인에서 에이전트 레벨에서 툴 사용을 제한하는 별도 로직 없이도 효율을 얻을 수 있다.

> [insight] thinking 없이도 effort가 동작한다는 점은 non-thinking 에이전트(빠른 라우팅, 분류, 포매팅 등)에도 동일한 비용 제어 인터페이스를 적용할 수 있다는 의미다. 하네스 전체에서 effort를 일관된 "비용 다이얼"로 추상화할 수 있다.
