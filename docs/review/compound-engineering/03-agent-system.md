# Compound Engineering - Agent System

> 60+ agents, 6 categories, conditional selection, confidence calibration, persona-based review deep dive

---

## 1. Agent 전체 현황

### 51+ Agents — 6 Categories

| Category | 수 | 역할 | 특징 |
|----------|:--:|------|------|
| **Review** | 28 | 코드 리뷰 personas | 도메인별 전문가, 병렬 dispatch |
| **Document Review** | 7 | 문서 리뷰 personas | 인식론적 품질, 전략, 보안 |
| **Research** | 8 | 체계적 조사 | 코드베이스, git, issues, Slack |
| **Design** | 3 | UI/UX | Figma sync, 반복 정제 |
| **Workflow** | 4 | 자동화 | Bug 재현, lint, PR comment |
| **Docs** | 1 | 문서 생성 | README (Ankane style) |

### Agent Frontmatter 패턴

```yaml
---
name: adversarial-reviewer
model: inherit          # 호출 스킬의 모델 상속
color: red              # CLI 시각화 색상
tools:
  - Read
  - Grep
  - Glob
  - Bash
---
```

**핵심**: `model: inherit` — 모든 agent가 호출 스킬의 모델을 상속. bkit의 명시적 opus/sonnet/haiku 지정과 대조적.

---

## 2. Review Agents (28) — 코드 리뷰

### 3-Tier Selection

| Tier | Personas | 활성화 조건 |
|------|:--------:|-----------|
| **Always-on** | 4 | 모든 리뷰에서 항상 실행 |
| **Conditional** | 8 | Diff 특성/도메인에 따라 선택 |
| **Stack-specific** | 5 | 기술 스택에 따라 선택 |

나머지 11 agents는 specialized roles (data-migration-expert, deployment-verification 등).

### Always-on (4)

| Agent | 역할 | 사냥 대상 |
|-------|------|----------|
| `correctness-reviewer` | 로직 정확성 | Off-by-one, null propagation, race conditions, broken error propagation |
| `testing-reviewer` | 테스트 품질 | 커버리지 갭, 약한 assertion, brittle tests, false confidence |
| `maintainability-reviewer` | 유지보수성 | Premature abstraction, dead code, coupling, naming |
| `project-standards-reviewer` | 프로젝트 표준 | CLAUDE.md/AGENTS.md 준수, frontmatter, cross-reference |

### Conditional (8)

| Agent | 조건 | 사냥 대상 |
|-------|------|----------|
| `security-reviewer` | auth, payments, user data | Injection, auth bypass, secrets, SSRF, path traversal |
| `performance-reviewer` | hot paths, DB queries | N+1, unbounded memory, missing pagination, blocking I/O |
| `api-contract-reviewer` | API 변경 | Breaking changes |
| `reliability-reviewer` | infra, deployment | Production failure modes |
| `adversarial-reviewer` | diff ≥ 50줄 OR high-risk | Chaos engineer — failure scenario 구성 |
| `data-integrity-guardian` | DB migration | Data integrity |
| `code-simplicity-reviewer` | Final pass | YAGNI, 불필요한 복잡도 |
| `previous-comments-reviewer` | 기존 PR comment | 이전 피드백 미반영 |

### Stack-specific (5)

| Agent | 조건 | 관점 |
|-------|------|------|
| `dhh-rails-reviewer` | Rails 코드 | DHH/37signals 철학: "Rails 싸우지 말고 따라" |
| `kieran-rails-reviewer` | Rails 코드 | Kieran의 strict conventions |
| `kieran-python-reviewer` | Python 코드 | Kieran's Python style |
| `kieran-typescript-reviewer` | TypeScript 코드 | Kieran's TS style |
| `julik-frontend-races-reviewer` | JS/Stimulus | Race conditions |

### Adversarial Reviewer 상세

**활성화**: diff ≥ 50줄 OR auth/payments/data mutations/external APIs

**Depth Levels**:

| Depth | 조건 | 범위 |
|:-----:|------|------|
| Quick | < 50줄 | 핵심 위협만 |
| Standard | 50-199줄 | 표준 분석 |
| Deep | 200+줄 | 전체 chaos 분석 |

**4 Hunting Techniques**:
1. **Assumption violation**: "이 가정이 틀리면?"
2. **Composition failures**: "A + B 조합 시 실패?"
3. **Cascade construction**: "이 실패가 전파되면?"
4. **Abuse cases**: "악의적 사용자라면?"

**Superpowers/bkit 대비**: Superpowers의 "불신 기반 리뷰"와 유사하나, **chaos engineering 관점**이 더 구조적.

### Confidence Calibration

| 수준 | 조건 | Action |
|:----:|------|--------|
| **HIGH** (≥ 0.80) | 전체 경로 추적 가능, 재현 가능 | 반드시 보고 |
| **MODERATE** (0.60-0.79) | 높은 확률이지만 환경 의존적 | 보고 + context |
| **LOW** (< 0.60) | 추측성 | **억제** (false positive 방지) |

**예외**: security-reviewer는 0.60+도 actionable (보안은 false negative가 더 위험).

---

## 3. Document Review Agents (7) — 문서 리뷰

### 7 Personas

| Agent | 렌즈 | 핵심 질문 |
|-------|------|----------|
| `adversarial-document-reviewer` | 적대적 | "이 전제가 틀리면?" "숨겨진 가정은?" |
| `coherence-reviewer` | 일관성 | "모순은 없나?" "용어가 일관적인가?" |
| `design-lens-reviewer` | 설계 | "빠진 설계 결정은?" "상호작용 상태는?" |
| `feasibility-reviewer` | 실현가능성 | "아키텍처와 충돌하지 않나?" "의존성 갭은?" |
| `product-lens-reviewer` | 제품 전략 | "목표-작업 불일치?" "기회비용?" |
| `scope-guardian-reviewer` | 범위 | "불필요한 복잡도?" "Scope creep?" |
| `security-lens-reviewer` | 보안 | "인증 갭?" "데이터 노출?" "API 보안?" |

### 활용 시점

```
ce:brainstorm Phase 4 → document-review 스킬 호출
ce:plan Phase 4      → document-review 스킬 호출
  → 7 personas 병렬 dispatch
  → 각 persona가 해당 렌즈로 문서 리뷰
  → 발견 사항 통합
```

**Superpowers/bkit 대비**:
- Superpowers: Spec compliance 리뷰 (구현 후, 1 agent)
- bkit: design-validator (1 agent, 설계 문서만)
- Compound: **7 personas** (문서 생성 직후, 계획/요구사항 단계에서)

---

## 4. Research Agents (8) — 체계적 조사

### Agent별 역할

| Agent | 데이터 소스 | 산출물 |
|-------|-----------|--------|
| `repo-research-analyst` | 코드베이스 전체 | 구조, 문서, 컨벤션, 패턴 |
| `learnings-researcher` | docs/solutions/ | 관련 과거 해결책 |
| `git-history-analyzer` | git log/blame | 코드 진화, 기여자, 패턴 이유 |
| `issue-intelligence-analyst` | GitHub issues | 반복 테마, pain patterns |
| `best-practices-researcher` | 외부 문서/웹 | 모범 사례, API 최신 상태 |
| `framework-docs-researcher` | 프레임워크 docs | 프레임워크 문서/API |
| `session-historian` | 과거 세션 | 이전 조사 컨텍스트 |
| `slack-researcher` | Slack | 조직 컨텍스트 |

### repo-research-analyst 상세

**Scoped Invocation**: 타겟 지정 가능

```
technology → 기술 스택 분석
architecture → 아키텍처 패턴
patterns → 구현 패턴
conventions → 코딩 컨벤션
issues → 알려진 문제
templates → 코드 템플릿
```

**Phase 구조**:
```
Phase 0: Tech scan (언어, 프레임워크 감지)
Phase 1: Capability check (기존 스킬/도구 확인)
Phase 2: Deep research (구조 분석)
Phase 3: Synthesis (통합 리포트)
```

### learnings-researcher 상세

**전략**: Grep-first filtering

```
1. docs/solutions/ 디렉토리 존재 확인
2. 키워드 기반 grep으로 후보 필터링
3. 관련 문서 전체 읽기
4. 적용 가능성 평가
```

**핵심**: "컴파운드된 지식을 활용" — ce:compound로 축적된 과거 해결책을 자동 검색.

### git-history-analyzer 상세

**고고학적 분석**:
- 코드 진화 추적 (어떻게 변했는가)
- 기여자 식별 (누가 작성했는가)
- 패턴 이유 이해 (왜 이렇게 되었는가)

---

## 5. Design Agents (3) — UI/UX

| Agent | 역할 | 핵심 기능 |
|-------|------|----------|
| `design-implementation-reviewer` | Figma vs 실제 UI 비교 | 구조화된 리뷰 (정확/약간차이/큰차이/측정값/추천) |
| `design-iterator` | UI 반복 정제 | N회 screenshot-analyze-improve 사이클 |
| `figma-design-sync` | Figma → Code 동기화 | 반응형 패턴, Tailwind 기본값 우선, 컴포넌트 폭 철학 |

### Design Philosophy

```
Components: full-width (constraints at parent level)
Tailwind: 기본값 사용 (2-4px 이내), arbitrary values는 critical일 때만
Responsive: mobile-first
```

---

## 6. Workflow Agents (4) — 자동화

| Agent | 역할 | 특징 |
|-------|------|------|
| `bug-reproduction-validator` | 버그 재현 검증 | 체계적 재현 → 확인 |
| `lint` | 코드 품질 검사 | StandardRB, erblint, brakeman (Ruby) |
| `pr-comment-resolver` | PR 코멘트 해결 | standard/cluster mode, cross-invocation awareness |
| `spec-flow-analyzer` | 스펙 흐름 분석 | 유저 플로우 맵핑, 누락 경로 감지, 갭 질문 |

### pr-comment-resolver 상세

```
Mode: standard → 개별 comment 순차 해결
Mode: cluster  → 관련 comments 그룹핑 → 일괄 해결
```

Cross-invocation awareness: 이전 해결 시도의 컨텍스트를 유지.

---

## 7. Agent Design Patterns

### Pattern 1: model: inherit

```yaml
model: inherit
```

모든 agent가 호출 스킬의 모델을 상속. 모델 선택이 agent가 아닌 **스킬/유저** 수준에서 결정됨.

**Superpowers**: 서브에이전트별 모델 지정 (cheap/standard/capable)
**bkit**: agent별 명시 (12 opus / 22 sonnet / 2 haiku)
**Compound**: **inherit** → 유연하지만 비용 최적화가 스킬 호출자 책임

### Pattern 2: color for CLI Visualization

```yaml
color: red       # adversarial, security
color: blue      # performance, architecture
color: purple    # design
color: yellow    # workflow
color: green     # success, completion
```

CLI에서 agent 실행 시 색상으로 카테고리 시각적 구분.

### Pattern 3: Confidence-Gated Output

```
모든 review agent:
  → findings를 confidence score와 함께 반환
  → < 0.60: 억제 (false positive 방지)
  → 0.60-0.79: 보고 + context
  → ≥ 0.80: 반드시 보고
```

**예외 규칙**: security-reviewer는 0.60+도 actionable.

### Pattern 4: Territory Ownership

각 persona가 **자기 영역만** 리뷰:

```
adversarial-reviewer: failure scenarios (NOT logic bugs)
security-reviewer: exploitable paths (NOT defense-in-depth)
correctness-reviewer: logic errors (NOT style)
maintainability-reviewer: structure (NOT performance)
```

영역 중복 방지 → dedup pipeline의 부담 감소.

### Pattern 5: Conditional Activation

```
Diff 특성 분석
  → size: ≥ 50줄? → adversarial 활성화
  → domain: auth? → security 활성화
  → file: migration? → data-integrity 활성화
  → stack: Rails? → dhh + kieran-rails 활성화
  → always: correctness + testing + maintainability + standards
```

불필요한 persona는 아예 실행하지 않음 → 비용/시간 최적화.

### Pattern 6: Structured JSON Output

```json
{
  "file": "src/auth.ts",
  "line": 42,
  "severity": "high",
  "category": "security",
  "persona": "security-reviewer",
  "confidence": 0.85,
  "finding": "Missing rate limit on login endpoint",
  "suggestion": "Add rate limiter middleware",
  "classification": "primary"
}
```

모든 persona가 동일 스키마 → merge/dedup pipeline에서 통합 처리.

### Pattern 7: Fully-Qualified Namespacing

```
compound-engineering:review:adversarial-reviewer    ✅
adversarial-reviewer                                ❌ (충돌 가능)
```

Multi-plugin 환경에서 이름 충돌 방지.

---

## 8. Superpowers / bkit 대비 비교

| 측면 | Superpowers | bkit | Compound |
|------|-------------|------|----------|
| **Agent 수** | 1 named + 동적 | 36 사전 정의 | **51+** (28 review + 23 other) |
| **Model 선택** | 태스크별 지정 | agent별 명시 | **inherit** (호출자 결정) |
| **Review** | 2-Stage (2 agents) | Council 합의 | **28 personas** 병렬 |
| **문서 리뷰** | X | 1 agent | **7 personas** |
| **Research** | X | X | **8 agents** (git, issues, Slack) |
| **조건부 활성화** | X | Phase별 재구성 | **Diff 특성 기반** |
| **Confidence** | X | matchRate % | **0-1 score + gating** |
| **출력 형식** | 4-Status text | 8 message types | **Structured JSON schema** |
| **비용 최적화** | model 지정 | opus/sonnet/haiku | inherit + conditional skip |
| **Territory** | X | disallowedTools | **영역별 명시적 소유권** |

---

## 9. 하네스 설계 시사점

### 9.1 Persona-Based Review의 가치

28개의 전문 reviewer personas는 과도해 보이지만, 핵심은 **영역별 전문화**:
- 각 persona가 하나의 렌즈로만 리뷰 → 깊이 확보
- Conditional activation → 불필요한 실행 방지
- Structured JSON → 통합 용이

**하네스 적용**: 핵심 4-6 personas (correctness, security, testing, maintainability, performance, standards)로 시작. 도메인별 확장.

### 9.2 Confidence Gating

false positive 억제 (< 0.60)는 리뷰 노이즈를 줄이는 효과적 방법.
보안은 예외 (0.60+도 actionable) — 도메인별 임계값 차별화.

**하네스 적용**: 모든 agent 출력에 confidence score 필수. 도메인별 임계값 설정.

### 9.3 Document Review Personas

계획/요구사항 단계에서 7 personas 리뷰는 **구현 전 품질 확보**:
- adversarial: 전제 도전
- feasibility: 실현가능성
- scope-guardian: 범위 통제

**하네스 적용**: 최소 3 document review personas (adversarial + feasibility + scope).

### 9.4 Research Agents

learnings-researcher의 "컴파운드된 지식 검색"은 compound workflow의 핵심 가치:
- 과거 해결책이 축적될수록 연구 시간 단축
- git-history-analyzer의 "코드 고고학"은 레거시 코드 이해에 유용

**하네스 적용**: docs/solutions/ 검색 agent는 compound 패턴 도입 시 필수.

### 9.5 model: inherit vs 명시적 지정

- `inherit`: 유연, 호출자가 결정 → 비용 제어가 유저 책임
- 명시적: 예측 가능, 비용 최적화 → 유연성 제한

**하네스 적용**: 핵심 역할 (leader, validator)은 명시적, 나머지는 inherit.

### 9.6 Territory Ownership

"adversarial은 logic bug를 플래그하지 않는다" 같은 명시적 영역 분리는:
- Dedup pipeline 부담 감소
- 각 persona의 정밀도 향상
- Finding 추적 용이

**하네스 적용**: agent 정의 시 "what you DO flag" + "what you DON'T flag" 명시.

---

**다음 단계**: Step 4 — Skill System (42 skills, frontmatter, references, scope matching) deep dive
