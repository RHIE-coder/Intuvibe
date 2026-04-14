# Harness Engineering — 2026년 업계 정리

> Anthropic · OpenAI · ETH Zürich 가 2026년 공개한 "harness" 개념 공식 문서 3건에 대한 리뷰.
> 본 devrig/forge 하네스 설계의 업계 대조군 확보 목적.

---

## 문서 구성

| # | 출처 | 저자 | 발행일 | 요약 |
|---|------|------|--------|------|
| 01 | Anthropic Engineering | Prithvi Rajasekaran | 2026-03-24 | [Harness design for long-running apps](01-anthropic-rajasekaran.md) — 모델 한계 보완을 위한 **구조적 scaffolding**. Generator-Evaluator, Sprint Contract, Context Reset. |
| 02 | OpenAI (보조 출처: InfoQ · NxCode) | Ryan Lopopolo 외 | 2026-02-21 | [Harness engineering — Codex in agent-first world](02-openai-lopopolo.md) — 5개월 내 1M LOC 생성. Context/Architectural Constraints/Entropy Management 3기둥. |
| 03 | arXiv (ETH Zürich · SRI Lab) | Gloaguen · Mündler · Müller · Raychev · Vechev | 2026-02 | [Evaluating AGENTS.md](03-gloaguen-agentsmd.md) — **첫 체계적 실증**: AGENTS.md/CLAUDE.md 자동 생성은 성공률 -3%, 비용 +23%. "omit LLM-generated context files." |

> OpenAI 원문(`openai.com/index/harness-engineering/`)은 WebFetch 403으로 직접 접근 불가. 본 리뷰는 **InfoQ(2026-02-21 Leela Kumili)** 및 **NxCode 가이드(2026-03-01)** 의 2차 인용 기반. 원문 발췌/직접 인용 복원이 필요하면 별도 수단 필요.

---

## 두 문서의 핵심 대조

| 축 | Anthropic (Rajasekaran) | OpenAI (Lopopolo) |
|---|---|---|
| **정의** | 모델 한계를 구조로 보완하는 scaffolding | 신뢰할 수 있는 규모의 AI 워크로드 실행 인프라 |
| **중심 도구** | Claude Agent SDK · Claude Code | Codex (CLI/agent) |
| **주요 패턴** | Generator-Evaluator · Sprint Contract · Context Reset | Context Engineering · Architectural Constraints · Entropy Management |
| **강조점** | **모델 진화에 따라 harness 재설계** ("every component encodes an assumption about what the model can't do") | **인간 엔지니어의 역할 전환** (코드 작성 → 환경 설계·의도 명시) |
| **실증** | Retro Game Maker · DAW 사례 (solo vs harness 비교) | 5개월 · 1M LOC · 인간 작성 0줄 |
| **측정 방식** | Grading criteria (Design/Originality/Craft/Functionality) + hard thresholds | 린터 · CI · 구조 테스트 · 기계 검증 |
| **분량·깊이** | 장문 블로그, 구현 디테일 풍부 | 짧은 인덱스, 철학 중심 (원문 제한) |

---

## devrig/forge 하네스 설계와의 연결점

대조 체크리스트 — 본 프로젝트의 `packages/harness/dev/design/` 와 교차 참조.

### 공통 지점 (양쪽 출처 모두 이미 본 설계에 반영)

| 개념 | 업계 표현 | 본 프로젝트 위치 |
|---|---|---|
| Gate/검증 구조 | Sprint Contract (Anthropic), CI·린터 제약 (OpenAI) | `03-workflow.md §1.2 게이트 G1~G5`, `02-architecture.md ⑤ Quality Pipeline` |
| Generator-Evaluator 분리 | 양측 공통 (Anthropic은 명시, OpenAI는 린터/감사자) | `04-agent-system.md` — implementer vs reviewer-* 분리 |
| 의존성 계층화 | Types→Config→Repo→Service→Runtime→UI (OpenAI) | `03-workflow.md §1.3.1 QA Stack` Infra→DB→API→UI |
| Context 관리 | Context Reset · Compaction (Anthropic) | `05-project-structure.md` state/compact-recovery.mjs |
| 결정론적 검증 | 린터·CI·구조 테스트 (OpenAI) | `scripts/qa/*.mjs` 전체 (mock-ratio, attribution, coverage-threshold) |
| 모델 진화에 따른 재설계 | "harness 재검토" (Anthropic) | `03-workflow.md §1.9 Escape Hatch` + `audit.bypass_budgets` (재검토 시그널) |

### 본 프로젝트만의 차별 지점

| 본 프로젝트 고유 | 업계 문서 언급? |
|---|---|
| Right-Size 매트릭스 (small/medium/large AND 3축) | ❌ |
| QA Stack bottom-up attribution (하위 PASS → 상위 FAIL = 상위 귀인) | ❌ |
| `mock_guard.enforce: strict_lower_real` | ❌ (OpenAI도 mock 편향 언급 없음) |
| Coverage 8축 (mutation/boundary/error_path/integration_ratio/delta 교차) | ❌ (line/branch 정도만 언급) |
| `audit.jsonl` 14 이벤트 결정론적 emit 체계 | ❌ (OpenAI는 "관찰성" 수준, 이벤트 스키마 없음) |
| Escape Hatch `--bypass-*` 3중 구조 (reason/audit/sticky) | ❌ |
| Prototype↔Standard mode 분기 + sync 승격 | ❌ |

### 본 프로젝트가 업계에서 배울 지점

1. **Anthropic의 "모델 단순화 원칙"** — "every component encodes an assumption about what the model can't do". 본 설계의 gate/script들이 **미래 모델에서 불필요해질 가능성** 고려. `config.harness.minimal_mode` 같은 opt-out 채널을 준비해둘 가치.
2. **OpenAI의 "Entropy Management"** — 문서 일관성 에이전트·제약조건 위반 스캐너·패턴 강제 에이전트를 **정기 실행**(일/주). 본 설계의 `/harness:sync`는 on-demand인데, 정기 스윕 메커니즘(cron 또는 `/harness:sync --schedule`)이 있으면 보강 가능.
3. **OpenAI의 팀 크기별 단계(Level 1~3)** — 본 설계는 mode(explore/prototype/standard)로 단계를 나누는데, **팀 크기** 축이 추가로 있을 수 있음 (개인 vs 소규모팀 vs 조직).

### 본 프로젝트가 이미 앞서 있는 지점

1. **결정론적 attribution** — Anthropic은 evaluator의 "hard thresholds"를 강조하나 본 설계의 QA Stack bottom-up은 **자동 귀인**까지 나아감.
2. **mock 편향의 정량화** — 업계 두 문서 모두 mock 문제를 직접 다루지 않음. 본 설계의 `integration_ratio` + `mock_guard`가 더 예리함.
3. **Audit 이벤트 스키마** — 업계는 "관찰성" 수준의 언어 사용. 본 설계는 14개 이벤트 각각의 emitter·스키마·redact·rotate가 명확.

---

## 한 줄 정리

> **업계 세 축:** (1) Anthropic/OpenAI가 "harness가 왜·무엇인가" 정립, (2) ETH Zürich가 **"벤더 권장 자체가 틀릴 수 있다"** 는 실증 반례 제시.
> 본 프로젝트는 그 기둥 위에 **결정론적 강제(8축 Coverage, QA Stack 귀인, mock_guard)** 와 **Escape Hatch 구조**를 추가한 구체 구현.
> 업계에서 배울 것: 모델 진화 시 단순화 전략 · 정기 엔트로피 스윕 · **컨텍스트 파일 최소화 실증**. 업계에 기여할 것: 결정론적 귀인 · mock 편향 정량화.

---

## 참고 파일

- 본 프로젝트 하네스 설계: `packages/harness/dev/design/` (6 문서 + dashboard)
- 기존 리뷰: `docs/review/{bkit,compound-engineering,superpowers,claude-ai,claude-cookbooks}/`
- 패턴 분석: `docs/insights/patterns/` (DDD/Saga/ES)
