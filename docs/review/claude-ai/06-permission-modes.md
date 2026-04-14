# Permission Modes — 권한 모드

---

Claude가 파일 편집, 셸 명령, 네트워크 요청을 할 때 **얼마나 자주 승인을 요청하는지** 결정하는 모드.
민감한 작업에는 더 많은 감시를, 신뢰하는 방향에서는 더 적은 중단을 선택할 수 있다.

---

## 1. 6가지 모드 요약

| 모드 | 승인 없이 실행 가능한 것 | 적합한 상황 |
|------|----------------------|-----------|
| **`default`** | 읽기만 | 시작 단계, 민감한 작업 |
| **`acceptEdits`** | 읽기 + 파일 편집 | 코드 반복 작업 (나중에 diff로 리뷰) |
| **`plan`** | 읽기만 (편집 차단) | 코드베이스 탐색, 변경 전 분석 |
| **`auto`** | 전부 (백그라운드 안전 검사 포함) | 장시간 작업, 프롬프트 피로 감소 |
| **`dontAsk`** | 사전 허용된 도구만 | CI/CD, 잠금된 스크립트 환경 |
| **`bypassPermissions`** | protected paths 제외 전부 | 격리된 컨테이너/VM 전용 |

**모든 모드에서 protected paths 쓰기는 자동 승인되지 않음** (아래 참조).

모드는 기준선이고, 그 위에 permission rules(`allow`/`deny`)을 레이어링할 수 있다. `bypassPermissions`만 예외로 권한 레이어를 완전히 건너뜀.

---

## 2. 모드 전환 방법

| 방법 | 설명 |
|------|------|
| `Shift+Tab` | 세션 중 순환: default → acceptEdits → plan (+ 옵트인 모드) |
| `--permission-mode <mode>` | 시작 시 지정 |
| `settings.json` | `permissions.defaultMode` 로 기본값 설정 |

### Shift+Tab 순환 순서

```
default → acceptEdits → plan → [bypassPermissions*] → [auto*]
                                   ↑ 옵트인 필요        ↑ 옵트인 필요
```

- **auto**: `--enable-auto-mode` 또는 settings에서 활성화 후 순환에 포함
- **bypassPermissions**: `--permission-mode bypassPermissions` 또는 `--allow-dangerously-skip-permissions`로 시작 시 포함
- **dontAsk**: 순환에 포함되지 않음. `--permission-mode dontAsk`로만 설정

---

## 3. 각 모드 상세

### `default`

읽기만 자동 승인. 파일 편집과 셸 명령은 매번 프롬프트.

### `acceptEdits`

파일 편집 자동 승인 (작업 디렉토리 내). protected paths와 비편집 작업(셸 명령 등)은 여전히 프롬프트.
→ 편집 후 에디터나 `git diff`로 사후 리뷰하는 패턴에 적합.

### `plan` (계획 모드)

파일 읽기와 탐색용 셸 명령만 허용. **소스 편집 차단**. 계획을 작성하고 사용자에게 제시.

계획 승인 시 선택지:
- auto 모드로 전환하여 실행
- acceptEdits로 전환하여 실행
- 각 편집 수동 리뷰
- 피드백으로 계속 계획 수정
- Ultraplan으로 브라우저 기반 리뷰

각 승인 옵션에서 계획 컨텍스트 클리어 여부도 선택 가능.

### `auto` (자동 모드) — Research Preview

별도 **classifier 모델**(Sonnet 4.6)이 실행 전 액션을 검토. 요청 범위 초과, 미인식 인프라 대상, 적대적 콘텐츠 기반 행동을 차단.

**요구 조건:**
- Plan: Team, Enterprise, API (Pro/Max 불가)
- Admin이 활성화해야 함
- Model: Sonnet 4.6 또는 Opus 4.6
- Provider: Anthropic API만 (Bedrock/Vertex/Foundry 불가)

**기본 차단:**
- `curl | bash` 같은 외부 코드 다운로드+실행
- 민감 데이터 외부 전송
- 프로덕션 배포/마이그레이션
- 클라우드 스토리지 대량 삭제
- IAM/레포 권한 변경
- 공유 인프라 수정
- 세션 전 존재 파일의 비가역적 삭제
- force push, main 직접 push

**기본 허용:**
- 작업 디렉토리 내 로컬 파일 조작
- lock 파일/매니페스트에 선언된 의존성 설치
- `.env` 읽기 + 매칭 API로 크레덴셜 전송
- 읽기 전용 HTTP 요청
- 시작 브랜치 또는 Claude가 생성한 브랜치에 push

#### Classifier 동작 순서

```
1. allow/deny 규칙에 매칭 → 즉시 결정
2. 읽기 전용 + 작업 디렉토리 편집 → 자동 승인 (protected paths 제외)
3. 나머지 → classifier 판단
4. 차단 시 → Claude에게 이유 전달, 대안 시도
```

auto 모드 진입 시 **광범위한 allow 규칙이 드롭됨:**
- 포괄적 `Bash(*)`, 와일드카드 인터프리터(`Bash(python*)`), 패키지 매니저 run, `Agent` allow
- `Bash(npm test)` 같은 좁은 규칙은 유지
- auto 모드 종료 시 드롭된 규칙 복원

#### Classifier와 보안

- classifier는 유저 메시지, 도구 호출, CLAUDE.md를 봄
- **도구 결과(tool results)는 제거됨** → 파일/웹 내 적대적 콘텐츠가 classifier를 직접 조작 불가
- 별도 서버사이드 프로브가 도구 결과를 스캔하여 의심 콘텐츠를 Claude 읽기 전에 플래그

#### Fallback 조건

| 조건 | 동작 |
|------|------|
| 연속 3회 차단 | auto 일시정지 → 프롬프트 모드 전환 |
| 누적 20회 차단 | auto 일시정지 → 프롬프트 모드 전환 |
| 승인 후 | auto 재개 |
| 허용된 액션 | 연속 카운터 리셋 (누적은 유지) |
| 비대화형(`-p`) | 반복 차단 시 세션 중단 |

비설정 가능 임계값. 반복 차단은 보통 인프라 신뢰 설정 누락이 원인.

#### Subagent에서의 auto 모드

3단계 검사:
1. **스폰 전** — 작업 설명 평가 (위험하면 스폰 차단)
2. **실행 중** — 서브에이전트의 각 액션도 부모와 동일한 규칙으로 검사. 서브에이전트 frontmatter의 `permissionMode`는 무시됨
3. **완료 후** — 전체 액션 히스토리 리뷰. 문제 발견 시 결과에 보안 경고 추가

#### 비용/지연

- Classifier는 Sonnet 4.6으로 실행 (메인 모델과 무관)
- Classifier 호출도 토큰 사용량에 포함
- 읽기/작업 디렉토리 편집은 classifier를 건너뜀 → 오버헤드는 주로 셸 명령/네트워크 작업

### `dontAsk`

`permissions.allow`에 명시된 도구만 실행. `ask` 규칙도 프롬프트 없이 거부. 완전 비대화형 → CI/제한 환경용.

### `bypassPermissions`

모든 권한 검사 비활성화. protected paths만 프롬프트. **격리된 컨테이너/VM 전용**.
- 프롬프트 인젝션/의도치 않은 행동에 대한 보호 없음
- 관리자가 `permissions.disableBypassPermissionsMode: "disable"`로 차단 가능

---

## 4. Protected Paths — 어떤 모드에서도 자동 승인 안 됨

### 보호 디렉토리

| 경로 | 비고 |
|------|------|
| `.git` | 레포 상태 |
| `.vscode` | VS Code 설정 |
| `.idea` | JetBrains 설정 |
| `.husky` | git hooks |
| `.claude` | Claude 설정. **예외:** `.claude/commands`, `.claude/agents`, `.claude/skills`, `.claude/worktrees`는 Claude가 콘텐츠를 생성하므로 보호 대상에서 제외 |

### 보호 파일

`.gitconfig`, `.gitmodules`, `.bashrc`, `.bash_profile`, `.zshrc`, `.zprofile`, `.profile`, `.ripgreprc`, `.mcp.json`, `.claude.json`

### 모드별 보호 동작

| 모드 | protected path 쓰기 시 |
|------|---------------------|
| default, acceptEdits, plan, bypassPermissions | 프롬프트 |
| auto | classifier로 라우팅 |
| dontAsk | 거부 |

---

## 5. 모드 선택 가이드

```
어떤 작업인가?
├── 탐색/분석만 → plan
├── 코드 작성 (민감) → default
├── 코드 작성 (반복 이터레이션) → acceptEdits
├── 장시간 자율 작업 → auto (요구조건 충족 시)
├── CI/자동화 → dontAsk (사전 allow 규칙 필수)
└── 격리 컨테이너 → bypassPermissions
```

> [insight] auto 모드의 classifier는 **도구 결과를 보지 못한다** — tool results가 제거된 상태로 평가한다. 이는 파일이나 웹 페이지에 삽입된 적대적 콘텐츠(prompt injection)가 classifier를 직접 조작할 수 없게 하는 보안 설계다. 하네스 설계 시 auto 모드를 활용한다면 이 보안 경계를 이해하고, classifier가 보는 것(유저 메시지, 도구 호출, CLAUDE.md)과 보지 못하는 것(도구 결과)을 구분해야 한다.

> [insight] auto 모드 진입 시 광범위한 allow 규칙(`Bash(*)`, `Bash(python*)`, `Agent` 등)이 자동 드롭된다. 좁은 규칙(`Bash(npm test)`)만 유지. 즉 allow 규칙을 넓게 잡아놓고 auto 모드로 전환하면 예상과 다르게 동작할 수 있다. 하네스의 permission 설계는 auto 모드 전환 시 드롭되는 규칙을 감안해야 한다.

> [insight] `.claude` 디렉토리는 protected path이지만 `.claude/commands`, `.claude/agents`, `.claude/skills`, `.claude/worktrees`는 예외다. 이 예외 경로가 곧 Claude가 자율적으로 콘텐츠를 생성할 수 있는 확장 포인트다. 하네스의 확장 기능(skills, agents)은 이 예외 경로 안에서 동작하도록 설계되어 있다.
