# Headless / Programmatic — 비대화형 실행

---

`claude -p` 플래그로 Claude Code를 비대화형으로 실행한다.
CI/CD, 스크립트, 자동화 파이프라인에 통합. Agent SDK(Python/TypeScript)로 프로그래밍적 제어도 가능.

---

## 1. 기본 사용

```bash
claude -p "What does the auth module do?"                    # 텍스트 응답
claude -p "Summarize this project" --output-format json      # JSON 응답
claude -p "Find and fix the bug" --allowedTools "Read,Edit,Bash"  # 도구 자동 승인
```

모든 CLI 옵션이 `-p`와 함께 동작: `--continue`, `--allowedTools`, `--output-format` 등.

---

## 2. `--bare` 모드 — 빠른 시작

```bash
claude --bare -p "Summarize this file" --allowedTools "Read"
```

Hooks, Skills, Plugins, MCP, Auto memory, CLAUDE.md **전부 건너뜀**.
명시적으로 전달한 플래그만 적용 → CI에서 머신 간 동일한 결과 보장.

| 로드할 것 | 플래그 |
|----------|--------|
| 시스템 프롬프트 추가 | `--append-system-prompt`, `--append-system-prompt-file` |
| 설정 | `--settings <file-or-json>` |
| MCP 서버 | `--mcp-config <file-or-json>` |
| 에이전트 | `--agents <json>` |
| 플러그인 | `--plugin-dir <path>` |

- OAuth/키체인 읽기도 건너뜀 → `ANTHROPIC_API_KEY` 또는 `apiKeyHelper` 필요
- **향후 `-p`의 기본 모드가 될 예정**

---

## 3. 출력 포맷

| 포맷 | 용도 |
|------|------|
| `text` (기본) | 플레인 텍스트 |
| `json` | result, session_id, 메타데이터 포함 JSON |
| `stream-json` | 실시간 토큰 스트리밍. 줄 단위 JSON 객체 |

### JSON Schema로 구조화 출력

```bash
claude -p "Extract function names from auth.py" \
  --output-format json \
  --json-schema '{"type":"object","properties":{"functions":{"type":"array","items":{"type":"string"}}},"required":["functions"]}'
```

→ `structured_output` 필드에 스키마 준수 결과.

### 스트리밍 + 텍스트 추출

```bash
claude -p "Write a poem" --output-format stream-json --verbose --include-partial-messages | \
  jq -rj 'select(.type == "stream_event" and .event.delta.type? == "text_delta") | .event.delta.text'
```

### 재시도 이벤트 (`system/api_retry`)

스트리밍 중 API 에러 시 재시도 전 이벤트 발행:

| 필드 | 설명 |
|------|------|
| `attempt` | 현재 시도 번호 (1부터) |
| `max_retries` | 최대 재시도 수 |
| `retry_delay_ms` | 다음 시도까지 대기 (ms) |
| `error_status` | HTTP 상태 코드 (연결 에러면 null) |
| `error` | 에러 카테고리 |

---

## 4. 도구 자동 승인

```bash
claude -p "Run tests and fix failures" --allowedTools "Bash,Read,Edit"
```

권한 모드 조합:

```bash
claude -p "Apply lint fixes" --permission-mode acceptEdits
claude -p "Fix all issues" --permission-mode dontAsk  # allow 규칙에 없으면 전부 거부
```

### Permission rule 문법

```bash
--allowedTools "Bash(git diff *),Bash(git log *),Bash(git commit *)"
```

- `Bash(git diff *)` → `git diff`로 시작하는 모든 명령 허용
- 공백 + `*`가 접두사 매칭. `Bash(git diff*)`는 `git diff-index`도 매칭되므로 주의

---

## 5. 시스템 프롬프트 커스터마이즈

```bash
gh pr diff "$1" | claude -p \
  --append-system-prompt "You are a security engineer. Review for vulnerabilities." \
  --output-format json
```

- `--append-system-prompt` — 기본 동작 유지 + 추가
- `--system-prompt` — 기본 프롬프트 완전 대체

---

## 6. 대화 이어가기

```bash
# 첫 요청
claude -p "Review this codebase for performance issues"

# 최근 대화 이어가기
claude -p "Now focus on the database queries" --continue

# 특정 세션 이어가기
session_id=$(claude -p "Start a review" --output-format json | jq -r '.session_id')
claude -p "Continue that review" --resume "$session_id"
```

---

## 7. 실전 패턴

### 커밋 생성

```bash
claude -p "Look at my staged changes and create an appropriate commit" \
  --allowedTools "Bash(git diff *),Bash(git log *),Bash(git status *),Bash(git commit *)"
```

### 파이프라인 중간 처리

```bash
cat error.log | claude -p "Explain the root cause" > analysis.txt
```

### CI 린터

```json
{
  "scripts": {
    "lint:claude": "claude -p 'look at changes vs. main and report typos'"
  }
}
```

---

## 8. `-p` 모드의 제한

- `/commit`, `/deploy` 같은 사용자 호출 스킬과 빌트인 커맨드는 사용 불가
- `PermissionRequest` 훅 미작동 → `PreToolUse` 훅 사용
- auto 모드에서 classifier 반복 차단 시 세션 중단 (사용자가 없으므로 fallback 불가)

> [insight] `--bare` 모드는 hooks, skills, plugins, MCP, auto memory, CLAUDE.md를 **전부 건너뛴다**. CI에서 머신 간 동일한 결과를 보장하려면 `--bare`가 필수다. 팀원의 `~/.claude/` 설정이나 프로젝트의 `.mcp.json`이 결과에 영향을 미치지 않는다. 향후 `-p`의 기본 모드가 될 예정이므로, 현재부터 `--bare`를 습관화하는 게 좋다.

> [insight] `--json-schema`로 응답을 스키마에 맞출 수 있다. 이는 Claude 출력을 파이프라인의 다음 단계에서 프로그래밍적으로 파싱해야 할 때 핵심이다. 하네스에서 Claude를 자동화 파이프라인의 중간 처리 단계로 쓴다면 `--output-format json --json-schema`가 표준 패턴.

> [insight] `--allowedTools`의 접두사 매칭에서 `Bash(git diff *)`와 `Bash(git diff*)`는 다르다. 공백 없이 `*`를 붙이면 `git diff-index` 같은 예상외 명령도 매칭된다. 보안상 공백 + `*` 패턴을 사용해야 한다.

> [insight] Agent SDK는 CLI(`claude -p`)와 Python/TypeScript 패키지 두 가지 인터페이스를 가진 하나의 시스템이다. 원문: *"It's available as a CLI for scripts and CI/CD, or as Python and TypeScript packages for full programmatic control."* — `claude -p`는 Agent SDK의 CLI 인터페이스이며, Python/TypeScript SDK가 내부적으로 `claude -p`를 호출하는지 API를 직접 호출하는지는 이 문서에서 명시하지 않는다. 하네스에서 Agent SDK를 활용할 때 이 관계를 정확히 파악하려면 Agent SDK 문서를 별도로 확인해야 한다.
