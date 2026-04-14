# Memory — CLAUDE.md와 Auto Memory

---

Claude Code 세션은 매번 빈 컨텍스트로 시작한다. 세션 간 지식을 이어주는 장치는 두 가지:
- **CLAUDE.md** — 사용자가 작성하는 영구 지침
- **Auto memory** — Claude가 스스로 작성하는 학습 노트

---

## 1. 두 메모리 시스템 비교

| | CLAUDE.md | Auto memory |
|---|---|---|
| **작성자** | 사용자 | Claude |
| **내용** | 지침과 규칙 | 학습과 패턴 |
| **스코프** | 프로젝트 / 사용자 / 조직 | working tree별 |
| **로딩** | 매 세션 전체 | 매 세션 (200줄 or 25KB 먼저 도달하는 쪽) |
| **용도** | 코딩 표준, 워크플로우, 아키텍처 | 빌드 명령, 디버깅 인사이트, 선호도 |

둘 다 **컨텍스트에 주입**되는 것이지 강제 설정이 아님 → 구체적이고 간결할수록 준수율이 올라감.

---

## 2. CLAUDE.md — 배치 위치와 스코프

| 스코프 | 위치 | 공유 범위 | 용도 |
|--------|------|----------|------|
| **Managed policy** | `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS) | 조직 전체 | 보안 정책, 컴플라이언스 |
| **Project** | `./CLAUDE.md` 또는 `./.claude/CLAUDE.md` | 팀 (VCS) | 프로젝트 아키텍처, 코딩 표준 |
| **User** | `~/.claude/CLAUDE.md` | 본인 (전 프로젝트) | 개인 스타일, 도구 단축키 |
| **Local** | `./CLAUDE.local.md` (.gitignore 추가) | 본인 (현재 프로젝트) | 개인 샌드박스 URL, 테스트 데이터 |

### 로딩 순서

```
작업 디렉토리에서 루트까지 상위 순회
  → 각 디렉토리의 CLAUDE.md + CLAUDE.local.md 수집
  → 전부 concat (override가 아닌 additive)
  → 같은 디렉토리 내에서는 CLAUDE.local.md가 CLAUDE.md 뒤에 붙음
  → 하위 디렉토리의 CLAUDE.md는 해당 디렉토리 파일 접근 시 온디맨드 로드
```

- Managed CLAUDE.md는 `claudeMdExcludes`로 제외 불가 (항상 적용)
- HTML 블록 주석(`<!-- ... -->`)은 컨텍스트 주입 전 제거됨 → 사람용 메모에 활용 가능

---

## 3. 효과적인 CLAUDE.md 작성법

| 원칙 | 나쁜 예 | 좋은 예 |
|------|--------|--------|
| **크기** | 500줄짜리 장문 | **200줄 이하**. 넘치면 `@path` 임포트 또는 rules로 분리 |
| **구조** | 밀집된 산문체 | 마크다운 헤더 + 불릿으로 그룹화 |
| **구체성** | "코드를 잘 포맷해라" | "2스페이스 인덴트 사용" |
| **일관성** | 서로 모순되는 규칙 | 정기적으로 리뷰해서 충돌/중복 제거 |

### `/init`으로 자동 생성

- `claude` 세션에서 `/init` 실행 → 코드베이스 분석 후 CLAUDE.md 초안 생성
- 이미 존재하면 개선 제안
- `CLAUDE_CODE_NEW_INIT=1` → 인터랙티브 다단계 플로우 (CLAUDE.md, skills, hooks 선택 → 서브에이전트 탐색 → 질문 → 리뷰 가능한 제안)

---

## 4. `@path` 임포트

```markdown
See @README for project overview and @package.json for available npm commands.
# Additional Instructions
- git workflow @docs/git-instructions.md
```

- 상대/절대 경로 모두 지원
- 상대 경로는 **해당 파일 기준** (작업 디렉토리 X)
- 재귀 임포트 최대 **5단계**
- 첫 임포트 시 승인 다이얼로그 표시 → 거부하면 비활성화

### worktree에서의 개인 설정

`CLAUDE.local.md`는 gitignored → 해당 worktree에만 존재. 여러 worktree에서 공유하려면:

```markdown
# Individual Preferences
- @~/.claude/my-project-instructions.md
```

### AGENTS.md 호환

다른 코딩 에이전트용 `AGENTS.md`가 있으면 CLAUDE.md에서 임포트:

```markdown
@AGENTS.md

## Claude Code
Use plan mode for changes under `src/billing/`.
```

---

## 5. `.claude/rules/` — 조건부 규칙

### 기본 구조

```
.claude/rules/
├── code-style.md     # paths 없음 → 매 세션 로드
├── testing.md        # paths: "**/*.test.ts" → 테스트 파일 작업 시만
└── security.md       # paths 없음 → 매 세션 로드
```

- 서브디렉토리 지원: `rules/frontend/react.md` 자동 발견
- 심링크 지원: 공유 규칙을 여러 프로젝트에 연결 가능

### path-specific rules

```markdown
---
paths:
  - "src/api/**/*.ts"
---
# API Development Rules
- All API endpoints must include input validation
```

| 패턴 | 매칭 |
|------|------|
| `**/*.ts` | 모든 디렉토리의 TS 파일 |
| `src/**/*` | src/ 하위 전체 |
| `*.md` | 프로젝트 루트의 마크다운 |
| `src/components/*.tsx` | 특정 디렉토리의 React 컴포넌트 |

brace expansion 지원: `"src/**/*.{ts,tsx}"`

### user-level rules

`~/.claude/rules/` — 모든 프로젝트에 적용되는 개인 규칙. 프로젝트 rules보다 낮은 우선순위.

---

## 6. 대규모 팀/모노레포 관리

### 조직 배포

Managed CLAUDE.md를 MDM/Ansible 등으로 배포. 개인 설정으로 제외 불가.

| 관심사 | 설정 위치 |
|--------|---------|
| 도구/명령/파일 경로 차단 | Managed settings: `permissions.deny` |
| 샌드박스 격리 | Managed settings: `sandbox.enabled` |
| 환경변수, API 라우팅 | Managed settings: `env` |
| 인증 방식, 조직 잠금 | Managed settings: `forceLoginMethod` |
| 코드 스타일, 품질 가이드라인 | **Managed CLAUDE.md** |
| 데이터 핸들링, 컴플라이언스 | **Managed CLAUDE.md** |

> 핵심 구분: **Settings = 기술적 강제**, **CLAUDE.md = 행동 가이드** (Claude 판단에 의존)

### `claudeMdExcludes`

모노레포에서 다른 팀의 CLAUDE.md를 건너뛰기:

```json
{
  "claudeMdExcludes": [
    "**/monorepo/CLAUDE.md",
    "/home/user/monorepo/other-team/.claude/rules/**"
  ]
}
```

- glob 패턴으로 절대 경로 매칭
- 모든 settings 레이어에서 설정 가능, 배열은 레이어 간 합산
- Managed CLAUDE.md는 제외 불가

### `--add-dir`로 추가 디렉토리

```bash
CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1 claude --add-dir ../shared-config
```

기본적으로 추가 디렉토리의 CLAUDE.md는 로드 안 됨. 환경변수 설정 필요.

---

## 7. Auto Memory

### 동작 방식

- Claude가 세션 중 자동으로 학습 노트 작성 (매 세션은 아님, 유용하다고 판단될 때만)
- 저장 위치: `~/.claude/projects/<project>/memory/`
- git 저장소 기준으로 같은 레포의 모든 worktree/하위 디렉토리가 하나의 메모리 공유
- **머신 로컬** — 기기 간, 클라우드 환경 간 공유 안 됨

```
~/.claude/projects/<project>/memory/
├── MEMORY.md          # 인덱스. 매 세션 시작 시 200줄/25KB 로드
├── debugging.md       # 토픽 파일. 온디맨드 로드
├── api-conventions.md # 토픽 파일. 온디맨드 로드
└── ...
```

### 로딩 규칙

| 파일 | 로딩 | 제한 |
|------|------|------|
| `MEMORY.md` | 매 세션 시작 | 200줄 또는 25KB (먼저 도달하는 쪽) |
| 토픽 파일 | 온디맨드 (Claude가 필요 시 읽기) | 제한 없음 |

> 200줄/25KB 제한은 MEMORY.md에만 적용. CLAUDE.md는 길이와 무관하게 전체 로드 (단, 길수록 준수율 하락).

### 설정

```json
// 비활성화
{ "autoMemoryEnabled": false }

// 커스텀 저장 위치 (user/local settings에서만 허용, project settings 불가)
{ "autoMemoryDirectory": "~/my-custom-memory-dir" }
```

환경변수: `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`

> `autoMemoryDirectory`는 보안상 `.claude/settings.json`(프로젝트)에서 설정 불가. 공유 프로젝트가 메모리 쓰기를 민감한 위치로 리다이렉트하는 것을 방지.

### 감사 및 편집

- `/memory` 명령 → 로드된 CLAUDE.md, rules, auto memory 목록 확인 + 에디터로 열기
- 전부 plain markdown → 직접 편집/삭제 가능
- "항상 pnpm 써" → auto memory에 저장
- "이거 CLAUDE.md에 추가해" → CLAUDE.md에 직접 기록

---

## 8. 트러블슈팅

### Claude가 CLAUDE.md를 안 따른다

- CLAUDE.md는 **시스템 프롬프트가 아닌 유저 메시지**로 전달됨 → 100% 준수 보장 안 됨
- `/memory`로 파일이 실제로 로드되는지 확인
- 지침을 더 구체적으로 작성
- 여러 파일 간 모순 확인
- 시스템 프롬프트 레벨이 필요하면 `--append-system-prompt` 사용 (매 실행마다 전달 필요)
- `InstructionsLoaded` 훅으로 어떤 지침 파일이 언제 로드되는지 디버깅

### CLAUDE.md가 너무 크다

- 200줄 이상이면 `@path` 임포트 또는 `.claude/rules/`로 분리

### `/compact` 후 지침이 사라졌다

- **CLAUDE.md는 compact에서 완전히 살아남는다** — 디스크에서 다시 읽어 재주입
- 사라진 것은 대화 중에만 언급된 지침 → CLAUDE.md에 기록해야 세션 간 유지

---

## 9. Managed settings vs Managed CLAUDE.md 판단 기준

```
기술적 강제가 필요한가?
├── YES → Managed settings (permissions.deny, sandbox, env 등)
│         Claude 판단과 무관하게 클라이언트가 강제 실행
└── NO  → Managed CLAUDE.md (코드 스타일, 컴플라이언스 가이드)
          Claude가 지침으로 읽고 따르려고 노력 (비강제)
```

> [insight] CLAUDE.md는 시스템 프롬프트가 아니라 **유저 메시지**로 전달된다. 따라서 100% 준수가 보장되지 않는다. 반드시 지켜야 하는 규칙(명령 차단, 샌드박스 등)은 settings의 permissions/deny로 **기술적으로 강제**해야 한다. CLAUDE.md에만 "rm -rf 쓰지 마"라고 써놓으면 보장이 없다.

> [insight] Auto memory의 `autoMemoryDirectory`는 프로젝트 settings에서 설정 불가다. 이유: 공유 프로젝트가 메모리 쓰기를 민감한 경로로 리다이렉트하는 보안 위험 때문. 하네스에서 auto memory 경로를 커스터마이즈하려면 user/local settings 레벨에서만 가능하다는 제약.

> [insight] `/compact` 후 CLAUDE.md는 디스크에서 재로드되어 살아남지만, 대화 중에만 주어진 지침은 소실된다. 즉 세션 간 유지되어야 하는 규칙은 반드시 CLAUDE.md 또는 rules 파일에 기록해야 한다. "나중에 추가해야지"로 미루면 compact 한 번에 날아간다.

> [insight] Claude Code의 컨텍스트는 **시스템 프롬프트(불변) + 유저 메시지(확장 가능)** 2계층 구조다. 시스템 프롬프트(~4,200 토큰)는 Anthropic이 하드코딩한 핵심 동작 지침(도구 사용법, 응답 포맷, 안전 규칙)이며 사용자가 수정할 수 없다. CLAUDE.md, auto memory, skill descriptions, MCP 도구 이름 등은 전부 유저 메시지 영역에 주입된다. 시스템 프롬프트에 개입하는 수단은 `--append-system-prompt`(매 실행마다 전달 필요)와 `output-styles`(시스템 프롬프트 섹션 추가/대체) 두 가지뿐이다. 하네스 설계 시 "반드시 지켜야 하는 규칙"과 "가이드라인"을 구분해서, 전자는 settings(기술 강제) 또는 시스템 프롬프트 레벨, 후자는 CLAUDE.md(유저 메시지)로 배치해야 한다.
