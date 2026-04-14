# Compound Engineering - Skill System

> 42 skills, frontmatter schema, reference/script architecture, scope matching, cross-platform patterns, orchestration design

---

## 1. Skill 전체 현황

### 42 Skills — 10 Categories

| Category | 수 | Skills | 특징 |
|----------|:--:|--------|------|
| **Core CE Workflow** | 7 | brainstorm, ideate, plan, work, review, compound, compound-refresh | 핵심 5+2단계 파이프라인 |
| **Git** | 4 | commit, commit-push-pr, worktree, clean-gone-branches | 커밋부터 PR까지 full lifecycle |
| **Dev Frameworks** | 5 | agent-native-architecture, agent-native-audit, andrew-kane-gem, dhh-rails-style, dspy-ruby | 스택별 개발 철학/패턴 |
| **Content** | 3 | every-style-editor, proof, document-review | 문서 품질 + 외부 에디터 연동 |
| **Automation** | 3 | agent-browser, gemini-imagegen, rclone | 브라우저/이미지/클라우드 자동화 |
| **Research** | 2 | ce-sessions, ce-slack-research | 세션 히스토리 + Slack 조사 |
| **Testing** | 2 | test-browser, test-xcode | E2E 브라우저 + iOS 시뮬레이터 |
| **Workflow Utils** | 8 | changelog, reproduce-bug, resolve-pr-feedback, onboarding, todo-create/resolve/triage, setup | 개발 워크플로우 보조 |
| **Meta** | 3 | claude-permissions-optimizer, deploy-docs, report-bug-ce | 도구/플러그인 관리 |
| **Beta** | 3 | lfg, ce-work-beta, ce-update | 실험적 자율 실행 + 업데이트 |

### Superpowers/bkit 대비

| 측면 | Superpowers | bkit | Compound |
|------|-------------|------|----------|
| **스킬 수** | 14 | 38 | **42** |
| **분류 체계** | 없음 | Workflow/Capability/Hybrid 3분류 | 10 카테고리 (기능적 분류) |
| **Deprecation** | 없음 | Model Parity Test (85% 임계값) | Beta suffix 병행 운용 |
| **의존성** | Zero (bash) | Node.js | Bun + TypeScript |
| **플랫폼** | 6개 | Claude Code only | **11개** (converter CLI) |

---

## 2. Frontmatter Schema

### 기본 필드

```yaml
---
name: ce:brainstorm                    # 스킬 이름 (콜론 구분자 지원)
description: "Explore requirements..." # 트리거 설명 (자연어 매칭용)
argument-hint: "[feature idea]"        # 사용자에게 보이는 인자 힌트
---
```

### 확장 필드

| 필드 | 값 | 역할 | 사용 스킬 |
|------|-----|------|-----------|
| `disable-model-invocation` | `true` | 모델 선택 UI에서 숨김, 프로그래밍 호출 전용 | changelog, resolve-pr-feedback, todo-create, todo-triage, lfg, ce-work-beta, deploy-docs, report-bug-ce, test-xcode, setup, ce-compound-refresh |
| `context` | `fork` | 격리된 포크 컨텍스트에서 실행 | claude-permissions-optimizer |
| `allowed-tools` | `[Bash(gh *), ...]` | 사용 가능 도구 제한 (최소 권한) | resolve-pr-feedback, agent-browser, proof |

### Description의 역할: 의미적 트리거

Compound의 description 필드는 단순 설명이 아니라 **자연어 의도 매칭 시스템**:

```yaml
# ce:brainstorm — 광범위한 트리거 매핑
description: "Explore requirements and approaches through collaborative dialogue...
  Also use when a user describes a vague or ambitious feature request,
  asks 'what should we build', 'help me think through X',
  presents a problem with multiple valid solutions,
  or seems unsure about scope or direction —
  even if they don't explicitly ask to brainstorm."
```

```yaml
# claude-permissions-optimizer — 불만/증상 기반 트리거
description: "...Use when experiencing permission fatigue,
  too many permission prompts... or complaints about
  clicking approve too often."
```

**패턴**: Description이 사용자의 **의도**뿐 아니라 **증상**, **감정**, **간접 표현**까지 매핑.

**bkit과의 차이**:
- bkit: `lib/intent/` 4개 모듈, 19 exports, 8개 언어 semantic matching, confidence 0.7 임계값
- Compound: YAML description 필드 자체가 intent 매칭 — 별도 intent engine 없음

---

## 3. Skill 내부 구조: References, Scripts, Assets

### 디렉토리 패턴

```
plugins/compound-engineering/skills/
└── ce-brainstorm/
    ├── SKILL.md                    # 스킬 본문
    ├── references/                 # 참조 문서 (스킬 내부)
    │   ├── universal-brainstorming.md
    │   ├── requirements-capture.md
    │   └── handoff.md
    └── (no scripts/)
```

```
└── git-worktree/
    ├── SKILL.md
    └── scripts/                    # 실행 스크립트
        └── worktree-manager.sh
```

```
└── todo-create/
    ├── SKILL.md
    └── assets/                     # 템플릿/스키마
        └── todo-template.md
```

### Reference/Script 사용 현황

| Skill | references/ | scripts/ | assets/ |
|-------|:-----------:|:--------:|:-------:|
| ce-brainstorm | ✅ 3 files | — | — |
| ce-ideate | ✅ post-ideation-workflow.md | — | — |
| ce-plan | ✅ deepening-workflow.md 등 | — | — |
| ce-review | ✅ 5+ files (persona-catalog, subagent-template, diff-scope, findings-schema, review-output-template) | — | — |
| ce-compound | ✅ schema.yaml, yaml-schema.md | — | ✅ resolution-template.md |
| ce-compound-refresh | ✅ (공유) | — | — |
| git-worktree | — | ✅ worktree-manager.sh | — |
| git-clean-gone-branches | — | ✅ clean-gone | — |
| resolve-pr-feedback | — | ✅ 4 scripts (get-pr-comments, get-thread-for-comment, reply-to-pr-thread, resolve-pr-thread) | — |
| onboarding | — | ✅ inventory.mjs | — |
| claude-permissions-optimizer | — | ✅ extract-commands.mjs, normalize.mjs | — |
| todo-create | — | — | ✅ todo-template.md |

### Self-Contained 원칙 (스킬 간 참조 금지)

```
✅ @./references/post-ideation-workflow.md    # 스킬 내부 파일
❌ ../other-skill/shared.md                   # 스킬 간 참조 금지
```

두 스킬이 같은 파일이 필요하면 **복제**. Claude Code의 skill resolution 버그 대응.

**bkit과의 차이**:
- bkit: `lib/` 84개 모듈을 스킬 간 공유 (`require('../lib/...')`)
- Compound: 스킬 간 코드 공유 없음 — 각 스킬이 자기 완결적

### Script-First Architecture: 65% Token 절감

```yaml
# ce-review — resolve-base.sh로 base branch 결정
# SKILL.md에 로직을 쓰는 대신 스크립트 위임
references/resolve-base.sh    # Shell에서 base branch 결정
```

```yaml
# resolve-pr-feedback — 4개 GraphQL 스크립트
scripts/get-pr-comments       # PR thread 조회
scripts/get-thread-for-comment # 특정 comment → thread
scripts/reply-to-pr-thread    # GraphQL로 thread에 답장
scripts/resolve-pr-thread     # GraphQL로 thread resolve
```

```bash
# onboarding — Node.js 인벤토리 스크립트
node scripts/inventory.mjs --root .
# → JSON: project name, languages, frameworks, directory structure,
#          entry points, scripts, docs, test infrastructure...
```

**핵심**: 복잡한 로직을 SKILL.md 프롬프트에 쓰면 토큰 소비 → 쉘/JS 스크립트로 위임하면 65% 절감.

**Superpowers/bkit 대비**:
- Superpowers: 스크립트 없음 (순수 프롬프트)
- bkit: 607개 JS 함수, 84개 lib 모듈 (대규모 런타임)
- Compound: **스킬별 소수의 스크립트** (targeted, not monolithic)

---

## 4. Cross-Platform 패턴: `!` Command Blocks

### Context Pre-population (Claude Code 전용)

```markdown
**If you are Claude Code**, the five labeled sections below contain pre-populated data.
Use them directly — do not re-run these commands.

**Git status:**
!`git status`

**Working tree diff:**
!`git diff HEAD`

**Current branch:**
!`git branch --show-current`
```

### Context Fallback (비-Claude Code 에이전트용)

```markdown
### Context fallback
**If you are Claude Code, skip this section — the data above is already available.**

Run this single command to gather all context:
    printf '=== STATUS ===\n'; git status; printf '\n=== DIFF ===\n'; git diff HEAD; ...
```

### Platform-Agnostic Blocking Questions

```markdown
Use the platform's blocking question tool when available:
- AskUserQuestion (Claude Code)
- request_user_input (Codex)
- ask_user (Gemini)
Otherwise, present numbered options in chat and wait.
```

**사용 스킬**: ce-brainstorm, ce-ideate, ce-plan, ce-work, git-commit, git-commit-push-pr, onboarding, todo-triage

**핵심 혁신**: 11개 플랫폼을 단일 SKILL.md로 지원하는 메커니즘. `!` command block은 Claude Code에서 스킬 로딩 시 자동 실행되어 컨텍스트를 pre-populate.

---

## 5. Orchestration Patterns

### 5.1 disable-model-invocation: 프로그래밍 전용 스킬

```yaml
disable-model-invocation: true
```

이 플래그가 있는 스킬은:
- 모델 선택 UI에서 숨겨짐
- 다른 스킬에서 프로그래밍적으로만 호출 가능
- 자체 내부에서 agent orchestration을 수행

| 용도 | 스킬 |
|------|------|
| **자율 파이프라인** | lfg (ce:plan → ce:work → ce:review → todo-resolve → test-browser → feature-video) |
| **변형 실행** | ce-work-beta (ce:work + Codex delegation) |
| **보조 유틸리티** | changelog, todo-create, todo-triage, resolve-pr-feedback, deploy-docs, report-bug-ce, test-xcode, setup |
| **유지보수** | ce-compound-refresh (ce:compound에서 호출) |

### 5.2 context: fork — 격리 실행

```yaml
context: fork
```

`claude-permissions-optimizer`만 사용. 포크된 컨텍스트에서 실행되어 세션 히스토리를 분석할 때 메인 대화와 격리.

### 5.3 allowed-tools — 최소 권한

```yaml
# resolve-pr-feedback — Git/GitHub만 허용
allowed-tools:
  - Bash(gh *)
  - Bash(git *)
  - Read

# agent-browser — browser CLI만 허용
allowed-tools:
  - Bash(npx agent-browser:*)
  - Bash(agent-browser:*)
```

**bkit의 disallowedTools와 대조적**: bkit은 금지 목록(블랙리스트), Compound는 허용 목록(화이트리스트).

### 5.4 Sub-Agent Dispatch 패턴

| 패턴 | 사용 스킬 | 동작 |
|------|-----------|------|
| **Named agent dispatch** | ce-review, document-review | `compound-engineering:review:correctness-reviewer` 등 fully-qualified name |
| **Workflow agent reuse** | resolve-pr-feedback, todo-resolve | `compound-engineering:workflow:pr-comment-resolver` 공유 |
| **Research agent dispatch** | ce-ideate, ce-compound, ce-slack-research | `compound-engineering:research:learnings-researcher` 등 |
| **Anonymous sub-agent** | ce-ideate (Phase 2), onboarding | 일반 sub-agent (specific agent 이름 없이) |
| **Model tiering** | ce-ideate, todo-triage, ce-review | 오케스트레이터=default, persona=sonnet, triage=haiku |

### 5.5 Parallel Dispatch with Batching

```
# resolve-pr-feedback — conflict-aware parallel dispatch
1-4 items:  모두 병렬 dispatch
5+ items:   4개씩 batch
규칙: 같은 파일을 수정하는 두 unit은 병렬 불가

# ce-ideate — frame-based parallel ideation
3-4 agents, 각각 다른 ideation frame:
  (1) user pain  (2) inversion  (3) assumption-breaking  (4) leverage
→ merge + dedup + synthesis
```

---

## 6. Scope Matching (Right-Size Ceremony)

### ce:brainstorm의 3-Level Routing

| Scope | Brainstorm 깊이 | 산출물 |
|:-----:|----------------|--------|
| **Lightweight** | 간단한 확인, Phase 1.1-1.2 스킵 | 짧은 requirements 또는 생략 |
| **Standard** | 일반 brainstorm (5 pressure test 질문) | 정식 requirements doc |
| **Deep** | 확장 brainstorm (Standard + 2 strategic 질문) | 심층 requirements doc |

### ce:plan의 3-Level Depth

| Depth | 조건 | Plan 구조 |
|:-----:|------|-----------|
| **Lightweight** | 작고 명확한 작업 | 2-4 implementation units |
| **Standard** | 일반 feature/refactor | 3-6 implementation units |
| **Deep** | cross-cutting, strategic | 4-8 implementation units + High-Level Technical Design |

### ce:work의 Complexity Routing

| Complexity | Input 유형 | Routing |
|:----------:|-----------|---------|
| **Trivial** | 명확한 1줄 수정 | 즉시 실행 (no plan needed) |
| **Small-Medium** | bare prompt, 적당한 범위 | ce:work 직접 실행 |
| **Large** | bare prompt, 큰 범위 | ce:brainstorm 또는 ce:plan으로 redirect |

### 3개 프로젝트 비교

| | Superpowers | bkit | Compound |
|---|-------------|------|----------|
| **분류 기준** | 없음 (모두 동일) | Starter/Dynamic/Enterprise 3단계 | **Scope별 3-4단계** |
| **적용 단계** | 전체 | 전체 | **각 스킬마다 독립 판단** |
| **판단 방법** | 없음 | config 설정 | **스킬 내부 자동 판단** |

---

## 7. 핵심 스킬 분석

### 7.1 lfg — Full Autonomous Pipeline

```yaml
name: lfg
disable-model-invocation: true
```

**파이프라인**:
```
/ce:plan $ARGUMENTS
  → GATE: docs/plans/ 파일 확인
  → /ce:work
  → GATE: 파일 생성/수정 확인
  → /ce:review mode:autofix plan:<path>
  → /todo-resolve
  → /test-browser
  → /feature-video
  → <promise>DONE</promise>
```

**핵심**: 각 단계 사이에 **GATE** (검증) — 이전 단계의 산출물이 존재해야 다음 단계 진행.

**Superpowers/bkit 대비**:
- Superpowers: 없음 (단일 스킬 실행)
- bkit: PDCA FSM 자동 전환 (unified-stop.js)
- Compound: **명시적 gate 체인** (선언적이지만 스크립트 아님)

### 7.2 ce-work-beta — Codex Delegation

```yaml
name: ce:work-beta
disable-model-invocation: true
```

ce:work의 모든 기능 + **외부 에이전트 위임**:

```yaml
# config.local.yaml
work_delegate: codex          # codex | local
work_delegate_consent: granted
work_delegate_sandbox: yolo   # yolo | full-auto
work_delegate_model: gpt-5.4
work_delegate_effort: high
```

**Settings Resolution Chain**: argument flag → config.local.yaml → default (off)

**Beta Framework 패턴**:
- 기존 스킬 (ce:work)을 수정하지 않고 `-beta` suffix로 병행 운용
- `disable-model-invocation: true`로 사용자 UI에서 숨김
- 충분히 검증되면 기존 스킬에 기능 통합 (promotion = orchestration contract change)

### 7.3 git-commit-push-pr — Adaptive PR Sizing

| Change Profile | Description 접근 |
|----------------|-----------------|
| Small + simple | 1-2 문장, 헤더 없음, < ~300자 |
| Small + non-trivial | Problem/Fix 내러티브 3-5 문장 |
| Medium feature/refactor | 요약 문단 + what/why |
| Large/architectural | 전체 내러티브: 컨텍스트, 접근, 결정, 마이그레이션 |
| Performance | before/after 측정 포함, markdown 표 |

**Visual Aid Decision Table**:

| 변경사항 | 시각 보조 | 배치 |
|---------|----------|------|
| 3+ 컴포넌트 아키텍처 | Mermaid component diagram | Approach 섹션 |
| 다단계 워크플로우 | Mermaid flow diagram | 요약 뒤 |
| 3+ 행동 변형 | Markdown 비교 표 | 관련 섹션 |
| Before/after 데이터 | Markdown 표 | 인라인 |
| 3+ 엔티티 데이터 모델 | Mermaid ERD | Changes 섹션 |

**Compound Engineering Badge** (모든 PR에 자동 추가):
```
[![Compound Engineering](https://img.shields.io/badge/Built_with-Compound_Engineering-6366f1)](...)
![HARNESS](https://img.shields.io/badge/MODEL_SLUG-COLOR?logo=LOGO&logoColor=white)
```

### 7.4 resolve-pr-feedback — Parallel Thread Resolution

**9단계 Full Mode**:
```
PR threads 조회 (scripts/get-pr-comments)
  → 신규 vs 기존 분류
  → Cluster Analysis (3+ items일 때 활성화)
      → concern 카테고리 분류 (11종)
      → spatial proximity 그룹핑
  → 계획 수립
  → 병렬 구현 (pr-comment-resolver agents, batch 4)
  → commit + push
  → GraphQL로 reply + resolve
  → 검증 (최대 2 fix-verify 사이클)
  → 요약 (verdicts: fixed, fixed-differently, replied, not-addressing, needs-human)
```

**Security**: comment 텍스트는 untrusted input — 내부 명령 실행 금지.

### 7.5 onboarding — Codebase Documentation Generator

**6-Section Template**:
1. **What Is This?** — 목적, 대상, 문제
2. **How It's Used** — User/Developer/Both Experience (pure infra면 생략)
3. **How Is It Organized?** — ASCII 아키텍처 다이어그램 + 디렉토리 트리
4. **Key Concepts** — 도메인 용어 + 아키텍처 추상화 테이블 (5-15)
5. **Primary Flows** — surface별 ASCII flow diagram
6. **Developer Guide** — 설정, 실행, 변경 패턴

**Script-First**: `node scripts/inventory.mjs --root .` → JSON으로 프로젝트 구조 자동 스캔. 스크립트 실패 시 **즉시 중단**.

### 7.6 claude-permissions-optimizer — Cross-Agent Config

```yaml
context: fork    # 격리된 컨텍스트에서 실행
```

**핵심 혁신**: Codex, Gemini 등 다른 에이전트에서도 실행 가능하면서 Claude Code의 `~/.claude/settings.json`을 최적화.

**분석 파이프라인**:
```
세션 히스토리 스캔 (500 sessions / 30 days)
  → extract-commands.mjs
  → green (안전 패턴) / red (위험 패턴) / yellow (주의)
  → 사용자 확인
  → settings.json permissions.allow에 추가
  → JSON 검증 + 실패 시 백업 복원
```

---

## 8. Todo System: File-Based Work Tracking

### 구조

```
.context/compound-engineering/todos/     # Canonical (쓰기)
todos/                                    # Legacy (읽기 전용)
```

### Naming Convention

```
{issue_id}-{status}-{priority}-{description}.md
001-pending-p1-fix-auth-timeout.md
002-ready-p2-add-pagination.md
003-complete-p1-database-migration.md
```

### YAML Frontmatter

```yaml
---
status: pending | ready | complete
priority: p1 | p2 | p3
issue_id: "002"
tags: [rails, performance]
dependencies: ["001"]
---
```

### 3-Skill Lifecycle

```
todo-create (생성, pending)
  → todo-triage (검토, pending → ready 또는 삭제)
  → todo-resolve (실행, ready → complete + 삭제)
```

| Skill | Model | 동작 |
|-------|-------|------|
| **todo-create** | disable-model-invocation | 파일 생성, >15분 작업만 |
| **todo-triage** | Haiku (비용 절감) | 대화형 1건씩 검토, yes/next/custom |
| **todo-resolve** | default | 병렬 sub-agent 실행 + ce:compound |

**bkit과의 차이**:
- bkit: 상태 기계 내장 (FSM transition), 메모리 내 상태
- Compound: **파일 시스템 기반** (파일명 = 상태), git-friendly

---

## 9. 설계 패턴 요약

### 9.1 7가지 핵심 패턴

| # | 패턴 | 설명 | 예시 |
|---|------|------|------|
| **P1** | **Script-First** | 복잡한 로직을 스크립트로 위임 (65% 토큰 절감) | resolve-base.sh, inventory.mjs, extract-commands.mjs |
| **P2** | **Self-Contained Skills** | 스킬 간 참조 금지, 필요시 복제 | references/ 디렉토리 패턴 |
| **P3** | **Platform-Agnostic Questions** | 3개 플랫폼 blocking question tool + fallback | AskUserQuestion / request_user_input / ask_user |
| **P4** | **`!` Command Pre-population** | Claude Code에서 스킬 로딩 시 컨텍스트 자동 주입 | git status, git diff HEAD, git log |
| **P5** | **Beta Suffix** | 기존 스킬 수정 없이 실험 기능 병행 | ce-work vs ce-work-beta |
| **P6** | **Fully-Qualified Agent Names** | 플러그인:카테고리:이름으로 충돌 방지 | compound-engineering:research:learnings-researcher |
| **P7** | **File-Based State** | 파일명에 상태 인코딩, git-friendly | 001-pending-p1-description.md |

### 9.2 Superpowers/bkit/Compound 패턴 비교

| 패턴 | Superpowers | bkit | Compound |
|------|-------------|------|----------|
| **로직 위치** | 100% 프롬프트 | 런타임 JS | **프롬프트 + 스크립트** |
| **스킬 간 공유** | 없음 | lib/ 공유 모듈 | **없음 (자기 완결)** |
| **의도 매칭** | 없음 | intent engine (8언어) | **description 필드 (자연어)** |
| **상태 관리** | Stateless | FSM + 상태 파일 | **Stateless (docs-based + file naming)** |
| **권한 모델** | 없음 | disallowedTools (블랙리스트) | **allowed-tools (화이트리스트)** |
| **스킬 숨김** | 없음 | 없음 | **disable-model-invocation** |
| **격리 실행** | 없음 | 없음 | **context: fork** |
| **크로스 플랫폼** | 수동 매핑 6개 | 없음 | **`!` commands + fallback, 11개** |

---

## 10. 하네스 설계 시사점

### 채용할 패턴

1. **Script-First Architecture** — 프롬프트 토큰 절감을 위해 복잡한 로직은 스크립트로 위임. SKILL.md 프롬프트 크기를 제어.

2. **Self-Contained Skills** — 스킬 간 의존성 제거. 각 스킬이 독립적으로 동작하도록 references/ 내부에 필요한 모든 것을 포함.

3. **`!` Command Pre-population** — 스킬 로딩 시 필요한 컨텍스트를 자동 주입하여 불필요한 tool call 감소.

4. **disable-model-invocation** — 내부 전용 스킬과 사용자 대면 스킬의 명확한 구분. 프로그래밍 전용 스킬을 UI에서 숨김.

5. **File-Based Todo System** — 파일명에 상태를 인코딩하여 git-friendly한 작업 추적. FSM보다 단순하면서도 효과적.

6. **Adaptive PR Sizing** — 변경 규모에 따라 PR 설명 깊이를 자동 조절. 작은 변경에 과도한 템플릿 강제하지 않음.

### 주의할 패턴

1. **description 기반 intent matching** — 간단하지만, description이 길어지면 관리 어려움. bkit의 구조화된 intent engine이 더 확장성 있을 수 있음.

2. **Self-Contained 복제** — 스킬이 많아지면 동일 파일의 복제본 관리 부담. 공유 라이브러리와의 균형점 필요.

3. **11 platforms support** — converter CLI로 해결하지만, 각 플랫폼의 미묘한 차이를 단일 SKILL.md에서 처리하면 프롬프트가 비대해질 수 있음.

---

**다음 단계**: Step 5 — Cross-Platform System (11 targets, converter architecture, sync) deep dive
