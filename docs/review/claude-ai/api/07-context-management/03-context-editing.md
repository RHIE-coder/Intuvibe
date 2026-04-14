# Context Editing

---

대화 히스토리에서 특정 콘텐츠를 선택적으로 제거하는 세밀한 컨텍스트 관리. Compaction이 전체 요약이라면, Context Editing은 특정 블록만 제거.

- 베타 헤더: `context-management-2025-06-27`
- ZDR: ✅ 지원
- 서버 사이드 처리: 클라이언트 상태 변경 불필요

> 대부분의 경우 server-side compaction이 우선 권장. Context Editing은 더 세밀한 제어가 필요할 때 사용.

---

## 1. 전략 종류

| 전략 | 타입 | 용도 |
|------|------|------|
| Tool result clearing | `clear_tool_uses_20250919` | 툴 결과 제거 (에이전틱 워크플로우) |
| Thinking block clearing | `clear_thinking_20251015` | thinking 블록 제거 (Extended Thinking 관리) |
| Client-side compaction | SDK | 클라이언트 SDK 기반 요약 (서버 compaction 선호) |

---

## 2. Tool Result Clearing

오래된 tool_result를 자동 제거. 제거된 자리에 placeholder 텍스트 삽입 (Claude가 제거됐음을 인지).

```python
context_management={
    "edits": [{
        "type": "clear_tool_uses_20250919",
        "trigger": {"type": "input_tokens", "value": 30000},  # 임계값
        "keep": {"type": "tool_uses", "value": 3},            # 최근 3개 보존
        "clear_at_least": {"type": "input_tokens", "value": 5000},  # 최소 5k 토큰 제거
        "clear_tool_inputs": True,                             # tool_use 파라미터도 제거
        "exclude_tools": ["web_search"]                        # 특정 툴 제외
    }]
}
```

### 파라미터

| 파라미터 | 기본값 | 설명 |
|---------|--------|------|
| `trigger` | 없음 | 제거 시점 (input_tokens 임계값) |
| `keep` | 없음 | 최근 N개 tool_use 보존 |
| `clear_at_least` | 없음 | 최소 제거 토큰 수 (캐시 무효화 가치 확보) |
| `clear_tool_inputs` | `false` | tool_use 파라미터도 함께 제거 |
| `exclude_tools` | `[]` | 제거 대상에서 제외할 툴 이름 목록 |

**캐시 영향**: tool_result 제거 시 캐시 prefix 무효화. `clear_at_least`로 최소 제거량을 설정해 캐시 무효화 비용 대비 가치 확보.

---

## 3. Thinking Block Clearing

Extended Thinking 활성화 시 thinking 블록 관리.

**기본 동작** (전략 미설정 시): 마지막 어시스턴트 턴의 thinking 블록만 유지 (= `keep: {type: "thinking_turns", value: 1}`)

```python
context_management={
    "edits": [{
        "type": "clear_thinking_20251015",
        "keep": {"type": "thinking_turns", "value": 2}  # 최근 2턴 thinking 보존
    }]
}
```

**`keep` 설정 옵션**:
- `{"type": "thinking_turns", "value": N}`: 최근 N 어시스턴트 턴의 thinking 보존 (N > 0)
- `"all"`: 모든 thinking 블록 보존 (캐시 히트 최대화)

**캐시 영향**:
- thinking 블록 **유지** 시 → 캐시 보존 (캐시 히트)
- thinking 블록 **제거** 시 → 제거 지점에서 캐시 무효화

---

## 4. 전략 조합

thinking + tool result 두 전략 동시 사용 가능. **`clear_thinking_20251015`를 `edits` 배열에서 반드시 먼저 나열**:

```python
context_management={
    "edits": [
        {
            "type": "clear_thinking_20251015",  # 첫 번째
            "keep": {"type": "thinking_turns", "value": 2}
        },
        {
            "type": "clear_tool_uses_20250919",  # 두 번째
            "trigger": {"type": "input_tokens", "value": 50000},
            "keep": {"type": "tool_uses", "value": 5}
        }
    ]
}
```

---

## 5. 서버 사이드 처리 특성

Context Editing은 **서버에서 적용**되고 클라이언트는 원본 전체 히스토리를 유지. 클라이언트 상태를 서버 편집 버전과 동기화할 필요 없음.

---

> [insight] Context Editing의 서버 사이드 처리는 하네스 구현을 크게 단순화한다. 클라이언트에서 오래된 tool_result를 찾아 수동 제거하는 복잡한 로직 없이, `context_management` 파라미터 하나로 API가 알아서 처리한다. 클라이언트는 항상 전체 히스토리를 유지하면 된다.

> [insight] `exclude_tools`는 하네스의 하이브리드 컨텍스트 관리 전략에서 핵심이다. web_search 결과처럼 항상 보존해야 하는 인용 정보는 `exclude_tools`로 보호하고, 파일 내용이나 코드 실행 결과처럼 처리 후 불필요한 툴 결과만 제거하는 세밀한 정책이 가능하다.

> [insight] `clear_at_least` 파라미터는 하네스의 비용 최적화에서 중요하다. 캐시 무효화가 발생할 때 최소한의 토큰을 제거해야 캐시 재작성 비용(25% 추가)을 상쇄할 수 있다. 제거량이 너무 적으면 캐시 무효화 비용만 발생하고 절약이 없다.

> [insight] Thinking block clearing에서 `keep: "all"`은 캐시 히트를 최대화하지만 컨텍스트를 많이 사용하고, `keep: {value: 1}`은 컨텍스트를 절약하지만 캐시 효율이 낮다. 하네스에서 Extended Thinking + 긴 대화 조합 시 reasoning 연속성과 캐시 비용 사이의 트레이드오프를 설정으로 조절 가능하다.
