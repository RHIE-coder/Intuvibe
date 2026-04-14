# Agent SDK Sessions

---

세션 = 에이전트가 작업하면서 쌓인 대화 히스토리(프롬프트, 툴 호출, 결과, 응답). 디스크에 자동 저장. 세션 ≠ 파일시스템 (파일 변경 롤백은 file checkpointing 별도).

---

## 1. 접근 방식 선택

| 상황 | 방법 |
|------|------|
| 단일 프롬프트, 후속 없음 | 추가 설정 불필요 |
| 단일 프로세스 멀티턴 | Python: `ClaudeSDKClient` / TS: `continue: true` |
| 프로세스 재시작 후 재개 | `continue_conversation=True` / `continue: true` |
| 특정 과거 세션 재개 | session_id 캡처 후 `resume` |
| 원본 유지하며 다른 방향 탐색 | `fork_session=True` |
| 디스크 저장 없음 (TS only) | `persistSession: false` |

---

## 2. 자동 세션 관리

### Python: `ClaudeSDKClient`

```python
async with ClaudeSDKClient(options=options) as client:
    await client.query("auth 모듈 분석해줘")
    async for message in client.receive_response():
        ...

    # 같은 세션 자동 계속
    await client.query("이제 JWT로 리팩토링해줘")
    async for message in client.receive_response():
        ...
```

### TypeScript: `continue: true`

```typescript
// 첫 번째 쿼리
for await (const message of query({ prompt: "auth 모듈 분석", options: {...} })) {...}

// 최근 세션 자동 재개
for await (const message of query({
  prompt: "이제 JWT로 리팩토링",
  options: { continue: true, allowedTools: [...] }
})) {...}
```

---

## 3. 수동 session_id 관리

### session_id 캡처
```python
# Python: ResultMessage에서
if isinstance(message, ResultMessage):
    session_id = message.session_id

# TypeScript: SystemMessage init 또는 ResultMessage에서
if (message.type === "system" && message.subtype === "init"):
    sessionId = message.session_id
```

### resume (특정 세션 재개)
```python
options=ClaudeAgentOptions(
    resume=session_id,
    allowed_tools=[...],
)
```

### fork (원본 유지, 새 분기 탐색)
```python
options=ClaudeAgentOptions(
    resume=session_id,
    fork_session=True,
)
# 반환된 ResultMessage.session_id = 새 fork 세션 ID
# 원본 session_id는 그대로 유지
```

---

## 4. 세션 파일 위치

```
~/.claude/projects/<encoded-cwd>/<session-id>.jsonl
```
`<encoded-cwd>`: 절대 경로의 비알파뉴메릭 문자 → `-` 치환. resume 실패 시 cwd 불일치가 주요 원인.

**크로스 호스트**: 세션 파일 이동 + 동일 cwd 경로 복원 필요. 또는 결과를 새 프롬프트에 포함하는 stateless 방식이 더 견고.

---

## 5. 세션 유틸리티 함수

- `list_sessions()` / `listSessions()`: 세션 목록
- `get_session_messages()` / `getSessionMessages()`: 세션 메시지 읽기
- `get_session_info()` / `getSessionInfo()`: 세션 정보
- `rename_session()` / `renameSession()`: 이름 변경
- `tag_session()` / `tagSession()`: 태그 추가

---

> [insight] `fork_session` + 특정 세션 재개 패턴은 하네스의 에이전트 실험 환경에서 핵심이다. 사용자가 "이 방식 대신 저 방식으로 해보자"고 할 때, 원본 분석 컨텍스트를 잃지 않고 두 가지 접근법을 병렬로 탐색할 수 있다. 하네스에서 A/B 에이전트 전략 테스트나 멀티팜 실험 설계에 직접 활용 가능한 기능이다.

> [insight] 세션 파일 위치(`~/.claude/projects/<encoded-cwd>`)와 cwd 인코딩 방식을 이해하는 것은 하네스의 멀티테넌트 아키텍처에서 중요하다. 사용자별로 다른 cwd를 설정하면 세션이 자동으로 격리되므로, 하네스에서 사용자 격리를 파일시스템 경로 전략만으로 구현할 수 있다. CI/CD 환경에서는 크로스 호스트 세션 이동 대신 결과를 애플리케이션 상태로 추출하는 stateless 패턴이 더 안정적이다.
