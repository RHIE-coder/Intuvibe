# Sub-agents — 커스텀 서브에이전트

---

서브에이전트는 **독립 컨텍스트 윈도우**에서 실행되는 전문 AI 워커다.
자체 시스템 프롬프트, 도구 접근, 독립 권한을 가지며, 작업 완료 후 결과만 반환한다.

핵심 이점:
- **컨텍스트 보존** — 탐색/구현을 메인 대화 밖에서 수행
- **제약 강제** — 도구 접근 제한
- **행동 특화** — 도메인별 시스템 프롬프트
- **비용 제어** — Haiku 같은 저렴한 모델로 라우팅
- **재사용** — user-level 서브에이전트로 전 프로젝트 사용

---

## 1. 빌트인 서브에이전트

| 에이전트 | 모델 | 도구 | 용도 |
|---------|------|------|------|
| **Explore** | Haiku | 읽기 전용 (Write/Edit 차단) | 파일 탐색, 코드 검색. 정밀도 레벨: quick/medium/very thorough |
| **Plan** | 상속 | 읽기 전용 | plan mode에서 컨텍스트 수집. 재귀 방지 (서브에이전트는 서브에이전트 불가) |
| **General-purpose** | 상속 | 전체 | 복잡한 멀티스텝 작업 (탐색 + 수정) |
| statusline-setup | Sonnet | - | `/statusline` 설정 시 |
| Claude Code Guide | Haiku | - | Claude Code 기능 질문 시 |

---

## 2. 스코프와 우선순위

| 위치 | 스코프 | 우선순위 |
|------|--------|---------|
| Managed settings | 조직 전체 | 1 (최고) |
| `--agents` CLI flag | 현재 세션 | 2 |
| `.claude/agents/` | 프로젝트 | 3 |
| `~/.claude/agents/` | 전 프로젝트 (개인) | 4 |
| Plugin `agents/` | 플러그인 활성화 범위 | 5 (최저) |

같은 이름이면 높은 우선순위가 이김. `--add-dir`로 추가한 디렉토리는 스캔 안 됨.

---

## 3. Frontmatter 필드 전체

| 필드 | 필수 | 설명 |
|------|------|------|
| `name` | O | 고유 식별자. 소문자 + 하이픈 |
| `description` | O | Claude가 위임 판단에 사용하는 설명 |
| `tools` | - | 허용 도구 목록 (allowlist). 생략 시 전부 상속 |
| `disallowedTools` | - | 거부 도구 목록 (denylist). tools보다 먼저 적용 |
| `model` | - | `sonnet`/`opus`/`haiku`/전체 ID/`inherit`. 기본: inherit |
| `permissionMode` | - | `default`/`acceptEdits`/`auto`/`dontAsk`/`bypassPermissions`/`plan` |
| `maxTurns` | - | 최대 에이전틱 턴 수 |
| `skills` | - | 시작 시 프리로드할 스킬 (전체 내용 주입, 온디맨드 아님) |
| `mcpServers` | - | 인라인 정의 또는 기존 서버 이름 참조 |
| `hooks` | - | 서브에이전트 전용 라이프사이클 훅 |
| `memory` | - | 영구 메모리 스코프: `user`/`project`/`local` |
| `background` | - | `true` = 항상 백그라운드 실행 |
| `effort` | - | 세션 effort 오버라이드: `low`/`medium`/`high`/`max` |
| `isolation` | - | `worktree` = 격리된 git worktree에서 실행 |
| `color` | - | UI 표시 색상 |
| `initialPrompt` | - | `--agent`로 메인 세션 에이전트로 실행 시 첫 유저 턴으로 자동 제출 |

---

## 4. 모델 해석 우선순위

```
1. CLAUDE_CODE_SUBAGENT_MODEL 환경변수
2. 호출 시 model 파라미터
3. frontmatter model 필드
4. 메인 대화의 모델
```

---

## 5. 도구 제어

### tools (allowlist)

```yaml
tools: Read, Grep, Glob, Bash  # 이것만 허용, 나머지 차단
```

### disallowedTools (denylist)

```yaml
disallowedTools: Write, Edit  # 이것만 차단, 나머지 상속
```

둘 다 설정 시: disallowedTools 먼저 적용 → tools로 필터.

### Agent 스폰 제한 (`--agent`로 실행 시)

```yaml
tools: Agent(worker, researcher), Read, Bash  # worker, researcher만 스폰 가능
```

- `Agent` 생략 = 서브에이전트 스폰 불가
- 서브에이전트는 서브에이전트를 스폰할 수 없음 (재귀 방지)

### 서브에이전트 비활성화

```json
{ "permissions": { "deny": ["Agent(Explore)", "Agent(my-agent)"] } }
```

---

## 6. MCP 서버 스코핑

```yaml
mcpServers:
  - playwright:       # 인라인 정의: 이 서브에이전트만 사용
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
  - github            # 기존 서버 참조: 부모 세션 연결 공유
```

인라인 정의는 서브에이전트 시작 시 연결, 종료 시 해제. 메인 대화 컨텍스트에 도구 설명이 올라가지 않음 → 컨텍스트 절약.

---

## 7. 권한 모드

| 부모 모드 | 서브에이전트 동작 |
|----------|---------------|
| `bypassPermissions` | **무조건 상속**. frontmatter permissionMode 무시 |
| `auto` | **무조건 상속**. classifier가 서브에이전트 도구 호출도 평가 |
| 그 외 | frontmatter permissionMode로 오버라이드 가능 |

---

## 8. 스킬 프리로드

```yaml
skills:
  - api-conventions
  - error-handling-patterns
```

- 전체 스킬 내용이 서브에이전트 컨텍스트에 **주입** (온디맨드 아님)
- 부모 대화의 스킬을 상속하지 않음 → 명시적 나열 필수
- 역방향도 가능: 스킬의 `context: fork`로 스킬이 서브에이전트를 생성

---

## 9. 영구 메모리

| 스코프 | 위치 | 용도 |
|--------|------|------|
| `user` | `~/.claude/agent-memory/<name>/` | 전 프로젝트 학습 |
| `project` | `.claude/agent-memory/<name>/` | 프로젝트별 (VCS 공유 가능) — **권장 기본값** |
| `local` | `.claude/agent-memory-local/<name>/` | 프로젝트별 (VCS 제외) |

메모리 활성화 시:
- 시스템 프롬프트에 메모리 읽기/쓰기 지침 포함
- MEMORY.md의 200줄/25KB 로드
- Read, Write, Edit 도구 자동 활성화

---

## 10. Hooks

### 서브에이전트 frontmatter 내부 훅

서브에이전트 활성 시에만 실행, 종료 시 정리.

| 이벤트 | matcher | 발화 시점 |
|--------|---------|---------|
| `PreToolUse` | 도구 이름 | 도구 사용 전 |
| `PostToolUse` | 도구 이름 | 도구 사용 후 |
| `Stop` | (없음) | 서브에이전트 종료 (런타임에 `SubagentStop`으로 변환) |

### settings.json 레벨 훅 (메인 세션)

| 이벤트 | matcher | 발화 시점 |
|--------|---------|---------|
| `SubagentStart` | 에이전트 타입 이름 | 서브에이전트 시작 |
| `SubagentStop` | 에이전트 타입 이름 | 서브에이전트 완료 |

Hook으로 조건부 도구 제어 가능 (예: Bash는 허용하되 SQL write만 차단):

```yaml
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-readonly-query.sh"
```

exit code 2 = 차단 + stderr를 Claude에 에러로 전달.

---

## 11. 호출 방법

| 방법 | 설명 |
|------|------|
| **자동 위임** | Claude가 description 매칭으로 판단. "use proactively" 포함 시 적극적 위임 |
| **자연어** | "code-reviewer 서브에이전트로 리뷰해" |
| **@-mention** | `@"code-reviewer (agent)"` → 해당 서브에이전트 실행 보장 |
| **`--agent <name>`** | 전체 세션을 서브에이전트로 실행 (시스템 프롬프트 대체) |
| `agent` setting | `.claude/settings.json`에서 기본 에이전트 설정 |

---

## 12. 포그라운드 vs 백그라운드

| | 포그라운드 | 백그라운드 |
|---|---|---|
| **블로킹** | 완료까지 대기 | 동시 작업 가능 |
| **권한** | 대화형 프롬프트 통과 | 사전 승인, 미승인은 auto-deny |
| **질문** | AskUserQuestion 통과 | 실패하지만 계속 진행 |
| **전환** | - | `Ctrl+B`로 실행 중 백그라운드 전환 |
| **비활성화** | - | `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` |

---

## 13. 컨텍스트 관리

### Resume

각 호출은 새 인스턴스. 이전 작업을 이어가려면 Claude에게 resume 요청.
`SendMessage` 도구로 agent ID 지정하여 재개 (agent teams 활성 시).

트랜스크립트: `~/.claude/projects/{project}/{sessionId}/subagents/agent-{agentId}.jsonl`

- 메인 대화 compact 시 서브에이전트 트랜스크립트 영향 없음 (별도 저장)
- 세션 간 유지. 같은 세션 resume 시 서브에이전트도 재개 가능
- `cleanupPeriodDays` 기본 30일 후 자동 정리

### Auto-compaction

메인과 동일한 로직. 기본 ~95% 용량에서 트리거. `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`로 조기 트리거 가능.

---

## 14. 메인 대화 vs 서브에이전트 판단 기준

| 메인 대화 | 서브에이전트 |
|----------|------------|
| 자주 왕복/반복 수정 필요 | verbose 출력 격리 |
| 여러 단계가 컨텍스트 공유 | 도구 제한/권한 제한 필요 |
| 빠르고 타겟된 변경 | 자기 완결적, 요약 반환 가능 |
| 지연 민감 (서브에이전트는 컨텍스트 수집 시간 필요) | - |

서브에이전트 대신: **Skill** = 메인 대화 컨텍스트에서 재사용 프롬프트, **`/btw`** = 컨텍스트에 안 남는 빠른 질문.

> [insight] 서브에이전트의 시스템 프롬프트는 Claude Code 전체 시스템 프롬프트가 아닌 **축약 버전 + 환경 정보**만 받는다. 빌트인 Explore/Plan은 CLAUDE.md도 건너뛴다. 즉 서브에이전트는 메인 세션보다 더 가벼운 컨텍스트로 시작하며, `skills:` 필드로 필요한 지식만 선택적으로 주입하는 구조다.

> [insight] 서브에이전트는 서브에이전트를 스폰할 수 없다 (재귀 방지). 멀티 레벨 위임이 필요하면 메인에서 체이닝하거나 agent teams를 사용해야 한다. `--agent`로 세션 자체를 서브에이전트로 실행할 때는 `Agent(worker, researcher)` 같이 스폰 가능한 타입을 제한할 수 있다.

> [insight] Plugin 서브에이전트는 보안상 `hooks`, `mcpServers`, `permissionMode` frontmatter가 무시된다. 이 기능이 필요하면 에이전트 파일을 `.claude/agents/`로 복사해야 한다. 하네스에서 플러그인 배포 시 이 보안 제약을 감안해서 설계해야 한다.

> [insight] 서브에이전트의 MCP 인라인 정의는 메인 대화 컨텍스트에 도구 설명이 올라가지 않는다. 특정 서브에이전트에서만 쓰는 무거운 MCP 서버는 인라인으로 정의하면 메인 세션의 컨텍스트 비용을 0으로 유지할 수 있다.
