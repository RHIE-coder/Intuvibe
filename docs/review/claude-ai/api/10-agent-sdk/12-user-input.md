# User Input in Agent SDK

---

에이전트 실행 중 사용자 입력 수집: `canUseTool` 콜백 + `AskUserQuestion` 내장 툴.

---

## 1. canUseTool 콜백

툴 호출 승인/거부 + `AskUserQuestion` 트리거 처리.

```python
async def can_use_tool(tool_name, tool_input, context):
    if tool_name == "AskUserQuestion":
        questions = tool_input.get("questions", [])
        answers = {}
        for q in questions:
            print(q["question"])
            for i, opt in enumerate(q.get("options", [])):
                print(f"  {i+1}. {opt['label']}")
            choice = input("선택: ")
            answers[q["question"]] = choice
        return PermissionResultAllow(updated_input={"answers": answers})
    return PermissionResultAllow()

options = ClaudeAgentOptions(can_use_tool=can_use_tool)
```

**Python 주의**: streaming 모드 필수 + 더미 `PreToolUse` 훅 필요 (스트림 열린 상태 유지).

```python
# 더미 훅 (Python 필수)
async def pre_tool_use(tool_name, tool_input):
    return {"continue_": True}

options = ClaudeAgentOptions(
    hooks={"PreToolUse": [pre_tool_use]},
    can_use_tool=can_use_tool,
)
```

---

## 2. 반환 타입

| 타입 | 의미 |
|------|------|
| `PermissionResultAllow(updated_input=...)` | 승인 (입력 수정 가능) |
| `PermissionResultDeny(message=...)` | 거부 (이유 포함) |

---

## 3. AskUserQuestion 구조

```json
{
  "questions": [
    {
      "question": "어떤 환경에 배포할까요?",
      "header": "배포 환경 선택",
      "options": [
        {"label": "staging", "description": "테스트 환경"},
        {"label": "production", "description": "운영 환경"}
      ],
      "multiSelect": false
    }
  ]
}
```

| 필드 | 설명 |
|------|------|
| `question` | 질문 텍스트 (answers 키로 사용됨) |
| `header` | UI 제목 (선택) |
| `options[]` | label + description |
| `multiSelect` | 다중 선택 여부 |

**응답 형식**: `answers` dict → `{ "질문 텍스트": "선택한 label" }`  
**다중 선택**: 레이블 `", "` 구분 join

---

## 4. 제약

- 서브에이전트에서 사용 불가
- 1-4개 질문 / 질문당 2-4개 옵션
- Option Preview (TS only): `toolConfig.askUserQuestion.previewFormat: "markdown" | "html"`

---

> [insight] `AskUserQuestion` + `canUseTool` 콜백 패턴은 하네스에서 플러그인 실행 전 사용자 파라미터 수집 UI의 핵심 메커니즘이다. 플러그인이 실행 환경, 대상 파일, 동작 옵션을 Claude에 선언하면 Claude가 `AskUserQuestion`으로 수집 → 콜백에서 하네스 UI로 렌더링하는 구조로, 플러그인 자체가 입력 폼을 정의하는 선언적 UX 패턴을 구현할 수 있다.

> [insight] Python의 더미 `PreToolUse` 훅 요구사항은 하네스 Python 백엔드 구현 시 반드시 보일러플레이트로 포함해야 한다. TypeScript와 달리 Python SDK는 스트림 연결 유지를 위해 이 패턴이 필수이므로, 하네스의 Python Agent 래퍼 클래스에서 `can_use_tool` 설정 시 자동으로 더미 훅을 주입하는 헬퍼를 표준화하면 사용자 실수를 방지할 수 있다.
