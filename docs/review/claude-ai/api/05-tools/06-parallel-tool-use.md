# Parallel Tool Use

---

Claude가 단일 턴에서 여러 툴을 동시에 호출하는 기능. 메시지 히스토리 포맷과 비활성화 방법 포함.

---

## 1. 병렬 비활성화

```python
# tool_choice: auto → 최대 1개 툴 사용
tool_choice={"type": "auto", "disable_parallel_tool_use": True}

# tool_choice: any/tool → 정확히 1개 툴 사용
tool_choice={"type": "any", "disable_parallel_tool_use": True}
```

---

## 2. 병렬 tool_result 포맷 (핵심 규칙)

**모든 tool_result를 하나의 user 메시지에 담아야 함.**

```json
// ❌ 잘못된 방식 (병렬 호출 억제됨)
[
  {"role": "assistant", "content": [tool_use_1, tool_use_2]},
  {"role": "user", "content": [tool_result_1]},
  {"role": "user", "content": [tool_result_2]}  // 별도 메시지
]

// ✅ 올바른 방식
[
  {"role": "assistant", "content": [tool_use_1, tool_use_2]},
  {"role": "user", "content": [tool_result_1, tool_result_2]}  // 단일 메시지
]
```

---

## 3. 병렬 호출 극대화 프롬프팅

### 시스템 프롬프트 (Claude 4 모델)
```text
For maximum efficiency, whenever you need to perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially.
```

### 더 강한 버전
```xml
<use_parallel_tool_calls>
For maximum efficiency, whenever you perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially. Prioritize calling tools in parallel whenever possible. When running multiple read-only commands like `ls` or `list_dir`, always run all of the commands in parallel. Err on the side of maximizing parallel tool calls rather than running too many tools sequentially.
</use_parallel_tool_calls>
```

### 유저 메시지
```text
// 덜 효과적
"What's the weather in Paris? Also check London."

// 더 효과적
"Check the weather in Paris and London simultaneously."
"Please use parallel tool calls to get the weather for Paris, London, and Tokyo at the same time."
```

---

## 4. 병렬 호출 동작 확인

```python
# 메시지당 평균 툴 호출 수 측정
tool_call_messages = [m for m in messages if any(b.type == "tool_use" for b in m.content)]
total = sum(len([b for b in m.content if b.type == "tool_use"]) for m in tool_call_messages)
avg = total / len(tool_call_messages) if tool_call_messages else 0.0
# avg > 1.0 이면 병렬 호출 작동 중
```

---

## 5. 트러블슈팅

| 문제 | 원인 | 해결 |
|------|------|------|
| 병렬 호출 안 됨 | tool_result를 별도 메시지로 분리 | 단일 메시지로 통합 |
| 병렬 호출 안 됨 | 프롬프팅 부족 | 강한 system prompt 추가 |
| 병렬 호출 확인 불가 | 측정 로직 없음 | avg tools/message 측정 |

---

> [insight] tool_result를 별도 user 메시지로 보내면 Claude가 다음 턴에서 병렬 호출을 하지 않도록 "학습"된다. 하네스의 툴 실행 레이어에서 이 포맷 규칙을 강제하지 않으면 대화가 진행될수록 병렬 효율이 떨어지는 현상이 발생한다.

> [insight] 병렬 툴 호출 극대화 프롬프트(XML 태그 버전)는 하네스의 고성능 에이전트에서 시스템 프롬프트 표준으로 포함할 가치가 있다. 특히 파일 읽기, 검색, 데이터 페치 등 독립적인 I/O 작업이 많은 에이전트에서 레이턴시를 크게 줄일 수 있다.

> [insight] `avg_tools_per_message > 1.0` 측정은 하네스의 에이전트 성능 모니터링 메트릭으로 추가해야 한다. 이 값이 낮아지면 포맷 버그나 프롬프트 문제를 나타내는 신호이므로, 배치 처리나 멀티스텝 에이전트의 효율성 저하를 조기 감지할 수 있다.

> [insight] `disable_parallel_tool_use: true`는 순차 의존성이 있는 작업(이전 결과로 다음 호출 결정)에서 유용하다. 하네스에서 에이전트 유형별로 병렬/순차 모드를 선택 가능하게 설계하면, 독립 태스크는 병렬로 속도를 높이고 의존 태스크는 순차로 정확성을 보장할 수 있다.
