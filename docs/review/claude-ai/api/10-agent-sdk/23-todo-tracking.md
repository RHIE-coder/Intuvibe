# Todo Tracking in Agent SDK

---

에이전트가 복잡한 워크플로우를 진행하면서 자동으로 생성/관리하는 작업 목록. SDK 스트림에서 `TodoWrite` 툴 호출로 감지.

---

## 1. 투두 자동 생성 조건

- 3개 이상의 구별되는 액션이 필요한 복잡한 멀티스텝 태스크
- 사용자가 여러 항목을 언급한 경우
- 비사소한 작업으로 진행 추적이 유익한 경우
- 사용자가 명시적으로 투두 정리 요청 시

---

## 2. 투두 라이프사이클

`pending` → `in_progress` → `completed` → (그룹 완료 시 제거)

---

## 3. 투두 변경 감지

```python
async for message in query(prompt="Optimize my React app...", options={"max_turns": 15}):
    if isinstance(message, AssistantMessage):
        for block in message.content:
            if isinstance(block, ToolUseBlock) and block.name == "TodoWrite":
                todos = block.input["todos"]
                for todo in todos:
                    status = "✅" if todo["status"] == "completed" else \
                             "🔧" if todo["status"] == "in_progress" else "❌"
                    print(f"{status} {todo['content']}")
```

---

## 4. 진행 상황 실시간 표시

```python
class TodoTracker:
    def __init__(self):
        self.todos = []

    def display_progress(self):
        completed = len([t for t in self.todos if t["status"] == "completed"])
        total = len(self.todos)
        print(f"Progress: {completed}/{total}")
        for todo in self.todos:
            text = todo["activeForm"] if todo["status"] == "in_progress" else todo["content"]
            icon = "✅" if todo["status"] == "completed" else "🔧" if todo["status"] == "in_progress" else "❌"
            print(f"  {icon} {text}")

    async def track_query(self, prompt: str):
        async for message in query(prompt=prompt, options={"max_turns": 20}):
            if isinstance(message, AssistantMessage):
                for block in message.content:
                    if isinstance(block, ToolUseBlock) and block.name == "TodoWrite":
                        self.todos = block.input["todos"]
                        self.display_progress()
```

**투두 필드**: `content` (기본 텍스트), `activeForm` (진행 중 표시 텍스트), `status`

---

> [insight] `TodoWrite` 툴 인터셉트 패턴은 하네스의 플러그인 실행 진행 UI에서 실시간 진행 상황 표시 기능의 근거가 된다. 플러그인이 복잡한 멀티스텝 작업을 수행할 때 Claude가 자동으로 생성하는 투두 목록을 `PostToolUse` 훅으로 캡처해 하네스 UI에 렌더링하면, 사용자가 플러그인의 진행 상황을 단계별로 추적할 수 있다. 별도의 진행 상황 보고 메커니즘을 플러그인에 구현할 필요 없이 Claude의 기본 투두 시스템을 재활용하는 것이 효율적이다.
