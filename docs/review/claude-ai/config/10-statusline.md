# Status Line — 커스텀 상태 바

---

터미널 하단에 표시되는 커스터마이즈 가능한 상태 바. 셸 스크립트가 JSON 세션 데이터를 받아서 원하는 정보를 표시한다.
컨텍스트 사용량, 비용, git 상태, 모델명 등을 한눈에 모니터링.

---

## 1. 설정

### `/statusline` 명령 (자동 생성)

```
/statusline show model name and context percentage with a progress bar
```

→ 스크립트 자동 생성 (`~/.claude/`) + settings 자동 업데이트.

### 수동 설정

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 2
  }
}
```

인라인도 가능:

```json
{ "statusLine": { "type": "command", "command": "jq -r '\"[\\(.model.display_name)] \\(.context_window.used_percentage // 0)% context\"'" } }
```

---

## 2. 동작 원리

```
Claude Code → JSON (stdin) → 스크립트 → stdout → 상태 바 표시
```

- **실행 시점**: 어시스턴트 메시지 후, 권한 모드 변경, vim 모드 토글
- **디바운스**: 300ms (빠른 변경은 배치)
- **취소**: 새 업데이트 시 진행 중 스크립트 취소
- **비용**: 로컬 실행, API 토큰 소비 없음
- 일부 UI 상호작용(자동완성, 도움말, 권한 프롬프트) 중 임시 숨김

### 출력 지원

- **여러 줄**: 각 `echo`/`print`가 별도 행
- **ANSI 색상**: `\033[32m` (green) 등
- **OSC 8 링크**: 클릭 가능한 URL (iTerm2, Kitty, WezTerm)

---

## 3. 주요 JSON 데이터 필드

| 필드 | 설명 |
|------|------|
| `model.id` / `model.display_name` | 현재 모델 |
| `workspace.current_dir` / `workspace.project_dir` | 현재/프로젝트 디렉토리 |
| `cost.total_cost_usd` | 세션 누적 비용 (USD) |
| `cost.total_duration_ms` | 세션 총 경과 시간 |
| `cost.total_api_duration_ms` | API 응답 대기 총 시간 |
| `cost.total_lines_added` / `total_lines_removed` | 변경된 코드 줄 수 |
| `context_window.used_percentage` | 컨텍스트 사용률 (%) |
| `context_window.remaining_percentage` | 컨텍스트 잔여율 |
| `context_window.context_window_size` | 최대 크기 (200K 또는 1M) |
| `context_window.current_usage` | 마지막 API 호출의 토큰 상세 (첫 호출 전 null) |
| `exceeds_200k_tokens` | 최근 응답이 200K 초과 여부 |
| `rate_limits.five_hour` / `seven_day` | 구독 rate limit 사용률 + 리셋 시간 (Pro/Max만) |
| `session_id` / `session_name` | 세션 식별 |
| `version` | Claude Code 버전 |
| `vim.mode` | NORMAL/INSERT (vim 모드 시) |
| `agent.name` | `--agent` 실행 시 에이전트명 |
| `worktree.*` | worktree 세션 정보 |

### context_window.current_usage 상세

| 필드 | 설명 |
|------|------|
| `input_tokens` | 현재 컨텍스트의 입력 토큰 |
| `output_tokens` | 생성된 출력 토큰 |
| `cache_creation_input_tokens` | 캐시에 쓴 토큰 |
| `cache_read_input_tokens` | 캐시에서 읽은 토큰 |

`used_percentage` = input + cache_creation + cache_read (output 미포함).

---

## 4. 실전 패턴 요약

| 패턴 | 핵심 |
|------|------|
| **컨텍스트 진행 바** | `used_percentage` → `▓░` 바 + 색상 (70% 노랑, 90% 빨강) |
| **Git 상태** | `git branch --show-current` + `git diff --cached/diff --numstat` + 색상 |
| **비용/시간 추적** | `cost.total_cost_usd` + `cost.total_duration_ms` → `$0.12 | 3m 45s` |
| **멀티라인** | 1줄: 모델+디렉토리+브랜치, 2줄: 진행바+비용+시간 |
| **클릭 링크** | OSC 8 escape로 git remote URL 클릭 가능 |
| **Rate limit** | `rate_limits.five_hour/seven_day.used_percentage` (Pro/Max) |
| **캐싱** | 고비용 명령(`git status`) 5초 캐시. 고정 파일명 사용 (PID 아님) |

---

## 5. Windows

Git Bash에서 실행. PowerShell 호출 가능:

```json
{ "statusLine": { "type": "command", "command": "powershell -NoProfile -File C:/Users/username/.claude/statusline.ps1" } }
```

---

## 6. 주의사항

- `disableAllHooks: true` → status line도 비활성화
- workspace trust 미승인 시 → "statusline skipped" 표시
- 느린 스크립트 → 상태 바 업데이트 지연. 빠르게 유지
- null 필드 → jq에서 `// 0` 또는 `// empty`로 폴백
- `total_input_tokens`는 누적이라 컨텍스트 크기 초과 가능. 정확한 비율은 `used_percentage` 사용

> [insight] Status line은 API 토큰을 소비하지 않는 로컬 전용 기능이다. 컨텍스트 사용률을 실시간 모니터링하면 "지금 컨텍스트가 얼마나 찼는지" 인지하면서 작업할 수 있다. 하네스에서 best practices 문서에서 강조한 "컨텍스트는 가장 중요한 리소스"를 실천하는 도구.

> [insight] `rate_limits` 필드는 Pro/Max 구독자만 제공된다. API 키 사용자에게는 없다. 하네스가 구독 기반 환경을 타겟한다면 rate limit 모니터링을 status line에 포함시키는 것이 유용.
