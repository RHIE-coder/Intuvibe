# File Checkpointing in Agent SDK

---

에이전트 세션 중 Write/Edit/NotebookEdit 툴로 변경된 파일을 추적하고, 특정 시점으로 복원.

**활용**: 변경 취소, 대안 탐색, 오류 복구

**주의**: Bash 명령(`echo >`, `sed -i` 등)으로 변경된 파일은 추적 안 됨.

---

## 1. 추적 대상 툴

| 툴 | 설명 |
|----|------|
| `Write` | 파일 생성/덮어쓰기 |
| `Edit` | 파일 일부 편집 |
| `NotebookEdit` | Jupyter `.ipynb` 셀 수정 |

**체크포인트 범위**: 세션 내 생성 파일(→ 복원 시 삭제) + 수정 파일(→ 원본 내용으로 복원)  
**대화 내역은 복원 안 됨** — 파일만 되돌림.

---

## 2. 활성화 옵션

| 옵션 | Python | TypeScript |
|------|--------|------------|
| 체크포인팅 활성화 | `enable_file_checkpointing=True` | `enableFileCheckpointing: true` |
| UUID 수신 | `extra_args={"replay-user-messages": None}` | `extraArgs: {"replay-user-messages": null}` |

`replay-user-messages` 없이는 `message.uuid`가 undefined → 복원 불가.

---

## 3. 기본 패턴 (전체 흐름)

```python
# 1. 옵션 설정
options = ClaudeAgentOptions(
    enable_file_checkpointing=True,
    permission_mode="acceptEdits",
    extra_args={"replay-user-messages": None},
)

checkpoint_id = None
session_id = None

# 2. 실행 + UUID 캡처
async with ClaudeSDKClient(options) as client:
    await client.query("Refactor the authentication module")
    async for message in client.receive_response():
        if isinstance(message, UserMessage) and message.uuid and not checkpoint_id:
            checkpoint_id = message.uuid      # 첫 UserMessage UUID = 초기 상태
        if isinstance(message, ResultMessage):
            session_id = message.session_id

# 3. 세션 재개 후 복원
async with ClaudeSDKClient(
    ClaudeAgentOptions(enable_file_checkpointing=True, resume=session_id)
) as client:
    await client.query("")  # 빈 프롬프트로 연결 오픈
    async for message in client.receive_response():
        await client.rewind_files(checkpoint_id)
        break
```

CLI 복원도 가능:
```bash
claude -p --resume <session-id> --rewind-files <checkpoint-uuid>
```

---

## 4. 패턴 변형

### 위험 작업 전 즉시 복원 (스트림 내)
```python
async for message in client.receive_response():
    if isinstance(message, UserMessage) and message.uuid:
        safe_checkpoint = message.uuid  # 매 턴마다 갱신 (최신 유지)
    if your_revert_condition and safe_checkpoint:
        await client.rewind_files(safe_checkpoint)
        break  # 즉시 복원 후 루프 탈출
```

### 다중 복원 지점 (중간 상태로 롤백)
```python
checkpoints = []
async for message in client.receive_response():
    if isinstance(message, UserMessage) and message.uuid:
        checkpoints.append(Checkpoint(id=message.uuid, description=f"턴 {len(checkpoints)+1}"))
# 이후: checkpoints[0]으로 초기, checkpoints[N]으로 중간 상태 복원 가능
```

---

## 5. 제한사항

| 제한 | 설명 |
|------|------|
| Bash 변경 미추적 | `echo >`, `sed -i` 등 미포함 |
| 동일 세션 한정 | 다른 세션의 체크포인트 사용 불가 |
| 파일 내용만 | 디렉토리 생성/이동/삭제 복원 안 됨 |
| 로컬 파일만 | 원격/네트워크 파일 미추적 |

---

## 6. 트러블슈팅

| 에러 | 원인 | 해결 |
|------|------|------|
| `message.uuid` undefined | `replay-user-messages` 미설정 | `extra_args={"replay-user-messages": None}` 추가 |
| "No file checkpoint found" | 원본 세션에 checkpointing 미활성화 | 원본 세션에 `enable_file_checkpointing=True` 확인 |
| "ProcessTransport not ready" | 스트림 완료 후 `rewind_files` 호출 | 세션 재개 후 새 쿼리에서 호출 |

---

> [insight] File checkpointing은 하네스의 "실험적 플러그인 실행" 기능에서 안전망으로 핵심 역할을 한다. 사용자가 파일 수정 플러그인을 실행하기 전 자동으로 체크포인트를 생성하고, 실행 결과가 마음에 들지 않으면 원클릭 롤백을 제공하는 UX는 플러그인 채택 장벽을 크게 낮춘다. 특히 첫 번째 UserMessage UUID = 실행 전 초기 상태라는 패턴을 표준화하면 구현이 단순해진다.

> [insight] `replay-user-messages` extra arg 요구사항은 하네스 Python 백엔드 체크포인팅 구현 시 반드시 포함해야 하는 비직관적 설정이다. 옵션 이름만 봐서는 체크포인팅과의 연관성을 파악하기 어려우므로, 하네스의 체크포인팅 활성화 헬퍼 함수에서 `enable_file_checkpointing=True` 설정 시 `replay-user-messages`를 자동으로 함께 주입하도록 래핑하면 사용자 실수를 방지할 수 있다.
