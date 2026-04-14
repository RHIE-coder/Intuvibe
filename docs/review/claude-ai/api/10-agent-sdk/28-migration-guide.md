# Migration Guide: Claude Code SDK → Claude Agent SDK

---

**Claude Code SDK → Claude Agent SDK** 리네이밍. 패키지명과 타입명 변경 + v0.1.0 브레이킹 체인지.

---

## 1. 패키지 변경

| | 구버전 | 신버전 |
|--|--------|--------|
| **TypeScript** | `@anthropic-ai/claude-code` | `@anthropic-ai/claude-agent-sdk` |
| **Python** | `claude-code-sdk` | `claude-agent-sdk` |

### TypeScript 마이그레이션
```bash
npm uninstall @anthropic-ai/claude-code
npm install @anthropic-ai/claude-agent-sdk
```
```typescript
// Before
import { query } from "@anthropic-ai/claude-code";
// After
import { query } from "@anthropic-ai/claude-agent-sdk";
```

### Python 마이그레이션
```bash
pip uninstall claude-code-sdk && pip install claude-agent-sdk
```
```python
# Before
from claude_code_sdk import query, ClaudeCodeOptions
# After
from claude_agent_sdk import query, ClaudeAgentOptions
```

---

## 2. v0.1.0 브레이킹 체인지

### ① Python 타입명 변경
`ClaudeCodeOptions` → `ClaudeAgentOptions`

### ② 시스템 프롬프트 기본값 변경
v0.0.x: Claude Code 시스템 프롬프트 자동 적용  
v0.1.0: **minimal 프롬프트** (툴 지시만 포함)

```python
# 이전 동작 복원
options = ClaudeAgentOptions(
    system_prompt={"type": "preset", "preset": "claude_code"}
)
```

### ③ 파일시스템 설정 기본값 변경
v0.0.x: `~/.claude/settings.json`, `.claude/settings.json`, CLAUDE.md 등 자동 로딩  
v0.1.0: **설정 미로딩** (명시적 지정 필요)

```python
# 이전 동작 복원 (모든 설정 로딩)
options = ClaudeAgentOptions(setting_sources=["user", "project", "local"])

# 또는 프로젝트 설정만
options = ClaudeAgentOptions(setting_sources=["project"])
```

**변경 이유**: CI/CD 환경 예측 가능성, 배포 환경 파일시스템 독립성, 멀티테넌트 설정 격리

---

## 3. 리네이밍 배경

코딩 전용 SDK → **범용 AI 에이전트 프레임워크** 반영. 법률/금융/고객지원 등 도메인 에이전트, SRE/보안/코드리뷰 에이전트 모두 포괄.

---

> [insight] `settingSources` 기본값 변경(자동 → 없음)은 하네스 설계에 직접적인 영향을 미친다. 하네스는 SDK를 직접 호출하는 서버 환경이므로, 파일시스템 설정 미로딩이 기본값인 v0.1.0 동작이 더 안전하고 예측 가능하다. 각 플러그인 실행 시 필요한 설정(CLAUDE.md, skills)만 `setting_sources`에 명시적으로 포함하는 것이 하네스의 격리 원칙과 일치한다.
