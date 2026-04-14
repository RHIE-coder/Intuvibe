# CLI Reference — 명령어 & 플래그 전체 레퍼런스

---

`claude --help`에 **모든 플래그가 표시되지 않는다**. `--help`에 없다고 사용 불가가 아님.

---

## 1. 명령어

### 세션

| 명령 | 동작 |
|------|------|
| `claude` | 인터랙티브 세션 시작 |
| `claude "query"` | 초기 프롬프트와 함께 시작 |
| `claude -c` | 현재 디렉토리의 최근 대화 이어가기 |
| `claude -r <session> "query"` | ID 또는 이름으로 세션 재개 |

### SDK / 파이프라인

| 명령 | 동작 |
|------|------|
| `claude -p "query"` | 비인터랙티브 실행 후 종료 |
| `cat file \| claude -p "query"` | stdin 파이프 처리 |
| `claude -c -p "query"` | 이전 대화 이어서 비인터랙티브 실행 |

### 관리

| 명령 | 동작 |
|------|------|
| `claude update` | 최신 버전 업데이트 |
| `claude auth login` | Anthropic 계정 로그인. `--email`, `--sso`, `--console` 옵션 |
| `claude auth logout` | 로그아웃 |
| `claude auth status` | 인증 상태 JSON 출력 (`--text`로 사람용). exit code 0=로그인, 1=미로그인 |
| `claude agents` | 설정된 서브에이전트 목록 (소스별 그룹) |
| `claude auto-mode defaults` | 빌트인 auto mode 분류기 규칙 JSON. `claude auto-mode config`로 적용된 설정 확인 |
| `claude mcp` | MCP 서버 설정 관리 |
| `claude plugin` | 플러그인 관리 (alias: `claude plugins`) |
| `claude remote-control` | Remote Control 서버 시작 (로컬 인터랙티브 세션 없음) |

---

## 2. 플래그 — 세션 제어

| 플래그 | 동작 |
|--------|------|
| `--continue`, `-c` | 현재 디렉토리 최근 대화 로드 |
| `--resume`, `-r` | 세션 ID/이름으로 재개, 또는 인터랙티브 선택 |
| `--fork-session` | 재개 시 새 세션 ID 생성 (`--resume`/`--continue`와 함께) |
| `--from-pr <number>` | GitHub PR에 연결된 세션 재개. `gh pr create`로 자동 링크 |
| `--name`, `-n` | 세션 표시명 설정. `/resume`, 터미널 타이틀에 표시. `claude -r <name>`으로 재개 가능 |
| `--session-id` | 특정 UUID로 세션 생성/사용 |
| `--no-session-persistence` | 세션 디스크 저장 비활성화 (print 모드 전용) |

---

## 3. 플래그 — 모델 & 성능

| 플래그 | 동작 |
|--------|------|
| `--model` | 세션 모델 설정. alias (`sonnet`, `opus`) 또는 전체 모델명 |
| `--effort` | 세션 effort 레벨: `low`, `medium`, `high`, `max` (Opus 전용). 설정 파일 미저장 |
| `--fallback-model` | 기본 모델 과부하 시 자동 폴백 (print 모드 전용) |
| `--max-turns` | 에이전틱 턴 수 제한 (print 모드). 한도 도달 시 에러 종료. 기본 무제한 |
| `--max-budget-usd` | API 호출 비용 상한 (print 모드 전용) |

---

## 4. 플래그 — 시스템 프롬프트

| 플래그 | 동작 |
|--------|------|
| `--system-prompt` | 기본 시스템 프롬프트 **전체 교체** |
| `--system-prompt-file` | 파일 내용으로 시스템 프롬프트 **전체 교체** |
| `--append-system-prompt` | 기본 시스템 프롬프트 **끝에 추가** |
| `--append-system-prompt-file` | 파일 내용을 시스템 프롬프트 **끝에 추가** |

- `--system-prompt`과 `--system-prompt-file`은 **상호 배타** (동시 사용 불가)
- append 플래그는 교체 플래그와 **조합 가능**
- **대부분의 경우 append 사용 권장** — 빌트인 기능 유지하면서 요구사항 추가
- 교체는 시스템 프롬프트 **완전 제어**가 필요할 때만

> [insight] 시스템 프롬프트 4개 플래그 모두 인터랙티브/비인터랙티브 양쪽에서 동작한다. Output Style의 `keep-coding-instructions: false`와 `--system-prompt` 전체 교체는 모두 빌트인 코딩 지침을 제거하지만, Output Style은 설정 파일 기반이고 `--system-prompt`은 CLI 인자 기반이라 사용 맥락이 다르다. 하네스에서는 `--append-system-prompt`이 가장 안전한 진입점.

---

## 5. 플래그 — 권한 & 도구

| 플래그 | 동작 |
|--------|------|
| `--permission-mode` | 시작 권한 모드: `default`, `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions` |
| `--dangerously-skip-permissions` | `--permission-mode bypassPermissions`와 동일 |
| `--allow-dangerously-skip-permissions` | Shift+Tab 순환에 `bypassPermissions` 추가 (시작 모드는 다르게 설정 가능) |
| `--enable-auto-mode` | Shift+Tab 순환에 auto 모드 추가. Team/Enterprise/API + Sonnet 4.6/Opus 4.6 필요 |
| `--allowedTools` | 권한 프롬프트 없이 실행할 도구. 패턴 매칭 지원 |
| `--disallowedTools` | 모델 컨텍스트에서 **제거**. 사용 자체 불가 |
| `--tools` | 사용 가능한 빌트인 도구 제한. `""` = 전체 비활성, `"default"` = 전체, `"Bash,Edit,Read"` |
| `--permission-prompt-tool` | 비인터랙티브에서 권한 프롬프트 처리할 MCP 도구 지정 |

> [insight] `--allowedTools` vs `--disallowedTools` vs `--tools`의 차이가 중요하다. `allowedTools`는 자동 승인 (도구는 존재), `disallowedTools`는 컨텍스트에서 제거 (모델이 도구 존재 자체를 모름), `tools`는 사용 가능 도구 세트 자체를 제한. 하네스에서 보안 격리 시 `--disallowedTools`로 위험 도구를 모델 인식에서 완전 제거하는 것이 가장 강력.

---

## 6. 플래그 — 입출력 형식

| 플래그 | 동작 |
|--------|------|
| `--print`, `-p` | 비인터랙티브 실행 |
| `--output-format` | print 모드 출력 형식: `text`, `json`, `stream-json` |
| `--input-format` | print 모드 입력 형식: `text`, `stream-json` |
| `--json-schema` | 에이전트 완료 후 JSON Schema 검증된 구조화 출력 (print 모드) |
| `--include-hook-events` | 훅 라이프사이클 이벤트 포함 (`stream-json` 필요) |
| `--include-partial-messages` | 부분 스트리밍 이벤트 포함 (`-p` + `stream-json` 필요) |
| `--replay-user-messages` | stdin 유저 메시지를 stdout에 재출력 (`stream-json` 양방향 필요) |
| `--verbose` | 상세 로깅 (턴별 전체 출력) |

---

## 7. 플래그 — 환경 & 격리

| 플래그 | 동작 |
|--------|------|
| `--bare` | 최소 모드: hooks, skills, plugins, MCP, auto memory, CLAUDE.md 스킵. Bash/Read/Edit만 사용. `CLAUDE_CODE_SIMPLE` 설정. 빠른 스크립트 호출용 |
| `--worktree`, `-w` | 격리된 git worktree에서 시작 (`<repo>/.claude/worktrees/<name>`) |
| `--tmux` | worktree에 tmux 세션 생성 (`--worktree` 필요). iTerm2 네이티브 패인 자동 사용, `--tmux=classic`으로 전통 tmux |
| `--add-dir` | 추가 작업 디렉토리 (파일 접근 허용, `.claude/` 설정은 미탐색) |
| `--setting-sources` | 로드할 설정 소스: `user`, `project`, `local` (쉼표 구분) |
| `--settings` | 추가 설정 JSON 파일 또는 JSON 문자열 경로 |

---

## 8. 플래그 — 에이전트 & MCP

| 플래그 | 동작 |
|--------|------|
| `--agent` | 세션에 사용할 에이전트 지정 (설정의 `agent` 오버라이드) |
| `--agents` | JSON으로 동적 서브에이전트 정의. 프론트매터 필드명 + `prompt` 필드 |
| `--mcp-config` | MCP 서버 JSON 파일/문자열 로드 (공백 구분) |
| `--strict-mcp-config` | `--mcp-config`의 서버만 사용, 다른 MCP 설정 무시 |
| `--channels` | (리서치 프리뷰) 채널 알림 수신할 MCP 서버. `plugin:<name>@<marketplace>` 형식 |
| `--dangerously-load-development-channels` | 승인 목록 외 채널 로드 (로컬 개발용). 확인 프롬프트 |
| `--plugin-dir` | 세션 전용 플러그인 디렉토리 로드. 반복 지정으로 복수 디렉토리 |
| `--disable-slash-commands` | 세션의 모든 skills/commands 비활성화 |
| `--chrome` / `--no-chrome` | Chrome 브라우저 통합 활성화/비활성화 |

---

## 9. 플래그 — 원격 & 디버그

| 플래그 | 동작 |
|--------|------|
| `--remote` | claude.ai에서 새 웹 세션 생성 |
| `--remote-control`, `--rc` | Remote Control 활성화된 인터랙티브 세션 |
| `--remote-control-session-name-prefix` | Remote Control 자동 생성 세션명 접두사 (기본: 호스트명) |
| `--teleport` | 웹 세션을 로컬 터미널로 재개 |
| `--ide` | 시작 시 사용 가능한 IDE 자동 연결 |
| `--init` / `--init-only` | 초기화 훅 실행 후 인터랙티브/종료 |
| `--maintenance` | 유지보수 훅 실행 후 인터랙티브 |
| `--debug` | 디버그 모드. 카테고리 필터: `"api,hooks"`, `"!statsig,!file"` |
| `--debug-file <path>` | 디버그 로그를 특정 파일에 기록 (암시적 디버그 모드) |
| `--betas` | API 요청에 포함할 베타 헤더 (API 키 사용자 전용) |
| `--teammate-mode` | 에이전트 팀 표시 방식: `auto`, `in-process`, `tmux` |
| `--version`, `-v` | 버전 출력 |

---

## 10. 플래그 조합 패턴

### 하네스 파이프라인

```bash
# 최소 환경 + 구조화 출력
claude --bare -p --output-format json --json-schema '...' "query"

# 비용 제어 + 턴 제한
claude -p --max-budget-usd 2.00 --max-turns 5 "query"

# 커스텀 시스템 프롬프트 + 도구 제한
claude --system-prompt "You are a reviewer" --tools "Read" -p "review this"
```

### 보안 격리

```bash
# 읽기 전용 에이전트
claude --tools "Read" --permission-mode plan -p "analyze this codebase"

# 위험 도구 제거 + worktree 격리
claude -w review --disallowedTools "Bash(rm *)" "Bash(git push *)"
```

### 세션 관리

```bash
# 이름 있는 세션 → 나중에 재개
claude -n "auth-refactor"
claude -r "auth-refactor" "continue where we left off"

# PR 연결 세션
claude --from-pr 123
```

> [insight] `--bare`는 hooks/skills/plugins/MCP/CLAUDE.md를 모두 스킵하여 스크립트 호출을 빠르게 한다. 하네스에서 단순 파이프라인 태스크에는 `--bare`로 시작하고, 복잡한 태스크에만 풀 환경을 로드하는 이중 전략이 효율적. `CLAUDE_CODE_SIMPLE` 환경변수가 설정되므로 훅에서 bare 모드 감지도 가능.

> [insight] `--allowedTools`의 패턴 매칭에서 `"Bash(git log *)"` 같은 prefix 매칭이 지원된다. 하지만 Bash 패턴 기반 permission은 취약하다 (config/02-permissions.md 참조). `--disallowedTools`로 컨텍스트 자체에서 제거하는 것이 `--allowedTools`로 승인하는 것보다 보안 관점에서 더 확실한 차단.
