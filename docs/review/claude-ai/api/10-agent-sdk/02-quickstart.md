# Agent SDK Quickstart

---

`query()` 함수로 에이전트 루프 시작. 스트리밍 메시지 소비.

---

## 1. 설치

```bash
# Python
pip install claude-agent-sdk

# TypeScript
npm install @anthropic-ai/claude-agent-sdk
```

---

## 2. 기본 패턴

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions, AssistantMessage, ResultMessage

async def main():
    async for message in query(
        prompt="Review utils.py for bugs and fix them.",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Edit", "Glob"],
            permission_mode="acceptEdits",
        ),
    ):
        if isinstance(message, AssistantMessage):
            for block in message.content:
                if hasattr(block, "text"):
                    print(block.text)         # Claude 추론
                elif hasattr(block, "name"):
                    print(f"Tool: {block.name}")  # 툴 호출
        elif isinstance(message, ResultMessage):
            print(f"Done: {message.subtype}")

asyncio.run(main())
```

---

## 3. 메시지 타입

| 타입 | 내용 |
|------|------|
| `AssistantMessage` | Claude 추론 텍스트 + 툴 호출 블록 |
| `ResultMessage` | 최종 결과 (`subtype`: success/error) |
| `SystemMessage` | 시스템 초기화 (session_id 포함) |

---

## 4. 주요 옵션

| 옵션 | 설명 |
|------|------|
| `allowed_tools` | 사전 승인된 툴 목록 |
| `permission_mode` | 권한 모드 (아래 표 참조) |
| `system_prompt` | 커스텀 시스템 프롬프트 |
| `mcp_servers` | MCP 서버 연결 |
| `resume` | 세션 ID로 이전 세션 재개 |

---

## 5. Permission Mode

| 모드 | 동작 | 사용 사례 |
|------|------|---------|
| `acceptEdits` | 파일 편집 자동 승인, 나머지 질문 | 개발 워크플로우 |
| `dontAsk` | `allowedTools` 외 모든 것 거부 | 잠금 헤드리스 에이전트 |
| `auto` (TS only) | 모델 분류기가 툴 호출별 승인/거부 | 안전 가드레일이 있는 자율 에이전트 |
| `bypassPermissions` | 모든 툴 프롬프트 없이 실행 | 샌드박스 CI, 완전 신뢰 환경 |
| `default` | `canUseTool` 콜백으로 커스텀 승인 | 커스텀 승인 플로우 |

---

## 6. 툴 조합 패턴

| 조합 | 능력 |
|------|------|
| `Read, Glob, Grep` | 읽기 전용 분석 |
| `Read, Edit, Glob` | 코드 분석 + 수정 |
| `Read, Edit, Bash, Glob, Grep` | 완전 자동화 |

---

> [insight] `permission_mode`는 하네스의 에이전트 신뢰 모델에서 핵심 레버다. 플러그인 마켓플레이스에서 서드파티 플러그인이 실행될 때는 `dontAsk` + 명시적 `allowedTools` 화이트리스트가 기본이 돼야 하고, 검증된 공식 플러그인에만 더 높은 권한 모드를 부여하는 계층적 신뢰 체계를 설계해야 한다.

> [insight] `auto` 모드의 "모델 분류기가 툴 호출별 승인/거부"는 TypeScript SDK 전용이다. 하네스에서 사용자 인터랙션 없이 실행되는 에이전트에 `auto` 모드를 적용하면, 위험한 툴 호출을 Claude 자체가 평가해 차단하는 소프트 안전망을 구성할 수 있다. 단 Python SDK에는 없으므로 언어 선택 시 고려 필요.
