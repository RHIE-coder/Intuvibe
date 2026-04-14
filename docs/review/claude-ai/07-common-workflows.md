# Common Workflows — 일상 개발 워크플로우

---

Claude Code를 활용한 일상 개발 패턴을 정리한다.
코드베이스 탐색, 버그 수정, 리팩토링, 테스트, PR 생성, 세션 관리, 스케줄링, 유닉스 유틸리티 활용까지.

---

## 1. 코드베이스 이해

### 빠른 개요

```
cd /path/to/project && claude
> give me an overview of this codebase
> explain the main architecture patterns used here
> what are the key data models?
```

팁: 넓은 질문 → 좁은 질문 순서. 프로젝트 용어 사용. code intelligence 플러그인 설치 시 정의/참조 탐색 가능.

### 관련 코드 찾기

```
> find the files that handle user authentication
> how do these authentication files work together?
> trace the login process from front-end to database
```

---

## 2. 버그 수정

```
> I'm seeing an error when I run npm test
> suggest a few ways to fix the @ts-ignore in user.ts
> update user.ts to add the null check you suggested
```

팁: 재현 명령과 스택 트레이스 제공. 간헐적/지속적 여부 언급.

---

## 3. 리팩토링

```
> find deprecated API usage in our codebase
> suggest how to refactor utils.js to use modern JavaScript features
> refactor utils.js to use ES2024 features while maintaining the same behavior
> run tests for the refactored code
```

팁: 작고 테스트 가능한 단위로 점진적 리팩토링.

---

## 4. 서브에이전트 활용

- `/agents` — 사용 가능한 서브에이전트 확인 + 새로 생성
- Claude가 적절한 작업을 자동 위임하거나, 명시적으로 지정 가능
- 커스텀 서브에이전트: `.claude/agents/`에 생성 (팀 공유)
- 설정 항목: 식별자, 언제 사용할지(description), 도구 접근 범위(tools), 시스템 프롬프트

---

## 5. Plan Mode 활용

코드베이스 분석 → 계획 수립 → 승인 후 실행의 2단계 워크플로우.

**적합한 상황:**
- 여러 파일에 걸친 멀티스텝 구현
- 변경 전 코드베이스 리서치
- Claude와 방향을 반복 조율하고 싶을 때

**시작 방법:**
- 세션 중 `Shift+Tab` 2번
- `claude --permission-mode plan`
- headless: `claude --permission-mode plan -p "분석 프롬프트"`

**계획 승인 시 옵션:**
- auto 모드로 실행 / acceptEdits로 실행 / 수동 리뷰 / 계속 계획 수정 / Ultraplan
- 각 옵션에서 계획 컨텍스트 클리어 여부 선택 가능
- `Ctrl+G` — 계획을 외부 에디터에서 편집

계획 수락 시 세션 이름이 계획 내용에서 자동 생성 (`--name`이나 `/rename`으로 이미 설정된 경우는 덮어쓰지 않음).

---

## 6. 테스트

```
> find functions in NotificationsService.swift that are not covered by tests
> add tests for the notification service
> add test cases for edge conditions in the notification service
> run the new tests and fix any failures
```

- Claude가 기존 테스트 파일의 스타일/프레임워크/어서션 패턴을 분석하여 일관된 테스트 생성
- 엣지 케이스(에러 조건, 경계값, 예상외 입력) 식별 요청 가능

---

## 7. PR 생성

```
> summarize the changes I've made to the authentication module
> create a pr
> enhance the PR description with more context about the security improvements
```

- `gh pr create` 사용 시 세션이 해당 PR에 자동 링크
- 나중에 `claude --from-pr <number>`로 세션 재개 가능

---

## 8. 문서화

```
> find functions without proper JSDoc comments in the auth module
> add JSDoc comments to the undocumented functions in auth.js
> improve the generated documentation with more context and examples
```

---

## 9. 이미지 작업

입력 방법:
1. 드래그 앤 드롭
2. `Ctrl+V`로 붙여넣기 (Cmd+V 아님)
3. 파일 경로 직접 제공

활용: 에러 스크린샷 분석, UI 디자인 구현, 다이어그램 기반 코드 생성.
`[Image #1]` 같은 참조를 `Cmd+Click`으로 열기 가능.

---

## 10. 파일/디렉토리 참조 (`@`)

```
> Explain the logic in @src/utils/auth.js     # 파일 전체 내용 포함
> What's the structure of @src/components      # 디렉토리 목록
> Show me the data from @github:repos/owner/repo/issues  # MCP 리소스
```

- 상대/절대 경로 모두 지원
- `@` 파일 참조 시 해당 파일 디렉토리와 상위의 CLAUDE.md도 컨텍스트에 추가
- 디렉토리 참조 = 파일 목록 (내용 아님)

---

## 11. Extended Thinking (사고 모드)

기본 활성화. 복잡한 문제를 단계적으로 추론 후 응답.

### 설정

| 범위 | 방법 | 상세 |
|------|------|------|
| **Effort level** | `/effort`, `/model`, `CLAUDE_CODE_EFFORT_LEVEL` | Opus/Sonnet 4.6 적응형 추론 깊이 조절 |
| **ultrathink** | 프롬프트에 "ultrathink" 포함 | 해당 턴만 높은 effort. Opus/Sonnet 4.6 전용 |
| **토글** | `Option+T` / `Alt+T` | 세션 내 사고 모드 온오프 |
| **글로벌** | `/config`에서 토글 | `alwaysThinkingEnabled` |
| **토큰 제한** | `MAX_THINKING_TOKENS` 환경변수 | Opus/Sonnet 4.6에서는 0(비활성화)만 적용. 적응형 추론 비활성화 시(`CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1`) 고정 예산 사용 |

- `Ctrl+O` — verbose 모드 토글. 내부 추론 과정을 회색 이탤릭으로 표시
- "think", "think hard" 등은 일반 프롬프트 지시로 해석됨 (사고 토큰 할당 X)
- 사고 토큰은 요약이 생략되어도 **과금**됨
- `showThinkingSummaries: true` 설정으로 전체 요약 표시 가능

---

## 12. 세션 관리

### 재개

| 명령 | 동작 |
|------|------|
| `claude --continue` (`-c`) | 현재 디렉토리의 가장 최근 세션 |
| `claude --resume [name]` (`-r`) | 이름/ID로 재개 또는 picker |
| `claude --from-pr 123` | 특정 PR에 연결된 세션 재개 |
| `/resume` | 세션 중 다른 대화로 전환 |

- 세션은 프로젝트 디렉토리별 저장
- picker는 같은 git 레포의 인터랙티브 세션 표시 (worktree 포함)
- `claude -p`나 SDK로 생성한 세션은 picker에 안 나옴 (ID 직접 전달로 재개 가능)

### 세션 이름 지정

```bash
claude -n auth-refactor           # 시작 시
/rename auth-refactor             # 세션 중
```

picker에서 `R`로 이름 변경 가능.

### Picker 단축키

| 키 | 동작 |
|----|------|
| `↑`/`↓` | 세션 탐색 |
| `→`/`←` | 그룹 펼치기/접기 |
| `Enter` | 선택 및 재개 |
| `P` | 프리뷰 |
| `R` | 이름 변경 |
| `/` | 검색 |
| `A` | 현재 디렉토리/전체 프로젝트 토글 |
| `B` | 현재 git 브랜치로 필터 |

fork된 세션(`/branch`, `/rewind`, `--fork-session`)은 루트 세션 아래 그룹핑.

---

## 13. Git Worktree — 병렬 세션

### 기본 사용

```bash
claude --worktree feature-auth     # .claude/worktrees/feature-auth/ 생성
claude --worktree bugfix-123       # 별도 worktree
claude --worktree                  # 자동 이름 생성
```

- `<repo>/.claude/worktrees/<name>`에 생성
- `origin/HEAD`에서 분기, 브랜치명 `worktree-<name>`
- `origin/HEAD` 동기화: `git remote set-head origin -a`

### Worktree 정리

| 상태 | 동작 |
|------|------|
| 변경 없음 | worktree + 브랜치 자동 삭제 |
| 변경/커밋 존재 | 유지/삭제 프롬프트 |
| 서브에이전트 worktree (크래시 등으로 고아) | `cleanupPeriodDays` 경과 후 자동 삭제 (tracked 파일 변경 없고 unpushed 커밋 없을 때) |

### `.worktreeinclude`

gitignored 파일을 worktree에 자동 복사:

```
.env
.env.local
config/secrets.json
```

### 서브에이전트 worktree

agent frontmatter에 `isolation: worktree` 추가. 완료 후 변경 없으면 자동 정리.

### 비git VCS

WorktreeCreate/WorktreeRemove 훅으로 커스텀 로직 구현. `.worktreeinclude`는 처리 안 됨.

---

## 14. 알림 설정 (Notification Hook)

장시간 작업 중 Claude가 대기 상태가 되면 데스크톱 알림:

```json
// ~/.claude/settings.json
{
  "hooks": {
    "Notification": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "osascript -e 'display notification \"Claude Code needs your attention\" with title \"Claude Code\"'"
      }]
    }]
  }
}
```

| matcher | 발화 조건 |
|---------|---------|
| `permission_prompt` | 도구 승인 필요 |
| `idle_prompt` | 작업 완료, 다음 프롬프트 대기 |
| `auth_success` | 인증 완료 |
| `elicitation_dialog` | Claude가 질문 중 |

---

## 15. Unix 유틸리티로 활용

### 빌드 스크립트에 추가

```json
{
  "scripts": {
    "lint:claude": "claude -p 'you are a linter. please look at the changes vs. main and report any issues related to typos. report the filename and line number on one line, and a description of the issue on the second line. do not return any other text.'"
  }
}
```

### 파이프

```bash
cat build-error.txt | claude -p 'concisely explain the root cause of this build error' > output.txt
```

### 출력 포맷

| 포맷 | 용도 |
|------|------|
| `--output-format text` | 기본. Claude 텍스트 응답만 |
| `--output-format json` | 메타데이터 포함 JSON 배열 (비용, 시간) |
| `--output-format stream-json` | 실시간 JSON 객체 스트림 (개별은 유효 JSON, 전체 concat은 X) |

---

## 16. 스케줄 실행

| 옵션 | 실행 위치 | 적합한 상황 |
|------|----------|-----------|
| **Cloud scheduled tasks** | Anthropic 인프라 | 컴퓨터 꺼져도 실행. claude.ai/code에서 설정 |
| **Desktop scheduled tasks** | 내 머신 (데스크톱 앱) | 로컬 파일/도구/미커밋 변경 접근 필요 |
| **GitHub Actions** | CI 파이프라인 | 레포 이벤트나 cron에 연동 |
| **`/loop`** | 현재 CLI 세션 | 세션 열려 있는 동안 빠른 폴링. 종료 시 취소 |

팁: 자율 실행이므로 성공 조건과 결과 처리를 명시적으로 기술해야 함.

> [insight] `claude -p`와 `--output-format`을 조합하면 Claude를 완전한 Unix 파이프라인 도구로 쓸 수 있다. 린터, 코드 리뷰어, 로그 파서 등을 별도 도구 없이 프롬프트 하나로 구성 가능. 하네스의 자동화 파이프라인에서 Claude를 중간 처리 단계로 끼워넣는 패턴에 활용할 수 있다.

> [insight] `--from-pr <number>`로 PR에 연결된 세션을 재개할 수 있다. `gh pr create` 시 세션이 자동 링크되므로, PR 기반 워크플로우에서 컨텍스트를 잃지 않고 이어갈 수 있다. 하네스에서 PR 리뷰 → 수정 → 재리뷰 사이클을 설계할 때 유용하다.

> [insight] Worktree는 `origin/HEAD` 기준으로 분기하는데, 리모트의 기본 브랜치가 변경되어도 로컬 `origin/HEAD`는 자동 갱신되지 않는다. `git remote set-head origin -a`로 수동 동기화 필요. 또는 WorktreeCreate 훅으로 분기 기준을 완전히 커스터마이즈할 수 있다.
