# Subagents in the Agent SDK

---

메인 에이전트가 스폰하는 별도 에이전트 인스턴스. 컨텍스트 격리, 병렬 실행, 특화 지시 적용.

---

## 1. 서브에이전트 생성 방법

| 방법 | 설명 |
|------|------|
| **programmatic** | `agents` 파라미터로 코드에서 정의 (권장) |
| **filesystem** | `.claude/agents/*.md` 파일로 정의 |
| **built-in** | `general-purpose` 서브에이전트: `Agent` 툴이 `allowedTools`에 있으면 자동 사용 가능 |

---

## 2. AgentDefinition 설정

```python
from claude_agent_sdk import query, ClaudeAgentOptions, AgentDefinition

async for message in query(
    prompt="Review the authentication module for security issues",
    options=ClaudeAgentOptions(
        allowed_tools=["Read", "Grep", "Glob", "Agent"],  # Agent 툴 필수
        agents={
            "code-reviewer": AgentDefinition(
                description="Expert code review specialist. Use for quality, security, and maintainability reviews.",
                prompt="You are a code review specialist...",
                tools=["Read", "Grep", "Glob"],  # 읽기 전용 제한
                model="sonnet",  # 모델 오버라이드
            ),
        },
    ),
):
    ...
```

| 필드 | 필수 | 설명 |
|------|------|------|
| `description` | ✅ | Claude가 언제 이 서브에이전트를 호출할지 판단 기준 |
| `prompt` | ✅ | 서브에이전트의 시스템 프롬프트 |
| `tools` | - | 허용 툴 목록 (미설정 시 부모 툴 상속) |
| `model` | - | `sonnet` / `opus` / `haiku` / `inherit` |
| `skills` | - | 사용 가능한 스킬 목록 |
| `mcpServers` | - | MCP 서버 (이름 또는 인라인 설정) |

**주의**: 서브에이전트는 자체 서브에이전트 스폰 불가 (`Agent` 툴 미포함 필수)

---

## 3. 컨텍스트 상속

| 서브에이전트가 받는 것 | 받지 못하는 것 |
|---------------------|-------------|
| 자체 시스템 프롬프트 + Agent 툴 프롬프트 | 부모 대화 히스토리/툴 결과 |
| `settingSources` 로딩 시 CLAUDE.md | 스킬 (명시 지정 시 제외) |
| 부모로부터 상속된 툴 정의 (또는 `tools` 서브셋) | 부모 시스템 프롬프트 |

**서브에이전트 → 부모**: 최종 메시지만 Agent 툴 결과로 전달.

---

## 4. 호출 방식

- **자동**: `description` 기반으로 Claude가 판단
- **명시적**: 프롬프트에 이름 언급 — `"Use the code-reviewer agent to..."`

### 동적 에이전트 설정
```python
def create_security_agent(security_level: str) -> AgentDefinition:
    is_strict = security_level == "strict"
    return AgentDefinition(
        description="Security code reviewer",
        prompt=f"You are a {'strict' if is_strict else 'balanced'} security reviewer...",
        tools=["Read", "Grep", "Glob"],
        model="opus" if is_strict else "sonnet",
    )
```

---

## 5. 서브에이전트 재개

```python
# 1차 실행: session_id + agent_id 캡처
async for message in query(...):
    if hasattr(message, "session_id"):
        session_id = message.session_id
    content_str = json.dumps(message.content, default=str)
    match = re.search(r"agentId:\s*([a-f0-9-]+)", content_str)
    if match:
        agent_id = match.group(1)

# 2차 실행: 동일 세션 재개 후 follow-up
async for message in query(
    prompt=f"Resume agent {agent_id} and list the top 3 most complex endpoints",
    options=ClaudeAgentOptions(
        allowed_tools=["Read", "Grep", "Glob", "Agent"],
        resume=session_id
    ),
):
    ...
```

서브에이전트 트랜스크립트: 메인 대화 compaction과 무관하게 독립 저장. 기본 30일 후 자동 삭제.

---

## 6. 툴 제한 조합

| 용도 | 툴 |
|------|-----|
| 읽기 전용 분석 | `Read`, `Grep`, `Glob` |
| 테스트 실행 | `Bash`, `Read`, `Grep` |
| 코드 수정 | `Read`, `Edit`, `Write`, `Grep`, `Glob` |
| 전체 권한 | 미설정 (부모 상속) |

---

## 7. 서브에이전트 감지

```python
for block in message.content:
    if getattr(block, "type", None) == "tool_use" and block.name in ("Task", "Agent"):
        print(f"Subagent invoked: {block.input.get('subagent_type')}")
if hasattr(message, "parent_tool_use_id") and message.parent_tool_use_id:
    print("  (running inside subagent)")
```

**SDK 버전 호환**: `"Task"` (v2.1.63 이전) / `"Agent"` (현재) — 둘 다 체크 필요.

---

> [insight] 서브에이전트의 컨텍스트 격리 특성은 하네스의 플러그인 실행 아키텍처에서 핵심 이점이다. 각 플러그인을 별도 서브에이전트로 실행하면 플러그인 A의 대규모 파일 탐색이 플러그인 B의 컨텍스트를 오염시키지 않는다. 메인 에이전트는 각 플러그인의 최종 요약만 수신하므로, 마켓플레이스에서 여러 플러그인을 조합 실행할 때 컨텍스트 폭발 문제를 자연스럽게 해결한다.

> [insight] 동적 `AgentDefinition` 팩토리 패턴은 하네스의 플러그인 런타임 설정에서 강력한 도구다. 플러그인의 메타데이터(보안 등급, 신뢰 레벨, 필요 툴)를 기반으로 `AgentDefinition`을 동적 생성하면, 플러그인 코드 변경 없이 하네스가 런타임 설정(모델 선택, 툴 제한, 프롬프트 prefix)을 중앙 관리할 수 있다.

> [insight] 서브에이전트 재개(`resume + agent_id`) 패턴은 하네스의 장기 실행 플러그인 워크플로우에서 유용하다. 플러그인이 여러 턴에 걸쳐 작업(예: 대규모 코드베이스 분석)을 수행할 때, 중간 상태를 저장하고 사용자 확인 후 재개하는 패턴을 하네스 레벨에서 표준화할 수 있다.
