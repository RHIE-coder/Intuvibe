# Compound Engineering - Overview

> **Repo**: https://github.com/EveryInc/compound-engineering-plugin
> **Author**: Kieran Klaassen (Every, Inc.)
> **License**: MIT | **Language**: TypeScript (Bun) | **Stars**: 13,764
> **Version**: 2.63.1 | **Platforms**: Claude Code + 11 targets (Codex, Cursor, Copilot, Gemini, etc.)
> **Description**: "Official Compound Engineering plugin for Claude Code, Codex, and more"

---

## 1. Superpowers / bkit과의 핵심 차이

| 측면 | Superpowers | bkit | Compound Engineering |
|------|-------------|------|---------------------|
| **철학** | TDD + 강제 워크플로우 | PDCA + Context Engineering | Compound (지식 축적) + 80/20 |
| **규모** | 14 skills, 1 agent | 38 skills, 36 agents, 607 JS | 42 skills, 60+ agents, TS CLI |
| **상태 관리** | Stateless | State machine (FSM) | Stateless (docs-based) |
| **자동화** | 단일 (강제) | L0-L4 5단계 | Tiered review + scope matching |
| **플랫폼** | 6개 | Claude Code only | **11개** (converter CLI) |
| **의존성** | Zero (bash) | Node.js v18+ | Bun + TypeScript |
| **접근** | Developer methodology | AI Native Dev OS | **Knowledge-compounding workflow** |
| **리뷰** | 2-Stage (Spec → Quality) | Council pattern | **28 reviewer personas** (병렬 dispatch) |
| **문서화** | 없음 | PDCA docs | **brainstorms → plans → solutions** |
| **Stars** | 142K | 485 | 13.7K |

---

## 2. 핵심 철학: Compound Engineering

### "Each unit of engineering work should make subsequent units easier—not harder."

**80/20 원칙**: 80% planning & review, 20% execution.

**Compounding loop**:
```
Brainstorm (WHAT) → Plan (HOW) → Work (DO) → Review (CHECK) → Compound (LEARN)
     ↑                                                              │
     └──────────────── knowledge feeds back ────────────────────────┘
```

**3가지 핵심**:
1. **Knowledge Codification**: 문제 해결 과정을 `docs/solutions/`에 기록 → 팀 지식으로 축적
2. **Right-Size Ceremony**: 작업 크기에 맞는 수준의 프로세스 (trivial → small → medium → large)
3. **Quality Built In**: 리뷰가 PR 전에 내장 (28 reviewer personas 병렬 dispatch)

### Superpowers/bkit과의 철학 차이

| | Superpowers | bkit | Compound |
|---|-------------|------|----------|
| **"프로세스를 강제한다"** | O (Iron Laws) | O (Quality Gates) | △ (right-size) |
| **"지식을 축적한다"** | X | X (audit만) | **O (docs/solutions/)** |
| **"크기에 맞춘다"** | X (모두 동일) | △ (Starter/Dynamic/Enterprise) | **O (trivial/small/medium/large)** |

---

## 3. 아키텍처 개요

### 프로젝트 구조

```
compound-engineering-plugin/
├── plugins/
│   ├── compound-engineering/    # 메인 플러그인
│   │   ├── agents/             # 60+ agents (6 카테고리)
│   │   │   ├── review/         # 28 review personas
│   │   │   ├── document-review/ # 7 document reviewers
│   │   │   ├── research/       # 8 research agents
│   │   │   ├── design/         # 3 design agents
│   │   │   ├── workflow/       # 4 workflow agents
│   │   │   └── docs/           # 1 docs agent
│   │   ├── skills/             # 42 skills
│   │   ├── commands/           # CLI commands
│   │   └── .claude-plugin/     # Plugin manifest
│   └── coding-tutor/           # Secondary plugin
├── src/                        # Converter CLI (TypeScript/Bun)
│   ├── commands/               # CLI commands (convert, install, list, sync)
│   ├── converters/             # Claude → Platform 변환
│   ├── targets/                # Platform-specific writers (11 targets)
│   ├── types/                  # Platform별 타입 정의
│   └── sync/                   # Config 동기화
├── docs/
│   ├── brainstorms/            # 20+ 요구사항 탐색 문서
│   ├── plans/                  # 30+ 구현 계획
│   ├── solutions/              # 분류별 해결책 문서
│   └── specs/                  # 8 플랫폼 스펙
├── tests/                      # 50+ 테스트 파일
├── AGENTS.md                   # Canonical repo instructions
└── package.json                # @every-env/compound-plugin
```

### Agent 분포 (60+)

| Category | 수 | 역할 |
|----------|:--:|------|
| **Review** | 28 | 코드 리뷰 personas (도메인별 전문가) |
| **Document Review** | 7 | 문서 리뷰 (적대적, 일관성, 설계, 실현가능성, 제품, 범위, 보안) |
| **Research** | 8 | 체계적 조사 (git history, issues, learnings, Slack) |
| **Design** | 3 | UI/UX (Figma sync, design iteration, implementation review) |
| **Workflow** | 4 | 자동화 (bug reproduction, lint, PR comments, spec flow) |
| **Docs** | 1 | README 작성 (Ankane style) |

### Skill 분포 (42)

| Category | 수 | 핵심 Skills |
|----------|:--:|-----------|
| **Core CE Workflow** | 7 | brainstorm, ideate, plan, work, review, compound, compound-refresh |
| **Git** | 4 | commit, commit-push-pr, worktree, clean-gone-branches |
| **Workflow Utils** | 12 | changelog, reproduce-bug, resolve-pr-feedback, todo-*, test-*, onboarding |
| **Dev Frameworks** | 5 | agent-native, andrew-kane-gem, dhh-rails-style, dspy-ruby, frontend-design |
| **Review & Quality** | 3 | permissions-optimizer, document-review, setup |
| **Content** | 3 | every-style-editor, proof, todo-create |
| **Automation** | 3 | agent-browser, gemini-imagegen, rclone |
| **Research** | 2 | ce-sessions, ce-slack-research |
| **Beta** | 1 | lfg (full autonomous) |

---

## 4. CE Workflow (핵심 5단계)

### ce:ideate → ce:brainstorm → ce:plan → ce:work → ce:review → ce:compound

| Phase | Skill | 질문 | 산출물 |
|-------|-------|------|--------|
| **Ideate** | ce:ideate | "어떤 아이디어가 탐색할 가치가 있는가?" | docs/ideation/ |
| **Brainstorm** | ce:brainstorm | "WHAT을 만들 것인가?" | docs/brainstorms/ |
| **Plan** | ce:plan | "HOW 만들 것인가?" | docs/plans/ |
| **Work** | ce:work | "실행" | Code + Tests |
| **Review** | ce:review | "품질 검증" | Review findings + autofix |
| **Compound** | ce:compound | "무엇을 배웠는가?" | docs/solutions/ |

### Scope Matching (Right-Size Ceremony)

| Complexity | Brainstorm | Plan | Review |
|:----------:|:----------:|:----:|:------:|
| **Trivial** | Skip | Skip | Tier 1 (self-review) |
| **Small** | Brief | Brief | Tier 1 or 2 |
| **Medium** | Full | Full | Tier 2 (personas) |
| **Large** | Full + ideate | Full + deep | Tier 2 (full personas) |

**Superpowers/bkit과의 차이**:
- Superpowers: 모든 것에 동일 프로세스 (brainstorming 필수, TDD 필수)
- bkit: Starter/Dynamic/Enterprise 3단계
- Compound: trivial/small/medium/large **4단계**, 각각에 다른 ceremony

---

## 5. Review System (28 Personas)

### 핵심 혁신: 도메인별 Reviewer Personas

```
ce:review 실행
  → Diff 분석 (크기, 도메인, 위험도)
  → 적절한 persona 동적 선택
  → 병렬 sub-agent dispatch
  → 각 persona가 structured JSON 반환
  → Merge + Dedup pipeline
  → Confidence-gated output
```

### Confidence Calibration

| Confidence | Action |
|:----------:|--------|
| >= 0.80 | 반드시 보고 |
| 0.60-0.79 | 보고 (context 포함) |
| < 0.60 | 억제 (false positive 방지) |

### Conditional Selection

```
diff >= 50줄 OR auth/payments/data → adversarial-reviewer 활성화
Rails 코드 → dhh-rails-reviewer + kieran-rails-reviewer
TypeScript → kieran-typescript-reviewer
DB migration → data-integrity-guardian + data-migrations-reviewer
```

### Review Tiers

| Tier | 용도 | 방법 |
|:----:|------|------|
| **Tier 2** (기본) | 대부분의 변경 | `ce:review mode:autofix` + personas 병렬 |
| **Tier 1** | 순수 추가, 단일 관심사, 패턴 따름 | Inline self-review (4 조건 모두 충족 시만) |

**Superpowers/bkit 대비**:
- Superpowers: 2-Stage (Spec Compliance → Code Quality)
- bkit: council 패턴 (합의 투표)
- Compound: **28 domain-specific personas** 병렬 dispatch + confidence gating

---

## 6. Knowledge Compounding

### ce:compound — "해결한 문제를 문서화"

```
문제 해결 직후
  → ce:compound 실행
  → 2가지 옵션: Full (연구 + 교차참조 + 리뷰) / Lightweight (단일 패스)
  → docs/solutions/{category}/ 에 저장
```

### Solutions 카테고리

| Category | 설명 |
|----------|------|
| `developer-experience/` | 로컬 개발, CI, 테스트 |
| `integrations/` | 크로스 플랫폼 버그, 호환성 |
| `workflow/` | 릴리스, todo 라이프사이클 |
| `skill-design/` | 스킬/에이전트 설계 패턴 |
| `best-practices/` | Codex 위임, 시각 보조 등 |

### Brainstorms → Plans → Solutions 흐름

```
docs/brainstorms/   → 탐색 ("이 문제를 어떻게 접근할까?")
docs/plans/         → 구현 계획 ("구체적으로 무엇을 어떤 순서로?")
docs/solutions/     → 해결책 기록 ("이렇게 풀었고, 이유는...")
```

**bkit과의 차이**: bkit은 `docs/01-plan/` ~ `docs/04-report/` PDCA 문서. Compound는 탐색/계획/해결 3종.

---

## 7. Cross-Platform Converter (11 targets)

### CLI

```bash
bunx @every-env/compound-plugin install compound-engineering --to codex
bunx @every-env/compound-plugin convert ./plugins/compound-engineering --to gemini
```

### 지원 플랫폼

| # | Target | Output Path |
|---|--------|-------------|
| 1 | **OpenCode** | `~/.config/opencode/` |
| 2 | **Codex** | `~/.codex/prompts` + `~/.codex/skills` |
| 3 | **Copilot** | `.github/` |
| 4 | **Droid** | `~/.factory/` |
| 5 | **Pi** | `~/.pi/agent/` |
| 6 | **Gemini** | `.gemini/` |
| 7 | **Kiro** | `.kiro/` |
| 8 | **OpenClaw** | `~/.openclaw/extensions/` |
| 9 | **Windsurf** | `~/.codeium/windsurf/` |
| 10 | **Qwen** | `~/.qwen/extensions/` |
| 11 | **Cursor** | Bespoke format |

**Superpowers**: 6 platforms (수동 매핑).
**bkit**: Claude Code only.
**Compound**: **11 platforms** (자동 converter CLI).

---

## 8. Agent Design Patterns

### model: inherit

```yaml
---
name: adversarial-reviewer
model: inherit      # 호출 스킬의 모델을 상속
color: red
---
```

**Superpowers/bkit 대비**:
- Superpowers: 서브에이전트별 모델 지정 (cheap/standard/capable)
- bkit: 에이전트별 명시 (opus/sonnet/haiku)
- Compound: **inherit** (호출 컨텍스트에서 상속)

### Fully-Qualified Agent References

```
compound-engineering:research:learnings-researcher    # 올바름
learnings-researcher                                  # 틀림 (다른 플러그인과 충돌)
```

### Self-Contained Skills (No Cross-Reference)

```
✅ references/post-ideation-workflow.md    (스킬 내부 파일)
❌ ../other-skill/shared.md                (스킬 간 참조 금지)
```

두 스킬이 같은 파일이 필요하면 **복제**. Claude Code의 skill resolution 버그 대응.

---

## 9. 연구 계획

```
docs/review/compound-engineering/
├── 01-overview.md                 ← 현재 문서
├── 02-ce-workflow.md              # CE 5단계: ideate → brainstorm → plan → work → review → compound
├── 03-agent-system.md             # 60+ agents, 6 categories, conditional selection, confidence
├── 04-skill-system.md             # 42 skills, frontmatter, references, scope matching
├── 05-cross-platform.md           # 11 targets, converter architecture, sync
├── 06-docs-and-knowledge.md       # brainstorms/plans/solutions, knowledge compounding
├── 07-testing-and-quality.md      # 50+ test files, review tiers, confidence calibration
└── 08-takeaways.md                # 하네스 시사점 + superpowers/bkit 비교
```

---

**다음 단계**: Step 2 — CE Workflow (ideate → brainstorm → plan → work → review → compound) deep dive
