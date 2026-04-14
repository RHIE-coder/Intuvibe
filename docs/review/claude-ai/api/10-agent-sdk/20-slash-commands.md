# Slash Commands in the Agent SDK

---

`/`로 시작하는 특수 명령으로 Claude Code 세션 제어. SDK 프롬프트 문자열로 전달.

---

## 1. 내장 슬래시 커맨드

```python
# 사용 가능한 커맨드 목록 확인
async for message in query(prompt="Hello", options=ClaudeAgentOptions(max_turns=1)):
    if isinstance(message, SystemMessage) and message.subtype == "init":
        print(message.data["slash_commands"])
        # ["/compact", "/clear", "/help", ...]
```

| 커맨드 | 동작 |
|--------|------|
| `/compact` | 오래된 메시지 요약, 컨텍스트 크기 축소 |
| `/clear` | 대화 히스토리 전체 삭제, 새 세션 시작 |
| `/help` | 사용 가능한 커맨드 목록 표시 |

```python
# /compact 실행 후 메타데이터 확인
async for message in query(prompt="/compact", options=ClaudeAgentOptions(max_turns=1)):
    if isinstance(message, SystemMessage) and message.subtype == "compact_boundary":
        print(message.data["compact_metadata"]["pre_tokens"])
```

---

## 2. 커스텀 슬래시 커맨드 (파일 기반)

**권장**: `.claude/skills/<name>/SKILL.md` (슬래시 커맨드 + 자율 호출 모두 지원)  
**레거시**: `.claude/commands/<name>.md` / `~/.claude/commands/<name>.md`

### 파일 형식
```markdown
---
allowed-tools: Read, Grep, Glob
description: Run security vulnerability scan
argument-hint: [issue-number] [priority]
---

Analyze the codebase for security vulnerabilities including:
- SQL injection risks
- XSS vulnerabilities
- Exposed credentials
```

### 파라미터 치환
```markdown
Fix issue #$1 with priority $2.
# 또는
Run tests: $ARGUMENTS
```

```python
# 커스텀 커맨드 + 인수 전달
async for message in query(
    prompt="/fix-issue 123 high",
    options=ClaudeAgentOptions(max_turns=5)
):
    ...
```

---

## 3. 고급 기능

### Bash 출력 포함
```markdown
## Context
- Current status: !`git status`
- Current diff: !`git diff HEAD`
```

### 파일 내용 포함
```markdown
Review: @package.json @tsconfig.json
```

### 네임스페이스 구조
```
.claude/commands/
├── frontend/component.md    → /component
├── backend/api-test.md      → /api-test
└── review.md                → /review
```

---

> [insight] 슬래시 커맨드는 하네스의 플러그인 진입점 표준 패턴으로 자연스럽게 맞아 떨어진다. 각 플러그인을 `.claude/skills/<plugin-name>/SKILL.md`로 배포하면 사용자가 `/plugin-name [args]`로 직접 호출하는 CLI 경험과, Claude가 컨텍스트에 따라 자율 호출하는 자동화 경험을 동시에 제공한다. 하네스의 플러그인 설치 과정에서 SKILL.md 파일을 적절한 위치에 배포하는 것만으로 슬래시 커맨드가 자동 등록되는 플러그인 배포 파이프라인이 가능하다.

> [insight] `!`backtick bash 실행과 `@`파일 참조는 SKILL.md에서 플러그인 실행 컨텍스트를 동적으로 구성하는 강력한 도구다. 플러그인이 실행 시점의 git 상태, 프로젝트 설정 파일, 환경 정보를 자동으로 컨텍스트에 포함시키면 사용자가 매번 배경 정보를 제공할 필요 없이 플러그인이 스스로 필요한 정보를 수집할 수 있다.
