# Compaction

---

긴 대화가 컨텍스트 한도에 접근할 때 서버 사이드에서 자동 요약. 통합 작업 최소화로 장기 대화 지원.

- 베타 헤더: `compact-2026-01-12`
- ZDR: ✅ 지원
- 지원 모델: Claude Mythos Preview, Opus 4.6, Sonnet 4.6

---

## 1. 작동 방식

1. 입력 토큰이 트리거 임계값 초과 감지
2. 현재 대화 요약 생성
3. 응답 앞에 `compaction` 블록 포함
4. 다음 요청 시 compaction 블록 이전 메시지 자동 무시

---

## 2. 파라미터

| 파라미터 | 타입 | 기본값 | 설명 |
|---------|------|--------|------|
| `type` | string | 필수 | `"compact_20260112"` |
| `trigger` | object | 150,000 토큰 | 트리거 시점 (최소 50,000) |
| `pause_after_compaction` | boolean | `false` | 요약 후 일시정지 여부 |
| `instructions` | string | `null` | 커스텀 요약 프롬프트 (기본 프롬프트 완전 대체) |

---

## 3. 기본 사용법

```python
response = client.beta.messages.create(
    betas=["compact-2026-01-12"],
    model="claude-opus-4-6",
    max_tokens=4096,
    messages=messages,
    context_management={"edits": [{"type": "compact_20260112"}]},
)
# compaction 블록 포함한 전체 응답을 그대로 다음 요청에 포함
messages.append({"role": "assistant", "content": response.content})
```

---

## 4. 트리거 설정

```python
context_management={
    "edits": [{
        "type": "compact_20260112",
        "trigger": {"type": "input_tokens", "value": 100000}
    }]
}
```

---

## 5. 커스텀 요약 지시문

기본 프롬프트:
```text
You have written a partial transcript for the initial task above. Please write a summary of the transcript...
You must wrap your summary in a <summary></summary> block.
```

커스텀 지시문으로 **완전 대체**:
```python
"instructions": "Focus on preserving code snippets, variable names, and technical decisions."
```

---

## 6. pause_after_compaction

`pause_after_compaction: true` 시 요약 생성 후 `stop_reason: "compaction"` 반환. 추가 콘텐츠 주입 후 계속 진행 가능.

```python
if response.stop_reason == "compaction":
    messages.append({"role": "assistant", "content": response.content})
    # 추가 콘텐츠 주입 가능
    response = client.beta.messages.create(...)  # 계속 진행
```

### 총 토큰 예산 집행

```python
TRIGGER_THRESHOLD = 100_000
TOTAL_TOKEN_BUDGET = 3_000_000
n_compactions = 0

if response.stop_reason == "compaction":
    n_compactions += 1
    if n_compactions * TRIGGER_THRESHOLD >= TOTAL_TOKEN_BUDGET:
        messages.append({"role": "user", "content": "Please wrap up your current work and summarize the final state."})
```

---

## 7. compaction 블록 응답 구조

```json
{
  "content": [
    {"type": "compaction", "content": "Summary of the conversation..."},
    {"type": "text", "text": "Based on our conversation so far..."}
  ]
}
```

**규칙**: compaction 블록 이전의 모든 메시지는 API가 자동 무시. 원본 메시지 유지 또는 수동 제거 모두 가능.

---

## 8. 스트리밍

compaction 블록은 스트리밍 시 단일 `compaction_delta`로 전달 (중간 스트리밍 없음):
- `content_block_start` → `content_block_delta` (전체 요약 한번에) → `content_block_stop`

---

> [insight] Compaction은 하네스의 장기 에이전트 실행에서 "컨텍스트 관리 자동화"의 핵심이다. 클라이언트에서 수동으로 오래된 tool_result를 제거하는 대신, compaction이 서버에서 자동으로 전체 대화를 요약한다. 최소한의 통합 코드(messages에 응답 그대로 append)로 컨텍스트 한도를 사실상 무제한으로 확장 가능.

> [insight] 커스텀 `instructions`로 요약 프롬프트를 완전 대체할 수 있다는 점은 하네스의 도메인별 에이전트 설계에서 중요하다. 코딩 에이전트는 "코드 스니펫과 변수명 보존"을, 리서치 에이전트는 "핵심 발견 사항과 출처 보존"을 지시하는 방식으로 요약 품질을 태스크에 맞게 최적화할 수 있다.

> [insight] `pause_after_compaction` + 총 토큰 예산 패턴은 하네스에서 비용 제어 메커니즘으로 중요하다. 무한정 실행될 수 있는 에이전트에 `n_compactions * TRIGGER_THRESHOLD >= TOTAL_TOKEN_BUDGET` 체크를 추가하면 예산 초과 없이 graceful하게 작업을 마무리할 수 있다.

> [insight] compaction 블록은 다음 요청 시 이전 메시지를 자동 무시하도록 API가 처리한다. 하네스에서 대화 히스토리 관리 로직이 단순화된다 — 전체 응답을 그대로 messages에 append하기만 하면 되고, 수동으로 오래된 메시지를 제거할 필요가 없다.
