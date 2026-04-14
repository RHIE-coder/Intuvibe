# Tools Reference — 빌트인 도구 전체 레퍼런스

---

도구명은 permission rules, 서브에이전트 tool lists, hook matchers에서 사용하는 **정확한 문자열**이다.
도구를 완전 비활성화하려면 `deny` 배열에 추가.
커스텀 도구 추가 → MCP 서버 연결. 프롬프트 기반 워크플로 → Skill 작성 (기존 `Skill` 도구로 실행).

---

## 1. 도구 목록

### 권한 불필요 (No Permission)

| 도구 | 동작 |
|------|------|
| `Agent` | 별도 컨텍스트 윈도우로 서브에이전트 스폰 |
| `AskUserQuestion` | 객관식 질문으로 요구사항 수집 / 모호성 해소 |
| `CronCreate` | 세션 내 반복/일회성 프롬프트 스케줄링 (세션 종료 시 소멸) |
| `CronDelete` | 스케줄 태스크 ID로 취소 |
| `CronList` | 세션의 모든 스케줄 태스크 목록 |
| `EnterPlanMode` | 코딩 전 접근 방식 설계 모드 전환 |
| `EnterWorktree` | 격리된 git worktree 생성 + 전환 |
| `ExitWorktree` | worktree 세션 종료 + 원래 디렉토리 복귀 |
| `Glob` | 패턴 매칭으로 파일 검색 |
| `Grep` | 파일 내용에서 패턴 검색 |
| `Read` | 파일 내용 읽기 |
| `LSP` | 언어 서버 코드 인텔리전스 (정의 이동, 참조 찾기, 타입 에러 등) |
| `ListMcpResourcesTool` | 연결된 MCP 서버의 리소스 목록 |
| `ReadMcpResourceTool` | URI로 특정 MCP 리소스 읽기 |
| `ToolSearch` | 지연 로드된 도구 검색 + 로드 (tool search 활성화 시) |
| `SendMessage` | 팀 메이트에게 메시지 전송 또는 서브에이전트 재개. `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 필요 |
| `TeamCreate` | 에이전트 팀 생성. 실험 기능 |
| `TeamDelete` | 에이전트 팀 해산 + 프로세스 정리. 실험 기능 |
| `TaskCreate` | 태스크 리스트에 새 태스크 생성 |
| `TaskGet` | 특정 태스크 상세 조회 |
| `TaskList` | 전체 태스크 + 현재 상태 목록 |
| `TaskUpdate` | 태스크 상태, 의존성, 상세 업데이트 또는 삭제 |
| `TaskStop` | 실행 중인 백그라운드 태스크 ID로 종료 |
| `TaskOutput` | **[Deprecated]** 백그라운드 태스크 출력 조회 → `Read`로 출력 파일 읽기 권장 |
| `TodoWrite` | 세션 태스크 체크리스트 관리. 비인터랙티브/Agent SDK 전용 (인터랙티브는 Task* 도구 사용) |

### 권한 필요 (Permission Required)

| 도구 | 동작 |
|------|------|
| `Bash` | 셸 명령 실행 |
| `Edit` | 파일 타겟 편집 |
| `Write` | 파일 생성/덮어쓰기 |
| `NotebookEdit` | Jupyter 노트북 셀 수정 |
| `ExitPlanMode` | 플랜 제출 + 플랜 모드 종료 |
| `Skill` | 메인 대화에서 스킬 실행 |
| `WebFetch` | URL에서 콘텐츠 가져오기 |
| `WebSearch` | 웹 검색 |
| `PowerShell` | Windows PowerShell 명령 (옵트인 프리뷰) |

> [insight] 권한이 필요한 도구 9개 vs 불필요 25개. 읽기/검색 계열은 모두 권한 불필요이고, 쓰기/실행 계열만 권한 필요. `ExitPlanMode`가 권한 필요인 이유는 플랜 승인 → 실행 전환이 사실상 "행동 허가"이기 때문. 하네스에서 `plan` 모드로 시작하면 `ExitPlanMode` 권한 승인이 실행 게이트 역할을 한다.

---

## 2. Bash 도구 동작

```
각 명령 = 별도 프로세스
```

| 지속 | 비지속 |
|------|--------|
| 작업 디렉토리 (`cd`) | 환경변수 (`export`) |

- `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR=1` → 각 명령 후 프로젝트 디렉토리로 리셋
- **virtualenv/conda** → Claude Code 실행 **전** 활성화
- **환경변수 지속** → `CLAUDE_ENV_FILE`에 셸 스크립트 경로 설정, 또는 `SessionStart` 훅으로 동적 생성

> [insight] Bash 도구에서 환경변수가 명령 간 지속되지 않는다는 것은 중요한 제약이다. `export PATH=$PATH:/new/path`를 한 명령에서 실행해도 다음 명령에는 적용 안 됨. `CLAUDE_ENV_FILE`이 이 제약의 공식 우회 경로.

---

## 3. LSP 도구 동작

파일 편집 후 **자동으로 타입 에러/경고 리포트** → 별도 빌드 없이 즉시 수정 가능.

### 직접 호출 기능

- 심볼 정의로 이동 (Go to Definition)
- 심볼의 모든 참조 찾기 (Find References)
- 위치의 타입 정보 조회
- 파일/워크스페이스 심볼 목록
- 인터페이스 구현체 찾기
- 호출 계층 추적

### 활성화 조건

**코드 인텔리전스 플러그인 설치 필요** → 플러그인이 언어 서버 설정을 번들, **서버 바이너리는 별도 설치**.

---

## 4. PowerShell 도구

Windows 전용 옵트인 프리뷰. Git Bash 대신 네이티브 PowerShell 실행.

### 활성화

```json
{ "env": { "CLAUDE_CODE_USE_POWERSHELL_TOOL": "1" } }
```

`pwsh.exe` (7+) 자동 감지, 없으면 `powershell.exe` (5.1) 폴백.
**Bash 도구는 함께 등록됨** → PowerShell 사용을 명시적으로 요청해야 할 수 있음.

### 셸 선택 설정

| 설정 | 위치 | 동작 | PowerShell 도구 필요 |
|------|------|------|---------------------|
| `"defaultShell": "powershell"` | settings.json | `!` 명령을 PowerShell로 라우팅 | O |
| `"shell": "powershell"` | 개별 hook | 해당 훅을 PowerShell로 실행 | X (직접 스폰) |
| `shell: powershell` | skill frontmatter | `` !`command` `` 블록을 PowerShell로 실행 | O |

### 프리뷰 제한

- Auto mode 미지원
- PowerShell 프로필 미로드
- 샌드박싱 미지원
- **네이티브 Windows만** (WSL 제외)
- Git Bash는 Claude Code 시작에 여전히 필요

---

## 5. 도구 확인 방법

```
What tools do you have access to?
```

→ Claude가 대화형 요약. MCP 도구 정확한 이름은 `/mcp`.

프로바이더, 플랫폼, 설정에 따라 사용 가능 도구가 달라진다.

---

## 6. 도구 분류 요약

| 카테고리 | 도구 |
|----------|------|
| **파일 I/O** | `Read`, `Edit`, `Write`, `Glob`, `Grep`, `NotebookEdit` |
| **실행** | `Bash`, `PowerShell` |
| **코드 인텔리전스** | `LSP` |
| **웹** | `WebFetch`, `WebSearch` |
| **에이전트** | `Agent`, `SendMessage`, `TeamCreate`, `TeamDelete` |
| **태스크** | `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `TaskStop`, `TaskOutput`, `TodoWrite` |
| **스케줄** | `CronCreate`, `CronDelete`, `CronList` |
| **플랜/워크트리** | `EnterPlanMode`, `ExitPlanMode`, `EnterWorktree`, `ExitWorktree` |
| **MCP** | `ListMcpResourcesTool`, `ReadMcpResourceTool`, `ToolSearch` |
| **기타** | `AskUserQuestion`, `Skill` |

> [insight] `TodoWrite`는 비인터랙티브/Agent SDK 전용이고, 인터랙티브에서는 `Task*` 도구 4개가 대체한다. 하네스에서 `claude -p` 파이프라인을 구축할 때는 `TodoWrite`가 태스크 관리 도구이고, 인터랙티브 세션에서는 `TaskCreate`/`TaskUpdate`가 올바른 도구.

> [insight] 33개 빌트인 도구 중 커스텀 도구 추가는 오직 MCP를 통해서만 가능하고, 스킬은 기존 `Skill` 도구 위에서 실행되는 프롬프트 워크플로다. 즉 도구 레벨의 확장 = MCP, 프롬프트 레벨의 확장 = Skill. 이 구분이 하네스 확장 설계의 핵심 분기점.
