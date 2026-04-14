# Superpowers - Hooks, Commands & Plugin Manifests

> Step 5: `hooks/`, `commands/`, `.claude-plugin/`, `.cursor-plugin/`, Gemini, OpenCode 분석

---

## 1. Plugin Manifest 구조

### Claude Code (`.claude-plugin/plugin.json`)

```json
{
  "name": "superpowers",
  "description": "Core skills library for Claude Code: TDD, debugging, collaboration patterns, and proven techniques",
  "version": "5.0.7",
  "author": { "name": "Jesse Vincent", "email": "jesse@fsck.com" },
  "homepage": "https://github.com/obra/superpowers",
  "repository": "https://github.com/obra/superpowers",
  "license": "MIT",
  "keywords": ["skills", "tdd", "debugging", "collaboration", "best-practices", "workflows"]
}
```

**특징**: `skills`, `agents`, `commands`, `hooks` 필드가 **없음** — Claude Code가 convention-based로 디렉토리를 탐색하는 것으로 추정.

### Cursor (`.cursor-plugin/plugin.json`)

```json
{
  "name": "superpowers",
  "displayName": "Superpowers",
  "description": "...",
  "version": "5.0.7",
  "skills": "./skills/",
  "agents": "./agents/",
  "commands": "./commands/",
  "hooks": "./hooks/hooks-cursor.json"
}
```

**특징**: 명시적으로 `skills`, `agents`, `commands`, `hooks` 경로를 선언. Claude Code와 달리 convention이 아닌 **explicit configuration**.

### Gemini CLI (`gemini-extension.json`)

```json
{
  "name": "superpowers",
  "description": "...",
  "version": "5.0.7",
  "contextFileName": "GEMINI.md"
}
```

**GEMINI.md** (context file):
```
@./skills/using-superpowers/SKILL.md
@./skills/using-superpowers/references/gemini-tools.md
```

**특징**: `contextFileName`으로 컨텍스트 파일을 지정. `@` 참조로 스킬 내용을 직접 로드. 서브에이전트 미지원.

### OpenCode (`.opencode/plugins/superpowers.js`)

**특징**: JS 플러그인 — 프로그래밍 방식으로 통합.

```javascript
export const SuperpowersPlugin = async ({ client, directory }) => {
  return {
    // 1. Config hook: 스킬 디렉토리를 동적 등록
    config: async (config) => {
      config.skills.paths.push(superpowersSkillsDir);
    },

    // 2. Message transform: 첫 유저 메시지에 bootstrap 주입
    'experimental.chat.messages.transform': async (_input, output) => {
      // using-superpowers SKILL.md 내용을 <EXTREMELY_IMPORTANT> 태그로 감싸서 주입
      // + OpenCode 전용 tool mapping 추가
    }
  };
};
```

### Marketplace (`marketplace.json`)

```json
{
  "name": "superpowers-dev",
  "plugins": [{
    "name": "superpowers",
    "version": "5.0.7",
    "source": "./"
  }]
}
```

자체 marketplace를 호스팅하여 `plugin marketplace add obra/superpowers-marketplace` → `plugin install superpowers@superpowers-marketplace` 패턴 지원.

---

## 2. 플랫폼별 매니페스트 비교

| 항목 | Claude Code | Cursor | Gemini CLI | OpenCode |
|------|------------|--------|-----------|----------|
| **매니페스트** | `plugin.json` | `plugin.json` | `gemini-extension.json` | `superpowers.js` |
| **Skills 선언** | convention | `"skills": "./skills/"` | `@` 참조 | config hook |
| **Agents 선언** | convention | `"agents": "./agents/"` | 미지원 | 미지원 |
| **Commands 선언** | convention | `"commands": "./commands/"` | 미지원 | 미지원 |
| **Hooks** | `hooks.json` (내장) | `hooks-cursor.json` | 없음 | message transform |
| **Bootstrap** | SessionStart hook → additionalContext | sessionStart hook | contextFileName → `@` 로드 | 첫 메시지 prepend |
| **배포** | marketplace / git | marketplace / git | `gemini extensions install` | 수동 |

---

## 3. Hooks 시스템

### hooks.json (Claude Code)

```json
{
  "hooks": {
    "SessionStart": [{
      "matcher": "startup|clear|compact",
      "hooks": [{
        "type": "command",
        "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.cmd\" session-start",
        "async": false
      }]
    }]
  }
}
```

**구성 요소:**
- **이벤트**: `SessionStart` (세션 시작/클리어/컴팩트 시)
- **matcher**: regex 패턴 (`startup|clear|compact`)
- **type**: `command` (쉘 명령 실행)
- **async**: `false` (동기 실행 — 응답 전에 완료)
- **`${CLAUDE_PLUGIN_ROOT}`**: 플러그인 루트 디렉토리 변수

### hooks-cursor.json (Cursor)

```json
{
  "version": 1,
  "hooks": {
    "sessionStart": [{
      "command": "./hooks/session-start"
    }]
  }
}
```

Cursor는 더 단순한 포맷. `sessionStart` (camelCase), matcher 없음.

### session-start 스크립트 — 핵심 Bootstrap 메커니즘

**역할**: 세션 시작 시 `using-superpowers` 스킬 전문을 컨텍스트에 주입.

**동작 흐름:**

```
1. 레거시 스킬 디렉토리 존재 확인 (~/.config/superpowers/skills)
   → 존재하면 마이그레이션 경고 메시지 생성

2. using-superpowers SKILL.md 전문 읽기

3. JSON 임베딩을 위해 이스케이프

4. 플랫폼 감지 후 적절한 JSON 포맷으로 출력:
   - Cursor: { "additional_context": "..." }
   - Claude Code: { "hookSpecificOutput": { "additionalContext": "..." } }
   - Copilot CLI / 기타: { "additionalContext": "..." }
```

**주입 내용:**
```
<EXTREMELY_IMPORTANT>
You have superpowers.

**Below is the full content of your 'superpowers:using-superpowers' skill:**

[using-superpowers SKILL.md 전문]

</EXTREMELY_IMPORTANT>
```

### 플랫폼 감지 로직

```bash
if [ -n "${CURSOR_PLUGIN_ROOT:-}" ]; then
  # Cursor
elif [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -z "${COPILOT_CLI:-}" ]; then
  # Claude Code
else
  # Copilot CLI or unknown
fi
```

환경변수로 플랫폼 구분:
- `CURSOR_PLUGIN_ROOT` → Cursor
- `CLAUDE_PLUGIN_ROOT` (+ no `COPILOT_CLI`) → Claude Code
- `COPILOT_CLI=1` → Copilot CLI

### run-hook.cmd — Cross-platform Polyglot

**Windows + Unix 동시 지원하는 단일 파일:**
- Windows: `.cmd` 배치 부분 실행 → Git Bash 찾아서 스크립트 실행
- Unix: `: << 'CMDBLOCK'`로 배치 부분 skip → 직접 bash 실행

Windows에서 bash를 찾는 순서:
1. `C:\Program Files\Git\bin\bash.exe`
2. `C:\Program Files (x86)\Git\bin\bash.exe`
3. PATH의 `bash`
4. 없으면 조용히 exit (플러그인은 동작, bootstrap 없이)

---

## 4. Commands 시스템

### 현재 상태: 모두 Deprecated

```
commands/
  brainstorm.md      → "Use superpowers:brainstorming skill instead"
  execute-plan.md    → "Use superpowers:executing-plans skill instead"
  write-plan.md      → "Use superpowers:writing-plans skill instead"
```

**전환**: Commands (유저가 명시적으로 호출) → Skills (자동 트리거)

Commands는 유저가 `/brainstorm`처럼 직접 호출하는 방식이었으나, 스킬의 자동 트리거 메커니즘이 더 효과적이라고 판단하여 deprecated됨.

### Command Frontmatter

```yaml
---
description: "Deprecated - use the superpowers:brainstorming skill instead"
---
```

스킬의 frontmatter (`name` + `description`)와 유사하지만, `name` 필드 없이 `description`만.

---

## 5. OpenCode 플러그인 — 프로그래밍 방식 통합 상세

OpenCode는 다른 플랫폼과 달리 **JS 플러그인**으로 통합:

### Config Hook
```javascript
config: async (config) => {
  config.skills = config.skills || {};
  config.skills.paths = config.skills.paths || [];
  if (!config.skills.paths.includes(superpowersSkillsDir)) {
    config.skills.paths.push(superpowersSkillsDir);
  }
}
```

Config 싱글턴을 직접 수정하여 스킬 디렉토리 등록. 심링크나 수동 설정 불필요.

### Message Transform
```javascript
'experimental.chat.messages.transform': async (_input, output) => {
  // 첫 user 메시지의 parts에 bootstrap 내용을 prepend
  const firstUser = output.messages.find(m => m.info.role === 'user');
  firstUser.parts.unshift({ type: 'text', text: bootstrap });
}
```

**설계 결정:**
- system message가 아닌 user message에 주입 — "Token bloat from system messages repeated every turn" 방지
- 여러 system message가 일부 모델(Qwen 등)을 깨는 문제 회피
- 이미 주입되었으면 skip (중복 방지)

### Tool Mapping (OpenCode 전용)
```markdown
- `TodoWrite` → `todowrite`
- `Task` tool → OpenCode의 @mention subagent system
- `Skill` tool → OpenCode's native `skill` tool
- `Read`, `Write`, `Edit`, `Bash` → 네이티브 도구
```

---

## 6. Bootstrap 메커니즘 비교

모든 플랫폼의 공통 목표: **세션 시작 시 `using-superpowers` 스킬 전문을 에이전트 컨텍스트에 주입**

| 플랫폼 | Bootstrap 방식 | 주입 위치 |
|--------|----------------|-----------|
| **Claude Code** | SessionStart hook → `hookSpecificOutput.additionalContext` | system context |
| **Cursor** | sessionStart hook → `additional_context` | system context |
| **Copilot CLI** | SessionStart hook → `additionalContext` | system context |
| **Gemini CLI** | `contextFileName` → `GEMINI.md` → `@` 파일 로드 | extension context |
| **OpenCode** | JS plugin → message transform → 첫 user message prepend | user message |

**공통점**: `using-superpowers` SKILL.md를 `<EXTREMELY_IMPORTANT>` 태그로 감싸서 주입
**차이점**: hook output JSON 포맷이 플랫폼마다 다름 (snake_case vs camelCase vs nested)

---

## 7. 하네스 설계 시사점

| 관찰 | 시사점 |
|------|--------|
| **Convention vs Explicit** | Claude Code는 convention-based, Cursor는 explicit path — 유연성과 명시성의 트레이드오프 |
| **SessionStart hook이 핵심** | 모든 플랫폼의 bootstrap이 세션 시작에 집중 → 초기 컨텍스트 주입이 전체 시스템의 기반 |
| **`<EXTREMELY_IMPORTANT>` 태그** | LLM attention을 위한 강조 메커니즘 → 프롬프트 우선순위 제어 |
| **Commands → Skills 전환** | 명시적 호출보다 자동 트리거가 더 효과적이라는 학습 결과 |
| **플랫폼별 출력 포맷 분기** | 하나의 hook 스크립트로 다중 플랫폼 지원 — 환경변수 기반 감지 |
| **Cross-platform polyglot** | `.cmd` 파일 하나로 Windows/Unix 동시 지원 — 배포 단순화 |
| **OpenCode의 message transform** | system message 반복으로 인한 토큰 bloat 문제 → user message에 1회 주입이 더 효율적 |
| **Zero-dependency 유지** | hook 스크립트가 순수 bash — node/python 등 런타임 의존 없음 (OpenCode 제외) |
| **Marketplace self-hosting** | `marketplace.json`으로 자체 마켓플레이스 운영 가능 |

---

**다음 단계**: Step 6 — `tests/` 디렉토리 → 스킬 트리거 테스트, 품질 검증 방법론
