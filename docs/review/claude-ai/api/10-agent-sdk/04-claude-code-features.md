# Claude Code Features in Agent SDK

---

`settingSources` 옵션으로 파일시스템 기반 Claude Code 기능(CLAUDE.md, Skills, Hooks 등)을 SDK 에이전트에 로딩. 기본값: 격리 모드 (파일시스템 설정 미로딩).

---

## 1. settingSources 옵션

| 소스 | 로딩 위치 | 내용 |
|------|---------|------|
| `"project"` | `<cwd>/.claude/` + 상위 디렉토리 | CLAUDE.md, rules/*.md, skills, hooks, settings.json |
| `"user"` | `~/.claude/` | 사용자 CLAUDE.md, rules/*.md, skills |
| `"local"` | `<cwd>/` | CLAUDE.local.md (gitignored), settings.local.json |

```python
options=ClaudeAgentOptions(
    setting_sources=["user", "project"],  # CLI와 동일: ["user", "project", "local"]
    allowed_tools=["Read", "Edit", "Bash"],
)
```

**주의**: `cwd` 또는 상위 디렉토리에 `.claude/` 폴더 없으면 project 기능 미로딩. Auto memory(CLI 전용)는 SDK에서 절대 로딩되지 않음.

---

## 2. CLAUDE.md 로딩 레벨

| 레벨 | 경로 | 로딩 시점 |
|------|------|---------|
| 프로젝트 루트 | `<cwd>/CLAUDE.md` or `<cwd>/.claude/CLAUDE.md` | 세션 시작 |
| 규칙 | `<cwd>/.claude/rules/*.md` | 세션 시작 |
| 부모 디렉토리 | 상위 `CLAUDE.md` 파일들 | 세션 시작 |
| 자식 디렉토리 | 하위 `CLAUDE.md` 파일들 | 해당 경로 파일 읽기 시 온디맨드 |
| 로컬 | `<cwd>/CLAUDE.local.md` | `"local"` 소스 시 |
| 사용자 | `~/.claude/CLAUDE.md` | `"user"` 소스 시 |

모든 레벨 누적 적용. 충돌 시 더 구체적인 파일에 "이 파일이 상위 규칙보다 우선" 명시 권장.

---

## 3. Skills

`settingSources`에 `"project"` 포함 시 `.claude/skills/*/SKILL.md` 자동 발견. `allowed_tools`에 `"Skill"` 명시 필요 (allowedTools 사용 시).

```python
options=ClaudeAgentOptions(
    setting_sources=["user", "project"],
    allowed_tools=["Skill", "Read", "Grep", "Glob"],
)
```

---

## 4. Hooks (두 가지 방식)

| 방식 | 특징 | 적합한 상황 |
|------|------|----------|
| 파일시스템 hooks (`settings.json`) | CLI와 공유, 서브에이전트에도 적용 | CLI+SDK 공통 규칙 |
| 프로그래매틱 hooks (콜백) | 애플리케이션 로직, 구조화된 결정 반환 | SDK 전용 커스텀 로직 |

```python
async def audit_bash(input_data, tool_use_id, context):
    command = input_data.get("tool_input", {}).get("command", "")
    if "rm -rf" in command:
        return {"decision": "block", "reason": "Destructive command blocked"}
    return {}  # 빈 딕셔너리 = 허용

options=ClaudeAgentOptions(
    setting_sources=["project"],  # settings.json 훅도 자동 로딩
    hooks={"PreToolUse": [HookMatcher(matcher="Bash", hooks=[audit_bash])]},
)
```

파일시스템 훅 타입: `command`, `http`, `prompt`, `agent` (서브에이전트 검증기).

---

## 5. 기능 선택 가이드

| 목표 | 사용 기능 | SDK 설정 |
|------|---------|---------|
| 항상 따를 프로젝트 규칙 | CLAUDE.md | `settingSources` |
| 온디맨드 참조 자료 | Skills | `settingSources` + `"Skill"` 툴 |
| 재사용 가능 워크플로우 | Skills | `settingSources` + `"Skill"` 툴 |
| 격리된 서브태스크 위임 | Subagents | `agents` + `"Agent"` 툴 |
| 툴 호출 감사/차단 | Hooks | `hooks` 파라미터 |
| 외부 서비스 연결 | MCP | `mcpServers` 파라미터 |

---

> [insight] CLI와 SDK의 파일시스템 기반 설정 공유는 하네스의 개발-운영 워크플로우에서 핵심 장점이다. 개발자가 `~/.claude/settings.json`에 정의한 훅과 `.claude/skills/`의 Skills가 SDK 기반 프로덕션 에이전트에도 동일하게 적용된다. 하네스에서 `setting_sources=["user", "project"]`를 표준으로 설정하면 개발 시 검증된 설정이 그대로 운영에 이어진다.

> [insight] 자식 디렉토리 CLAUDE.md가 해당 경로 파일 읽기 시 온디맨드로 로딩된다는 점은 하네스의 모노레포 에이전트 설계에서 유용하다. 서브패키지별 CLAUDE.md에 패키지 특화 규칙을 정의하면, 에이전트가 해당 패키지 파일을 읽을 때만 그 규칙이 컨텍스트에 로딩된다. 전체 모노레포 규칙을 사전 로딩하지 않고도 패키지별 맥락을 제공하는 효율적인 구조다.
