# Context Windows

---

Claude의 "작업 메모리". 대화 중 참조 가능한 모든 텍스트 + 응답 자체 포함. 크다고 무조건 좋은 게 아님: 토큰 증가 시 정확도·리콜 저하 (*context rot*).

---

## 1. 컨텍스트 윈도우 크기

| 모델 | 컨텍스트 윈도우 |
|------|--------------|
| Claude Mythos Preview, Opus 4.6, Sonnet 4.6 | **1M 토큰** |
| Claude Sonnet 4.5, Sonnet 4, 기타 | **200k 토큰** |

이미지/PDF 단일 요청 한도: 1M 모델 600개, 200k 모델 100개 (토큰 한도 전 요청 크기 제한 도달 가능)

---

## 2. 컨텍스트 누적 방식

- **선형 증가**: 매 턴마다 이전 모든 대화 + 현재 메시지 누적
- **API 방식**: 이전 턴 완전 보존 (FIFO 없음; claude.ai 인터페이스는 FIFO 사용)
- **신규 모델 동작**: Sonnet 3.7+에서 컨텍스트 초과 시 자동 절단 대신 **검증 에러 반환**

---

## 3. Extended Thinking과 컨텍스트

**thinking 블록 자동 제거**: API가 이전 턴의 thinking 블록을 자동으로 컨텍스트에서 제외.
직접 제거 불필요. 단, 툴 사용 사이클 내에서는 thinking 블록 **필수 포함**.

**계산식**:
```
context_window = (input_tokens - previous_thinking_tokens) + current_turn_tokens
```

**툴 사용 + Extended Thinking 사이클**:
1. 턴1: 툴 설정 + 사용자 메시지 → (thinking + 텍스트 + tool_use) 출력
2. 턴2: 모든 턴1 블록 + tool_result (thinking 블록 **필수 포함**) → 텍스트만 출력
3. 턴3: thinking 블록 제외하고 이전 모든 것 + 새 user 메시지 → 새 thinking 생성

암호화 서명으로 thinking 블록 무결성 검증. 수정 시 API 에러.

---

## 4. Context Awareness (Sonnet 4.6, Sonnet 4.5, Haiku 4.5)

모델이 남은 토큰 예산을 실시간으로 인식하는 기능.

**작동 방식**:
```xml
<!-- 대화 시작 시 -->
<budget:token_budget>1000000</budget:token_budget>

<!-- 매 툴 호출 후 업데이트 -->
<system_warning>Token usage: 35000/1000000; 965000 remaining</system_warning>
```

**장점**: 남은 컨텍스트를 모르면 요리 경연에서 타이머 없이 경쟁하는 것과 같다. 예산 인식으로 끝까지 집중하여 실행.

---

## 5. 컨텍스트 관리 전략

| 전략 | 방식 | 사용 시점 |
|------|------|---------|
| Compaction | 서버 사이드 자동 요약 | 대화가 정기적으로 한도 근접할 때 (권장) |
| Context Editing | tool_result 제거, thinking 블록 제거 | 세밀한 제어 필요 시 |
| Token Counting API | 전송 전 토큰 수 추정 | 신규 모델에서 에러 방지 |

---

> [insight] Context rot 개념은 하네스 설계에서 핵심이다. 컨텍스트 윈도우를 최대한 채우는 것이 목표가 아니라, 현재 태스크에 관련된 정보만 유지하는 것이 목표다. 하네스에서 메모리 툴 + context editing을 조합해 "필요한 것만 컨텍스트에" 유지하는 전략이 필요하다.

> [insight] Sonnet 3.7+에서 컨텍스트 초과 시 자동 절단 대신 에러 반환으로 변경된 점은 하네스의 에이전트 루프에서 토큰 카운팅 필수화를 의미한다. 이전에는 조용히 절단되던 것이 이제 명시적 에러가 되므로, 하네스에서 각 요청 전 token counting API로 컨텍스트 사용량을 사전 검증하는 로직이 필요하다.

> [insight] Context Awareness (Sonnet 4.6, 4.5, Haiku 4.5)의 자동 토큰 예산 업데이트는 하네스의 에이전트 설계를 단순화한다. 이 모델들은 남은 컨텍스트를 스스로 인식하므로, "컨텍스트가 부족할 것 같으면 작업을 중단하라"는 시스템 프롬프트 없이도 자연스럽게 컨텍스트를 효율적으로 사용한다.

> [insight] Extended Thinking + 툴 사용 사이클에서 thinking 블록 필수 포함(턴2) 규칙은 하네스의 에이전트 루프 구현에서 쉽게 놓치는 함정이다. 툴 결과를 반환할 때 thinking 블록을 함께 포함하지 않으면 API 에러가 발생한다. 대화 히스토리 관리 로직에서 이 케이스를 별도 처리해야 한다.
