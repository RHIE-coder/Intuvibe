# Agent SDK Overview

---

Claude Code의 에이전트 루프·툴·컨텍스트 관리를 라이브러리로 제공. Python + TypeScript 지원. (구명: Claude Code SDK)

- 패키지: `claude-agent-sdk` (Python), `@anthropic-ai/claude-agent-sdk` (TS)
- Bedrock / Vertex AI / Azure 지원 (환경변수로 전환)

---

## 1. 핵심 차별점: Client SDK vs Agent SDK

| 항목 | Client SDK | Agent SDK |
|------|-----------|-----------|
| 툴 루프 | 직접 구현 | 자동 처리 |
| 내장 툴 | 없음 | Read/Write/Edit/Bash/Glob/Grep/WebSearch 등 |
| 인터페이스 | `client.messages.create()` | `query()` 스트리밍 |

```python
# Client SDK: 툴 루프 직접 구현
response = client.messages.create(...)
while response.stop_reason == "tool_use":
    result = your_tool_executor(...)
    response = client.messages.create(tool_result=result, ...)

# Agent SDK: 자동 처리
async for message in query(prompt="Fix the bug in auth.py"):
    print(message)
```

---

## 2. 내장 툴

| 툴 | 기능 |
|----|------|
| Read/Write/Edit | 파일 읽기/생성/수정 |
| Bash | 터미널 명령, 스크립트, git |
| Glob/Grep | 파일 검색, 내용 검색 |
| WebSearch/WebFetch | 웹 검색 및 페이지 파싱 |
| AskUserQuestion | 사용자 질문 (객관식 옵션) |
| Agent | 서브에이전트 호출 |

---

## 3. 주요 기능

### Hooks
에이전트 생명주기 콜백: `PreToolUse`, `PostToolUse`, `Stop`, `SessionStart`, `SessionEnd`, `UserPromptSubmit` 등.

```python
options=ClaudeAgentOptions(
    hooks={"PostToolUse": [HookMatcher(matcher="Edit|Write", hooks=[log_fn])]}
)
```

### 서브에이전트
`AgentDefinition`으로 전문화된 서브에이전트 정의. `allowed_tools`에 `"Agent"` 포함 필요.

### MCP 연결
```python
mcp_servers={"playwright": {"command": "npx", "args": ["@playwright/mcp@latest"]}}
```

### 세션 관리
`SystemMessage` init에서 `session_id` 캡처 → `resume=session_id`로 컨텍스트 이어받기.

### 권한 모드
`allowed_tools` 리스트로 pre-approve. `permission_mode="acceptEdits"` 등 모드 설정.

---

## 4. Claude Code 파일시스템 기능 연동

`setting_sources=["project"]` 설정 시:

| 기능 | 경로 |
|------|------|
| Skills | `.claude/skills/*/SKILL.md` |
| Slash Commands | `.claude/commands/*.md` |
| Memory | `CLAUDE.md` |
| Plugins | programmatic `plugins` 옵션 |

---

## 5. 브랜딩 제약

- 허용: "Claude Agent", "{제품명} Powered by Claude"
- 금지: "Claude Code", "Claude Code Agent", Claude Code 아스키 아트

---

> [insight] Agent SDK는 하네스의 핵심 런타임이다. Client SDK로 툴 루프를 직접 구현하는 것과 달리, Agent SDK는 내장 툴과 에이전트 루프를 제공해 하네스의 플러그인 실행 환경을 대폭 단순화한다. 특히 Hooks 시스템은 플러그인 마켓플레이스의 감사 로깅, 권한 검증, 사용량 추적을 코드 몇 줄로 구현하는 진입점이다.

> [insight] `setting_sources=["project"]`로 Claude Code 파일시스템 기능을 SDK에서 활용하는 패턴은 하네스의 개발/운영 환경 전환에서 중요하다. 개발자가 Claude Code CLI에서 테스트한 Skills와 Commands를 그대로 SDK 기반 하네스 운영 환경에서 사용할 수 있어, 개발-운영 간 일관성을 유지하면서 전환 비용을 줄인다.

> [insight] Bedrock/Vertex/Azure 지원이 환경변수 전환(`CLAUDE_CODE_USE_BEDROCK=1`)으로 이루어진다는 점은 하네스의 멀티클라우드 배포 전략에서 중요하다. 코드 변경 없이 엔터프라이즈 고객의 클라우드 환경에 맞게 배포 가능하며, ZDR이 필요한 고객에게는 Bedrock/Vertex 경로를 제공하는 티어 전략을 구성할 수 있다.
