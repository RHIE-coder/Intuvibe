# bkit - Overview

> **Repo**: https://github.com/popup-studio-ai/bkit-claude-code
> **Author**: POPUP STUDIO PTE. LTD.
> **License**: Apache 2.0 | **Language**: JavaScript | **Stars**: 485
> **Version**: 2.1.1 | **Claude Code**: v2.1.78+ (recommended v2.1.96+)
> **Description**: "PDCA methodology + CTO-Led Agent Teams + AI coding assistant mastery for AI-native development"

---

## 1. Superpowers와의 핵심 차이

| 측면 | Superpowers | bkit |
|------|-------------|------|
| **철학** | TDD + 스킬 자동 트리거 | PDCA + Context Engineering |
| **규모** | 14 skills, 1 agent, 순수 Markdown/Shell | 38 skills, 36 agents, 607 JS 함수, 84 lib 모듈 |
| **상태 관리** | 없음 (stateless) | State machine (20 transitions, 9 guards) |
| **자동화 레벨** | 단일 (강제 적용) | L0-L4 5단계 (Manual → Full-Auto) |
| **플랫폼** | 6개 (Claude, Cursor, Codex, OpenCode, Copilot, Gemini) | Claude Code 전용 |
| **의존성** | Zero-dependency (bash only) | Node.js v18+ 필수 |
| **접근** | "Developer methodology" | "AI Native Development OS" |
| **테스트** | pressure scenario + headless | Skill Evals (29 eval definitions) + A/B testing |
| **문서** | Obsidian 없음 | Obsidian Graph View 최적화 |

---

## 2. 핵심 철학

### 3가지 Core Philosophies

| 철학 | 설명 | 구현 |
|------|------|------|
| **Automation First** | 유저가 명령을 몰라도 Claude가 자동으로 PDCA 적용 | State machine + Workflow Engine + L0-L4 |
| **No Guessing** | 모르면 문서 확인 → 문서에 없으면 유저에게 질문 (추측 금지) | gap-detector + design-validator + quality gates |
| **Docs = Code** | 설계 먼저, 구현 나중에 (설계-구현 동기화 유지) | PDCA workflow + `/pdca analyze` + regression guard |

### 4가지 Controllable AI Principles (v2.0.0)

| 원칙 | 설명 |
|------|------|
| **Safe Defaults** | L2 Semi-Auto가 기본. full automation으로 시작 안 함 |
| **Progressive Trust** | 신뢰는 실적으로 획득, 가정하지 않음 (Trust Score 0-100) |
| **Full Visibility** | 모든 AI 결정은 추적/감사 가능 (JSONL audit trail) |
| **Always Interruptible** | 유저가 언제든 pause/stop 가능 (emergency stop, checkpoint/rollback) |

### Context Engineering 정의

```
Traditional Prompt Engineering: "좋은 프롬프트 작성법"
Context Engineering: "프롬프트, 도구, 상태를 통합하여 LLM에 최적 컨텍스트를 제공하는 시스템 설계"
```

bkit = Context Engineering의 실용적 구현체.

---

## 3. 아키텍처 개요

### 3-Layer Context Engineering

| Layer | 구성요소 | 역할 |
|-------|---------|------|
| **Domain Knowledge** | 38 Skills | 구조화된 전문 지식 (phases, levels, specialized domains) |
| **Behavioral Rules** | 36 Agents | 역할 기반 제약 + 모델 선택 (opus/sonnet/haiku) |
| **State Management** | 607 Functions | PDCA state machine, workflow engine, automation control, audit, quality gates |

### 6-Layer Hook System

```
Layer 1: hooks.json (Global)     → 21 hook events
Layer 2: Skill Frontmatter       → Domain-specific hooks (deprecated → hooks.json으로 이관)
Layer 3: Agent Frontmatter       → Task-specific hooks with constraints
Layer 4: Description Triggers    → 8개 언어 semantic matching
Layer 5: Scripts (42 modules)    → Node.js 실행 로직
Layer 6: Plugin Data Backup      → ${CLAUDE_PLUGIN_DATA} persistent state
```

### 디렉토리 구조

```
bkit-claude-code/
├── .claude-plugin/         # Plugin manifest + marketplace
├── agents/                 # 36 agents (11 opus / 19 sonnet / 2 haiku)
├── skills/                 # 38 skills (18 Workflow / 18 Capability / 1 Hybrid)
├── commands/               # CLI commands (/bkit, /output-style-setup)
├── hooks/                  # hooks.json (21 events)
├── scripts/                # 42 hook execution scripts (Node.js)
├── lib/                    # 84 modules, 12 subdirs, 607 exports
│   ├── core/               # paths, cache, config
│   ├── pdca/               # state machine, lifecycle, workflow
│   ├── intent/             # intent detection
│   ├── task/               # task management
│   ├── team/               # agent team coordination
│   ├── ui/                 # CLI dashboard
│   ├── audit/              # audit logger, decision tracer
│   ├── control/            # automation controller, trust engine
│   ├── quality/            # gate manager, metrics, regression
│   ├── adapters/           # platform adapters
│   ├── context/            # living context system
│   └── ...
├── servers/                # MCP servers (bkit-pdca + bkit-analysis)
├── evals/                  # Skill evals (29 definitions) + A/B tester
├── output-styles/          # 4 response formatting styles
├── templates/              # Document templates
├── bkit-system/            # 시스템 문서 (Obsidian-optimized)
├── docs/                   # PDCA documents (plan/design/analysis/report)
├── bkit.config.json        # Centralized configuration
└── test/                   # 194 files, ~4,028 TC
```

---

## 4. PDCA 워크플로우

### State Machine (20 transitions, 9 guards)

```
idle → PM → Plan → Design → Do → Check ─┬→ Report → Completed
                                   ↑     │
                                   └── Act ←┘  (max 5 iterations, matchRate < 90%)
```

| Phase | 문서 위치 | 명령 | 목적 |
|-------|----------|------|------|
| **PM** | PRD output | `/pdca pm {feature}` | 제품 발견, PRD 생성 (43 frameworks) |
| **Plan** | `docs/01-plan/` | `/pdca plan {feature}` | 목표, 범위, 성공 기준 |
| **Design** | `docs/02-design/` | `/pdca design {feature}` | 아키텍처, 데이터 모델, API 스펙 |
| **Do** | Code | `/pdca do {feature}` | 설계 기반 구현 |
| **Check** | `docs/03-analysis/` | `/pdca analyze {feature}` | 설계-구현 gap analysis |
| **Act** | Iteration | `/pdca iterate {feature}` | 자동 수정 (Evaluator-Optimizer) |
| **Report** | `docs/04-report/` | `/pdca report {feature}` | 완료 보고, lessons learned |

### Quality Gates (7 stages)

| Gate | 전환 | 임계값 | 자동 승인 |
|------|------|--------|-----------|
| PM Gate | pm → plan | PRD 존재 | L1+ |
| Plan Gate | plan → design | Plan doc 검증됨 | L2+ |
| Design Gate | design → do | Design doc 검증됨 | L2+ |
| Do Gate | do → check | 구현 존재 | L3+ |
| Check Gate | check → report | **matchRate ≥ 90%** | 모든 레벨 (gate) |
| Iterate Gate | check → act | matchRate < 90%, iterations < 5 | L2+ |
| Report Gate | report → archive | 보고서 생성됨 | L3+ |

### Check-Act Iteration Loop

```
gap-detector (Check)
  → ≥ 90%: Report 생성 제안
  → 70-89%: 수동/자동 선택
  → < 70%: pdca-iterator 자동 트리거
    → pdca-iterator (Act) → 수정 → gap-detector 재실행
    → 최대 5회 반복 (guard)
```

---

## 5. 9-Stage Development Pipeline

```
Phase 1: Schema        → 데이터 모델링
Phase 2: Convention    → 코딩 컨벤션
Phase 3: Mockup        → UI/UX 목업
Phase 4: API           → API 설계/구현
Phase 5: Design System → 디자인 시스템
Phase 6: UI            → UI 컴포넌트 통합
Phase 7: SEO/Security  → SEO, 보안
Phase 8: Review        → 코드 리뷰
Phase 9: Deployment    → 프로덕션 배포
```

**핵심**: 각 Phase 내에서 PDCA 사이클을 실행 (파이프라인 전체 ≠ PDCA).

**레벨별 Phase 적용:**
- **Starter**: 1 → 2 → 3 → 6 → 9 (5 phases)
- **Dynamic**: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 9 (8 phases)
- **Enterprise**: 모든 9 phases

---

## 6. Agent Teams

### CTO-Led Agent Teams

| Agent | Model | 역할 |
|-------|-------|------|
| `cto-lead` | opus | 팀 오케스트레이션, PDCA 관리 |
| `frontend-architect` | sonnet | UI/UX, 컴포넌트 아키텍처 |
| `product-manager` | sonnet | 요구사항 분석, 기능 우선순위 |
| `qa-strategist` | sonnet | 테스트 전략, 품질 메트릭 |
| `security-architect` | opus | 취약점 분석, 인증 설계 |

### PM Agent Team (Plan 전 단계)

| Agent | Model | 역할 |
|-------|-------|------|
| `pm-lead` | opus | PM 워크플로우 오케스트레이션 |
| `pm-discovery` | sonnet | OST + Brainstorm + 위험 평가 |
| `pm-strategy` | sonnet | JTBD + Lean Canvas + SWOT |
| `pm-research` | sonnet | 경쟁 분석 + TAM/SAM/SOM |
| `pm-prd` | sonnet | PRD 합성 |

### Orchestration Patterns

| 레벨 | Plan | Design | Do | Check | Act |
|------|------|--------|-----|-------|-----|
| **Dynamic** | leader | leader | swarm | council | leader |
| **Enterprise** | leader | council | do: swarm | council | watchdog |

---

## 7. Automation Levels (L0-L4)

| Level | Phase 전환 | Destructive Ops | Trust Score |
|:-----:|-----------|----------------|:-----------:|
| **L0 Manual** | 모두 수동 | 모두 거부/질문 | 0+ |
| **L1 Guided** | idle→pm/plan 자동 | Read 자동 | 20+ |
| **L2 Semi-Auto** (기본) | 대부분 자동 | 비파괴적 자동 | 40+ |
| **L3 Auto** | report→archive 제외 전체 | 대부분 자동, 고위험 질문 | 65+ |
| **L4 Full-Auto** | 완전 자동 | 모두 자동, post-review만 | 85+ |

### Trust Score (6 components)

| Component | Weight | 설명 |
|-----------|:------:|------|
| pdcaCompletionRate | 0.25 | PDCA 완료율 |
| gatePassRate | 0.20 | Quality gate 통과율 |
| rollbackFrequency | 0.15 | 롤백 빈도 (역수) |
| destructiveBlockRate | 0.15 | 파괴적 작업 차단율 |
| iterationEfficiency | 0.15 | 연속 성공 기반 |
| userOverrideRate | 0.10 | 유저 오버라이드 빈도 (역수) |

---

## 8. Skill Evals System

| Layer | Claude Code Native | bkit Enhancement |
|-------|-------------------|------------------|
| **Eval Execution** | Basic runner | `runner.js` + benchmark mode, 29 eval definitions |
| **A/B Testing** | 없음 | `ab-tester.js` — 모델 간 스킬 성능 비교 |
| **Skill Classification** | 없음 | Workflow(18) / Capability(18) / Hybrid(1) + deprecation-risk scoring |

### Skill Lifecycle

```
create → eval → deprecate → remove
```

**Model Parity Test**: 모델 업그레이드 시 Capability 스킬이 redundant한지 자동 감지.

```bash
# 이 모델이 스킬 없이도 동등한 결과를 내는가?
node evals/ab-tester.js --parity phase-3-mockup --model claude-opus-4-6
```

---

## 9. 연구 계획

Superpowers 때와 같은 구조로 deep dive:

```
docs/review/bkit/
├── 01-overview.md              ← 현재 문서
├── 02-pdca-state-machine.md    # State machine, quality gates, Check-Act loop
├── 03-agent-system.md          # 36 agents, CTO/PM teams, orchestration patterns
├── 04-skill-system.md          # 38 skills, classification, frontmatter hooks
├── 05-hooks-and-scripts.md     # 6-layer hook system, 42 scripts, 21 events
├── 06-automation-and-safety.md # L0-L4, trust score, destructive detection, checkpoint
├── 07-evals-and-testing.md     # Skill evals, A/B testing, 4028 TC
└── 08-takeaways.md             # 하네스 설계 시사점 + superpowers 비교
```

---

**다음 단계**: Step 2 — PDCA State Machine, Quality Gates, Config 시스템 deep dive
