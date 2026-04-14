# Superpowers - Overview

> **Repo**: https://github.com/obra/superpowers
> **Author**: Jesse Vincent (Prime Radiant)
> **License**: MIT | **Language**: Shell | **Stars**: 142K+
> **Description**: "An agentic skills framework & software development methodology that works."

---

## 1. 핵심 철학

| 원칙 | 설명 |
|------|------|
| **Test-Driven Development** | 항상 테스트를 먼저 작성 |
| **Systematic over ad-hoc** | 프로세스 기반 접근, 추측 금지 |
| **Complexity reduction** | 단순성이 최우선 목표 |
| **Evidence over claims** | 완료 선언 전에 검증 |

> "The agent checks for relevant skills before any task. Mandatory workflows, not suggestions."

스킬은 **선택사항이 아니라 강제 워크플로우**다. 에이전트가 모든 작업 전에 관련 스킬을 확인하고 자동으로 적용한다.

---

## 2. 아키텍처 개요

```
superpowers/
├── .claude-plugin/       # Claude Code 플러그인 매니페스트
├── .cursor-plugin/       # Cursor 플러그인 매니페스트
├── .codex/               # Codex 통합
├── .opencode/            # OpenCode 통합
├── agents/               # 에이전트 역할 정의 (code-reviewer.md)
├── commands/             # 유저 직접 호출 명령 (brainstorm, execute-plan, write-plan)
├── hooks/                # 이벤트 훅 (session-start 등)
├── skills/               # 14+ 스킬 (SKILL.md 기반)
├── tests/                # 스킬 트리거 테스트, 통합 테스트
├── scripts/              # 유틸리티 스크립트
├── docs/                 # 문서, plans, specs
├── CLAUDE.md             # 기여 가이드라인 (= AGENTS.md)
├── GEMINI.md             # Gemini 통합 설정
└── README.md             # 프로젝트 소개
```

### 배포 방식: Plugin Marketplace

각 플랫폼별 plugin manifest를 통해 배포:
- **Claude Code**: `/plugin install superpowers@claude-plugins-official`
- **Cursor**: `/add-plugin superpowers`
- **Codex/OpenCode**: raw URL에서 INSTALL.md fetch
- **Gemini CLI**: `gemini extensions install`
- **Copilot CLI**: `copilot plugin install`

**Zero-dependency 설계** — 외부 의존성을 추가하는 PR은 거부된다 (새 harness 지원 제외).

---

## 3. 핵심 워크플로우 파이프라인 (7 Stages)

```
brainstorming → git-worktrees → writing-plans → execution → TDD → code-review → branch-completion
```

| Stage | 스킬 | 트리거 | 핵심 동작 |
|-------|------|--------|-----------|
| **1. Brainstorming** | `brainstorming` | 코드 작성 시도 전 | 소크라테스식 질문, 설계를 chunk로 나눠 검증 |
| **2. Git Worktrees** | `using-git-worktrees` | 설계 승인 후 | 격리된 workspace 생성, 테스트 베이스라인 확인 |
| **3. Planning** | `writing-plans` | 승인된 설계 존재 시 | 2-5분 단위 태스크로 분해, 파일경로/코드/검증 포함 |
| **4. Execution** | `subagent-driven-development` / `executing-plans` | 계획 존재 시 | 태스크별 서브에이전트 + 2단계 리뷰 (spec compliance → code quality) |
| **5. TDD** | `test-driven-development` | 구현 중 | RED-GREEN-REFACTOR. 테스트 전에 작성된 코드는 삭제 |
| **6. Code Review** | `requesting-code-review` | 태스크 간 | severity 기반 리뷰, critical이면 진행 차단 |
| **7. Branch Completion** | `finishing-a-development-branch` | 모든 태스크 완료 | 테스트 검증 → merge/PR/keep/discard 선택 → worktree 정리 |

### 핵심 설계 결정

- **Plans은 "enthusiastic junior engineer with poor taste, no judgement, no project context, and an aversion to testing"도 따를 수 있을 만큼 상세해야 한다** — 서브에이전트가 계획만으로 자율 작업하기 때문
- **2단계 리뷰**: spec compliance (계획 준수) → code quality (코드 품질) — 분리된 관심사
- **자율 운영**: 계획 수립 후 수시간 동안 인간 개입 없이 작업 가능

---

## 4. 스킬 분류

### Testing & Debugging
| 스킬 | 역할 |
|------|------|
| `test-driven-development` | RED-GREEN-REFACTOR 강제 (anti-patterns 참조 포함) |
| `systematic-debugging` | 4단계 root cause 분석 (root-cause-tracing, defense-in-depth, condition-based-waiting) |
| `verification-before-completion` | 완료 전 실제 동작 검증 |

### Collaboration & Workflow
| 스킬 | 역할 |
|------|------|
| `brainstorming` | 소크라테스식 설계 정제 |
| `writing-plans` | 상세 구현 계획 작성 |
| `executing-plans` | 배치 실행 + 인간 체크포인트 |
| `dispatching-parallel-agents` | 병렬 서브에이전트 워크플로우 |
| `requesting-code-review` | 리뷰 전 체크리스트 |
| `receiving-code-review` | 피드백 대응 |
| `using-git-worktrees` | 격리된 개발 브랜치 |
| `finishing-a-development-branch` | merge/PR 결정 워크플로우 |
| `subagent-driven-development` | 빠른 반복 + 2단계 리뷰 |

### Meta
| 스킬 | 역할 |
|------|------|
| `writing-skills` | 새 스킬 작성 방법론 (테스팅 포함) |
| `using-superpowers` | 시스템 소개 |

---

## 5. CLAUDE.md / AGENTS.md - 기여 가이드라인 핵심

두 파일은 **동일한 내용**. AI 에이전트의 PR에 대한 엄격한 품질 기준:

- **94% PR 거부율** — "슬롭 PR은 수시간 내 닫힘"
- **"human partner" 용어는 의도적** — "user"와 호환 불가, 변경 시 증거 필요
- **내부 스킬 철학 ≠ Anthropic의 공개 가이드** — 자체 테스트된 접근법 고수
- **스킬 수정 시 필수**: adversarial testing + before/after eval 결과

### 거부 대상 PR
- 서드파티 의존성 추가
- Anthropic 가이드 "준수"를 위한 스킬 변경 (eval 증거 없이)
- 프로젝트 특화 설정
- 벌크/스프레이 PR
- 추측적/이론적 수정
- 도메인 특화 스킬
- 포크 특화 변경
- 날조된 콘텐츠

---

## 6. 하네스 설계 관점에서의 시사점 (초기 메모)

| 관찰 | 의미 |
|------|------|
| 스킬이 자동 트리거됨 | "어떤 상황에서 어떤 스킬이 활성화되는가" 메커니즘이 핵심 |
| 서브에이전트 + 2단계 리뷰 | 에이전트 간 역할 분리와 품질 게이트 패턴 |
| Zero-dependency | 플러그인은 자기 완결적이어야 함 |
| 계획의 상세도 | 서브에이전트 자율성의 전제 조건 |
| Multi-platform manifest | 하나의 스킬셋이 여러 harness에 배포 가능한 추상화 |
| "mandatory, not suggestions" | 스킬은 opt-in이 아닌 강제 적용 |

---

**다음 단계**: Step 2 — `skills/using-superpowers/SKILL.md` deep dive → 스킬 시스템 진입점과 SKILL.md 포맷 이해
