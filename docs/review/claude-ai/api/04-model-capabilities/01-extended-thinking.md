# Extended Thinking — 확장 사고 및 Adaptive Thinking

---

Claude 4.6에서는 **adaptive thinking** 권장. Manual mode(`type: "enabled"` + `budget_tokens`)는 deprecated.

---

## 1. Thinking 모드 비교

| 모드 | 설정 | 동작 | 상태 |
|------|------|------|------|
| **Adaptive** | `thinking: {type: "adaptive"}` | 동적 사고 여부/깊이 결정. effort로 제어 | **권장** (4.6) |
| **Manual (enabled)** | `thinking: {type: "enabled", budget_tokens: N}` | 고정 토큰 예산 내 사고 | deprecated (4.6) |
| **Disabled** | `thinking: {type: "disabled"}` | 사고 없음 | 기본값 (생략 시) |

### 모델별 지원

| 모델 | 권장 모드 | 비고 |
|------|----------|------|
| Opus 4.6 | adaptive | manual deprecated. interleaved 자동 |
| Sonnet 4.6 | adaptive | manual deprecated |
| Mythos Preview | adaptive (기본) | `disabled` 미지원. display 기본 `omitted` |
| Sonnet 3.7 | enabled (manual) | **전체 사고 출력** (요약 아님) |
| 기타 Claude 4 | enabled | 표준 |

---

## 2. 응답 구조

```json
{
  "content": [
    {
      "type": "thinking",
      "thinking": "Let me analyze this step by step...",
      "signature": "WaUjzkypQ2mUEVM36O2..."
    },
    { "type": "text", "text": "Based on my analysis..." }
  ]
}
```

- `thinking` 블록 → `text` 블록 순서
- `signature`: 암호화된 전체 사고. 멀티턴 연속성 유지용

---

## 3. Display 제어

| 값 | 동작 | 비용 | 레이턴시 |
|----|------|------|---------|
| `"summarized"` (기본, Claude 4) | 사고 요약 반환 | 전체 사고 토큰 과금 | 표준 |
| `"omitted"` (기본, Mythos) | thinking 필드 빈 문자열. signature만 반환 | **동일** (전체 과금) | **빠름** (TTFT 감소) |

- `omitted`는 비용 절감이 아닌 **레이턴시 절감** 전용
- 멀티턴 시 thinking 블록 그대로 전달 (signature로 복원)
- 턴 간 display 값 전환 가능

---

## 4. Interleaved Thinking

도구 호출 사이에 사고 블록 삽입 → 중간 결과 기반 추론.

```
Without interleaved:
[thinking] → [tool_use] → [tool_result] → [tool_use] → [text]
                                            (사고 없음)

With interleaved:
[thinking] → [tool_use] → [tool_result] → [thinking] → [tool_use] → [thinking] → [text]
                                           (결과 분석)               (최종 추론)
```

- Opus 4.6: adaptive 사용 시 **자동 활성화**
- 기타 Claude 4: `interleaved-thinking-2025-05-14` 베타 헤더 필요
- interleaved 시 `budget_tokens`가 `max_tokens` **초과 가능** (전체 사고 블록 합산)

---

## 5. Tool Use + Thinking 제약

### 핵심 규칙

1. **tool_choice 제한**: `auto` (기본) 또는 `none`만. `any`/named → 에러
2. **턴 중 thinking 토글 불가**: 전체 assistant 턴이 단일 thinking 모드
3. **tool use 루프 = 하나의 assistant 턴**: user → assistant[thinking+tool_use] → user[tool_result] → assistant[text] = 모두 같은 턴
4. **thinking 블록 보존 필수**: 마지막 assistant 메시지의 thinking 블록을 **그대로** 전달

### Graceful Degradation

mid-turn thinking 충돌 시 API가 **자동으로 thinking 비활성화** (에러 없음). 응답에 thinking 블록 존재 여부로 확인.

---

## 6. 과금

- **전체 사고 토큰 과금** (요약/생략과 무관)
- 응답에 보이는 토큰 수 ≠ 과금 토큰 수
- 예: 내부 사고 8,000 + 요약 500 → **과금 8,500**

---

## 7. Prompt Caching과의 관계

| 대상 | 캐시 동작 |
|------|----------|
| System prompt | thinking 파라미터 변경해도 **캐시 유지** |
| Messages | thinking 파라미터 변경 시 **캐시 무효화** |
| Thinking 블록 | tool use 연속 시 자동 캐시됨 (입력 토큰으로 계산) |

- 비tool_result user 메시지 추가 시 이전 thinking 블록 **컨텍스트에서 제거** (Opus 4.5+ 제외)
- 1시간 캐시 고려: thinking 작업은 5분 넘기기 쉬움

---

## 8. Best Practices

1. 대화 시작 시 thinking 전략 결정 (mid-turn 토글 피하기)
2. thinking 블록 완전 보존 + 그대로 전달
3. `budget_tokens` 시작점: 10,000. 복잡한 문제에서 증가
4. 스트리밍 사용으로 체감 레이턴시 감소
5. 1시간 캐시로 긴 thinking 세션 커버

> [insight] Extended thinking의 핵심 아키텍처: Claude 4 모델은 **요약된 사고**를 반환하고, 전체 사고는 `signature`에 암호화되어 있다. 멀티턴 시 이 signature를 그대로 전달해야 추론 연속성이 유지된다. 하네스에서 thinking 블록을 파싱하거나 수정하면 안 되고, 불투명 객체로 취급해야 한다.

> [insight] `display: "omitted"`는 비용이 아니라 **레이턴시만 절감**한다. 사용자에게 사고 과정을 보여줄 필요 없는 하네스에서는 omitted로 TTFT를 단축할 수 있지만, 과금은 동일하다는 점을 인지해야 한다.

> [insight] Tool use 루프 전체가 하나의 assistant 턴이라는 개념이 중요하다. thinking을 턴 중간에 토글하면 자동 비활성화된다. 하네스의 에이전틱 루프에서 도구 실행 중 thinking 설정을 변경하면 안 된다.

> [insight] Interleaved thinking이 adaptive에서 자동 활성화되므로, 하네스에서 adaptive thinking을 사용하면 도구 결과 후 자동으로 중간 추론이 일어난다. 이것이 에이전틱 코딩 품질 향상의 핵심 메커니즘.
