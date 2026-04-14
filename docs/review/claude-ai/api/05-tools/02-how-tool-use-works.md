# How Tool Use Works

---

툴 사용의 핵심 계약: 개발자가 스키마와 실행을 책임지고, Claude는 언제/어떻게 호출할지를 결정. 모델은 절대 직접 실행하지 않음.

---

## 1. 툴 실행 위치: 3가지 버킷

### User-defined Tools (클라이언트 실행)
- 개발자가 스키마 작성 + 코드 실행 + 결과 반환
- Claude → `tool_use` block 반환 → 개발자 코드 실행 → `tool_result` 전달
- 전체 툴 트래픽의 대부분 차지

### Anthropic-schema Tools (클라이언트 실행)
- Anthropic이 스키마 정의, 개발자가 실행
- 해당 툴: `bash`, `text_editor`, `computer`, `memory`
- 실행 모델은 user-defined와 동일
- **이점**: 이 스키마들은 수천 번의 성공 궤적으로 훈련됨 → 더 안정적인 호출, 더 나은 에러 복구

### Server-executed Tools (서버 실행)
- Anthropic 인프라에서 실행: `web_search`, `web_fetch`, `code_execution`, `tool_search`
- 개발자가 `tool_result` 구성 불필요 — 응답 수신 시 이미 완료
- 응답에 `server_tool_use` block 포함 (실행 결과 확인용)

---

## 2. 에이전틱 루프 (클라이언트 툴)

```python
while True:
    response = client.messages.create(...)
    
    if response.stop_reason == "tool_use":
        # tool_use blocks 추출 → 각 툴 실행 → tool_result 구성
        # 새 요청: [원본 메시지 + 어시스턴트 응답 + tool_result]
        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})
    else:
        break  # "end_turn", "max_tokens", "stop_sequence", "refusal"
```

루프 종료 조건: `stop_reason`이 `"tool_use"` 외 모든 값.

---

## 3. 서버 사이드 루프

서버 툴은 Anthropic 인프라 내에서 자체 루프 실행. 단일 요청이 여러 번의 검색/실행을 내부적으로 반복 가능.

- **반복 한도 도달 시**: `stop_reason: "pause_turn"` 반환
- 처리: 대화 전체(pause 응답 포함)를 재전송 → 이어서 계속

---

## 4. 툴 사용이 적합한 경우 vs 아닌 경우

**적합:**
- 부수 효과가 있는 액션 (이메일 전송, 파일 쓰기, DB 업데이트)
- 최신/외부 데이터 필요 (현재 가격, 날씨, DB 내용)
- 구조화된 출력 보장 필요 (특정 JSON 스키마 강제)
- 기존 시스템 연결 (DB, 내부 API, 파일 시스템)

> **신호**: 모델 출력을 regex로 파싱하고 있다면 → 그 결정은 tool call이었어야 함

**부적합:**
- 훈련 데이터로 답 가능한 질문 (요약, 번역, 일반 상식)
- 부수 효과 없는 일회성 Q&A
- 툴 호출 레이턴시가 작업 자체보다 큰 경우

---

## 5. 접근법 선택 요약

| 접근법 | 사용 시점 |
|--------|---------|
| User-defined client tools | 커스텀 비즈니스 로직, 내부 API, 전용 데이터 |
| Anthropic-schema client tools | 표준 개발 작업 (bash, 파일 편집, 브라우저 제어) |
| Server-executed tools | 웹 검색, 코드 샌드박스, 웹 fetch |

---

> [insight] "regex로 모델 출력을 파싱하고 있다면 그 결정은 tool call이었어야 한다"는 원칙은 하네스 설계에서 매우 중요하다. 에이전트 출력에서 구조화된 의사결정을 추출할 때는 항상 tool use 또는 structured outputs를 사용해야 하며, 텍스트 파싱에 의존하는 에이전트 로직은 리팩토링 신호다.

> [insight] `pause_turn`은 하네스의 서버 툴 통합에서 반드시 처리해야 하는 stop_reason이다. 단순히 `end_turn`만 체크하는 루프는 서버 툴의 장시간 실행 태스크에서 불완전한 결과를 반환할 수 있다. `pause_turn` → 재전송 패턴을 에이전트 루프에 포함해야 한다.

> [insight] Anthropic-schema 툴(`bash`, `text_editor`, `computer`, `memory`)이 "수천 번의 성공 궤적으로 훈련되었다"는 점은 하네스에서 표준 작업에 커스텀 스키마 대신 Anthropic 제공 스키마를 우선 사용해야 함을 의미한다. 동일한 기능이라도 훈련된 스키마가 훨씬 안정적이다.

> [insight] 에이전틱 루프에서 `stop_reason` 케이스를 모두 처리해야 한다: `end_turn`(정상), `max_tokens`(토큰 초과), `stop_sequence`(정지 시퀀스), `refusal`(거절), `pause_turn`(서버 툴 일시중단). 하네스의 에이전트 실행 엔진은 각 케이스마다 다른 처리 로직이 필요하다.
