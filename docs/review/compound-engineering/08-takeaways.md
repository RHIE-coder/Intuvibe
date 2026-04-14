# Compound Engineering - Takeaways for Harness Design

> CE 고유 패턴과 하네스 설계 시사점 종합

---

## 1. Architecture Patterns

### Pattern A: Knowledge Compounding Loop

CE의 핵심 — **해결한 문제를 문서화하고 다음 작업에 자동 투입**.

```
ce:compound → docs/solutions/{category}/
  → learnings-researcher (ce:plan Phase 1.1)
  → 다음 plan의 Context & Research에 자동 인용
  → 같은 실수 반복 방지 (복리 효과)
```

**장점**: 팀 지식이 시간이 지날수록 축적. 새 멤버도 기존 학습에 접근 가능.
**단점**: 문서 폭발 (20 brainstorms + 38 plans + 20 solutions). compound-refresh 유지보수 부담.

**하네스 적용**: solutions/ 디렉토리 + learnings 검색 메커니즘. 단, 스키마는 프로젝트별 커스터마이징 필요 (CE는 Rails 특화).

### Pattern B: Universal IR + Converter Pipeline

```
Claude Plugin (source) → ClaudePlugin IR → converter → *Bundle → writer → filesystem
```

단일 소스 포맷 → 타겟별 converter 분리 → 새 플랫폼 = converter + type + writer 추가.

**장점**: 10개 플랫폼 일관 지원. 스킬은 symlink (원본 하나 관리).
**단점**: 10 targets × 5 files = 50+ 파일 유지보수. Lossy mapping 불가피.

### Pattern C: Script-First Architecture (65% Token Reduction)

```
SKILL.md (프롬프트) → 복잡한 로직을 scripts/로 위임
  → 모델은 스크립트 실행 + 결과 해석만
```

| 접근 | 토큰 | 감소 |
|------|:----:|:----:|
| Model does everything | ~100k | baseline |
| Script classifies + model presents | ~35k | **65%** |

**적용 조건**: >50 items, 결정적 분류 규칙, 일관된 스키마, 빈번한 실행.

**하네스 적용**: 복잡한 로직(데이터 처리, 분류, 파싱)은 스크립트로 위임. SKILL.md 프롬프트 크기 제어.

### Pattern D: Stateless Docs-Based State Management

```
brainstorms/*-requirements.md  → origin: 필드로 plan에 연결
plans/*-plan.md                → status: completed, [x] 체크박스
solutions/                     → 파일 시스템 = KB
todos/001-pending-p1-desc.md   → 파일명 = 상태
```

FSM 없이도 **문서가 곧 상태**. git-friendly하고 이해하기 쉬움.

### Pattern E: Right-Size Ceremony (Scope Matching)

```
ce:brainstorm: Lightweight / Standard / Deep
ce:plan:       Lightweight / Standard / Deep
ce:work:       Trivial / Small-Medium / Large
ce:review:     Tier 1 (self-review) / Tier 2 (full personas)
```

각 스킬이 **독립적으로 작업 규모를 판단**하고 ceremony 수준을 조절. 작은 수정에 과도한 프로세스를 강제하지 않음.

---

## 2. Agent System Patterns

### Pattern F: Persona-Based Parallel Review (17 Personas)

```
Always-on (6): correctness, testing, maintainability, project-standards,
               agent-native-reviewer, learnings-researcher
Conditional (8): security, performance, api-contract, data-migrations,
                 reliability, adversarial, cli-readiness, previous-comments
Stack-specific (5): dhh-rails, kieran-rails, kieran-python,
                    kieran-typescript, julik-frontend-races
```

"agent judgment, not keyword matching" — 오케스트레이터가 diff를 읽고 **판단**으로 conditional reviewer 선택.

### Pattern G: Confidence Calibration + Suppress Threshold

```
0.00-0.49: suppress
0.50-0.59: P0만 보고
0.60-0.69: actionable할 때만 flag
0.70-0.84: full evidence로 보고
0.85-1.00: 반드시 보고

Cross-reviewer agreement: +0.10 boost
```

**하네스 적용**: per-finding 신뢰도로 false positive 억제. review output quality의 핵심.

### Pattern H: Two-Tier Agent Output (Context Window 보호)

```
Sub-Agent → Full Artifact (disk): .context/.../run_id/reviewer.json
         → Compact Return (memory): merge-tier 필드만
```

오케스트레이터 context를 lean하게 유지하면서 상세 정보는 disk에 보존. Context window 관리의 실용적 해법.

### Pattern I: model:inherit + Model Tiering

```yaml
model: inherit    # 호출 스킬의 모델 상속 (기본)
```

필요시 tiering: 오케스트레이터=default, personas=sonnet, triage=haiku, quick scan=haiku.

### Pattern J: Adversarial Depth Calibration

| Depth | 조건 | 기법 수 |
|:-----:|------|:-------:|
| Quick | <50 lines, no risk | 1 technique, ≤3 findings |
| Standard | 50-199 lines | 3 techniques |
| Deep | 200+ lines OR risk | 4 techniques, multiple passes |

diff 크기와 도메인 위험도로 리뷰 깊이 자동 조절.

---

## 3. Skill System Patterns

### Pattern K: Self-Contained Skills (No Cross-Reference)

```
✅ @./references/post-ideation-workflow.md    # 스킬 내부
❌ ../other-skill/shared.md                   # 스킬 간 참조 금지
```

필요하면 **복제**. 스킬 독립성 보장 (Claude Code skill resolution 버그 대응).

**트레이드오프**: 독립성 ↑, 동일 파일 복제 관리 부담 ↑.

### Pattern L: `!` Command Pre-population

```markdown
**Git status:**
!`git status`
```

Claude Code에서 스킬 로딩 시 자동 실행 → 0 tool call로 컨텍스트 주입. 비-Claude Code용 Context fallback 섹션 병기.

### Pattern M: Beta Suffix Framework

```
ce:work       → stable (disable-model-invocation: false)
ce:work-beta  → experimental (disable-model-invocation: true)
```

기존 스킬 수정 없이 실험 기능 병행 운용. Promotion = orchestration contract change.

### Pattern N: Skill Visibility Controls

| 메커니즘 | 역할 | 예시 |
|---------|------|------|
| `disable-model-invocation: true` | UI에서 숨김, 프로그래밍 전용 | lfg, ce-work-beta, todo-create |
| `context: fork` | 격리된 컨텍스트 실행 | claude-permissions-optimizer |
| `allowed-tools: [...]` | 화이트리스트 (최소 권한) | resolve-pr-feedback |

### Pattern O: Description as Intent Matching

```yaml
description: "...Also use when a user describes a vague or ambitious feature request,
  asks 'what should we build', 'help me think through X',
  or seems unsure about scope or direction"
```

Description이 사용자의 **의도, 증상, 감정, 간접 표현**까지 매핑. 별도 intent engine 없이 YAML 필드 자체가 intent matching.

---

## 4. Documentation & Quality Patterns

### Pattern P: R-ID Tracing (Brainstorm → Plan)

```
Brainstorm:  R1. Support open-ended ideation
             R2. Generate many candidates before filtering
    ↓ origin: 필드
Plan:        - [x] R1. ✓ (Unit 1에서 구현)
             - [ ] R3. (Deferred to Implementation)
```

요구사항에 stable ID → plan에서 체크박스 추적 → 누락 방지.

### Pattern Q: Two-Track Solution Schema

```yaml
tracks:
  bug:       [build_error, test_failure, runtime_error, ...]
  knowledge: [best_practice, workflow_issue, developer_experience, ...]
```

- Bug track: Problem / Symptoms / What Didn't Work / Solution / Why This Works / Prevention
- Knowledge track: Context / Guidance / Why This Matters / When to Apply / Examples

13 problem_types × 17 components × severity = 구조화된 검색 가능 KB.

### Pattern R: Contract Tests on Prompt Prose

```typescript
test("requires code review before shipping", async () => {
  const content = await readRepoFile("skills/ce-work/SKILL.md")
  expect(content).toContain("ce:review")
  const reviewIdx = content.indexOf("ce:review")
  const shipIdx = content.indexOf("Ship It")
  expect(reviewIdx).toBeLessThan(shipIdx)
})
```

**SKILL.md 산문 내용**을 자동 검증: 필수 섹션 존재, 워크플로우 순서, 크로스 스킬 일관성. 프롬프트 drift 방지.

### Pattern S: Compound Refresh (Knowledge Maintenance)

```
5 outcomes: Keep / Update / Consolidate / Replace / Delete
Document-Set Analysis: 5차원 overlap detection → canonical doc identification
Replace: 증거 충분 → 새 문서 작성, 부족 → stale 표시
Delete ≠ Archive (git history = archive)
```

지식 축적만으로 끝나지 않고 **유지보수 메커니즘**까지 내장.

---

## 5. Structured Findings Pipeline

### Pattern T: 4-Way Autofix Classification

| Class | 의미 | Actor |
|-------|------|-------|
| `safe_auto` | 로컬, 결정적, 기계적 | review-fixer (자동) |
| `gated_auto` | 계약/경계 변경 | downstream-resolver / human |
| `manual` | 설계 결정 필요 | downstream-resolver / human |
| `advisory` | 보고 전용 | human / release |

### Pattern U: Finding Classification Tiers

| Tier | 정의 | Verdict 포함 |
|------|------|:-----------:|
| **Primary** | diff에서 직접 변경된 줄 | ✅ |
| **Secondary** | 변경과 같은 블록의 미변경 코드 | ✅ (상호작용 주석) |
| **Pre-existing** | diff와 무관한 미변경 코드 | ❌ |

### Pattern V: 7-Stage Merge Pipeline

```
Scope → Intent → Plan Discovery → Select Reviewers → Standards Discovery
  → Sub-Agent Dispatch (sonnet, parallel)
  → Merge (confidence gate → dedup → agreement boost → route → partition)
```

---

## 6. Cross-Platform Patterns

### Pattern W: Skills = Symlink, Commands = Convert

```
Sync:     스킬 → symlink (원본 하나)
          커맨드 → per-platform 변환
Convert:  전체 플러그인 → 타겟 형식 변환
```

### Pattern X: Managed Config Merge

| 전략 | 타겟 | 방법 |
|------|------|------|
| User-wins | OpenCode, Gemini, Kiro, Pi, Windsurf, Droid | 기존 키 보존 |
| Managed block | Codex | BEGIN/END 마커 |
| Tracking key | Copilot, Qwen | `_compound_managed_mcp` |
| Incoming-wins | OpenClaw | 플러그인 우선 |

### Pattern Y: `ce_platforms` Filter

```yaml
# skill frontmatter
ce_platforms: [codex, gemini]   # 이 플랫폼에만 배포
```

특정 스킬을 특정 플랫폼에만 선택적 배포.

---

## 7. 하네스 적용 우선순위

### Tier 1 — 즉시 적용

| # | 패턴 | 이유 |
|---|------|------|
| 1 | **Script-First Architecture** (C) | 65% 토큰 절감, SKILL.md 크기 제어 |
| 2 | **Self-Contained Skills** (K) | 스킬 독립성, 버그 격리 |
| 3 | **`!` Command Pre-population** (L) | 0 tool call 컨텍스트 주입 |
| 4 | **Skill Visibility Controls** (N) | 내부/외부 스킬 구분 |
| 5 | **Description as Intent Matching** (O) | 자연어 트리거 |

### Tier 2 — 설계 단계

| # | 패턴 | 이유 |
|---|------|------|
| 6 | **Knowledge Compounding** (A) | 장기적 차별화, 팀 지식 축적 |
| 7 | **Persona-Based Review** (F) | 도메인별 전문가 병렬 dispatch |
| 8 | **Confidence Calibration** (G) | False positive 억제 |
| 9 | **Two-Tier Output** (H) | Context window 보호 |
| 10 | **R-ID Tracing** (P) | 요구사항 → 계획 추적 |
| 11 | **Contract Tests on Prose** (R) | SKILL.md drift 방지 |
| 12 | **4-Way Autofix** (T) | 자동 수정 범위 명확화 |

### Tier 3 — 점진적 도입

| # | 패턴 | 이유 |
|---|------|------|
| 13 | **Right-Size Ceremony** (E) | 스킬 내부 scope matching |
| 14 | **Adversarial Depth Calibration** (J) | 리뷰 깊이 자동 조절 |
| 15 | **Beta Suffix Framework** (M) | 안전한 실험 + promotion |
| 16 | **Two-Track Solution Schema** (Q) | 구조화된 KB |
| 17 | **Compound Refresh** (S) | 지식 유지보수 |
| 18 | **Cross-Platform Converter** (B) | multi-platform 확장 시 |
| 19 | **Managed Config Merge** (X) | config 충돌 해결 |

---

## 8. CE가 증명한 것

1. **지식 축적이 복리 효과를 낸다** — solutions/ → learnings-researcher → 다음 plan. 유일하게 이를 구현한 프로젝트.

2. **스크립트 위임이 토큰을 절감한다** — script-first = 65% 감소. 프롬프트만으로는 한계.

3. **신뢰도 calibration이 noise를 줄인다** — 0.60 suppress threshold + cross-reviewer boost.

4. **Right-size가 One-size보다 낫다** — scope matching으로 작은 작업에 마찰 감소.

5. **Cross-platform은 converter CLI로 해결 가능** — 10개 플랫폼, Universal IR 패턴.

6. **Stateless docs-based도 충분히 작동한다** — FSM 없이도 문서 기반 상태 추적 가능.

7. **Contract tests로 프롬프트 drift를 방지한다** — SKILL.md 산문 검증은 독창적이고 실용적.

8. **Self-contained skills가 유지보수를 단순화한다** — 스킬 간 의존성 제거, 복제의 트레이드오프 수용.

9. **Two-tier output이 context window를 보호한다** — full (disk) + compact (memory) 분리.

10. **13.7K stars** — 단순하지는 않지만 (42 skills, 51 agents), 실용적 도구와 multi-platform이 채택을 이끔.

---

## 9. CE에 없는 것 (Gap 분석)

| Gap | 설명 | 영향 |
|-----|------|------|
| **합리화 방어** | LLM이 프로세스를 건너뛰는 합리화에 대한 구조적 방어 없음 | 스킬 준수 약화 가능 |
| **Hook System** | Claude Code hooks 미사용 (SessionStart, PreToolUse 등) | 자동화 트리거 제한 |
| **파괴적 작업 차단** | allowed-tools 화이트리스트만 (명시적 guardrail rules 없음) | 위험 명령 사전 차단 약함 |
| **Context Compaction 대응** | 상태가 compaction에서 손실될 때 복구 메커니즘 없음 | 긴 세션에서 상태 손실 가능 |
| **Progressive Automation** | Right-size ceremony는 있지만 신뢰 기반 자동화 레벨 없음 | 자동화 확대/축소 불가 |
| **Audit Trail** | 문서가 있지만 structured action/decision log 없음 | 사후 분석 어려움 |
| **스킬 수명 관리** | Beta suffix는 있지만 자동 deprecation 메커니즘 없음 | 스킬 비대화 가능 |

---

**연구 완료**. 이 문서는 CE 독립 분석이며, 3자 통합 비교는 별도 문서에서 진행.
