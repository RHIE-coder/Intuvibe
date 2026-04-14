# bkit - Skill System

> 38 skills, 분류 체계, frontmatter 구조, 트리거 시스템, intent detection deep dive

---

## 1. Skill 전체 현황

### 38 Skills — 7 카테고리

| 카테고리 | Skills | 수 |
|---------|--------|:--:|
| **Core** | bkit-rules, bkit-templates, bkit (help), btw | 4 |
| **Level** | starter, dynamic, enterprise | 3 |
| **Pipeline** | phase-1 ~ phase-9, development-pipeline | 10 |
| **PDCA** | pdca, pdca-batch, plan-plus, rollback, audit | 5 |
| **Control** | control, skill-status | 2 |
| **BaaS** | bkend-quickstart, bkend-auth, bkend-data, bkend-storage, bkend-cookbook | 5 |
| **Platform/Utility** | mobile-app, desktop-app, cc-learning, code-review, zero-script-qa, skill-create, cc-version-analysis, qa-phase | 8+α |

---

## 2. Skill Classification (3종)

### Workflow vs Capability vs Hybrid

| 분류 | 수 | 특성 | Deprecation Risk |
|------|:--:|------|:----------------:|
| **Workflow** | 11 | 프로세스 자동화. 모델 발전과 무관하게 지속 | None ~ Low |
| **Capability** | 17 | 패턴 가이드. 모델 내장 지식과 중복 가능 | Medium ~ High |
| **Hybrid** | 1 | Workflow + Capability 혼합 | Mixed |

### Workflow Skills (11)

```
bkit-rules, bkit-templates, cc-version-analysis, code-review,
development-pipeline, pdca, phase-2-convention, phase-8-review,
pm-discovery, qa-phase, zero-script-qa
```

**핵심**: 프로세스/워크플로우를 정의. 모델이 아무리 발전해도 "어떤 순서로 하는가"는 대체 불가.

### Capability Skills (17)

```
bkend-auth, bkend-cookbook, bkend-data, bkend-quickstart, bkend-storage,
claude-code-learning, desktop-app, dynamic, enterprise, mobile-app,
phase-1-schema, phase-3-mockup, phase-4-api, phase-5-design-system,
phase-6-ui-integration, phase-7-seo-security, phase-9-deployment, starter
```

**핵심**: 도메인 지식/패턴 가이드. 모델이 이 지식을 내재화하면 스킬이 불필요해질 수 있음.

### Model Parity Test (Deprecation Detection)

```bash
# 이 모델이 스킬 없이도 동등한 결과를 내는가?
node evals/ab-tester.js --parity phase-3-mockup --model claude-opus-4-6
```

**A/B 테스트**: 스킬 ON vs OFF로 동일 태스크 실행 → 결과 품질 비교 → 스킬이 불필요하면 deprecate.

**Superpowers와의 차이**: Superpowers는 deprecation 개념 없음 (모든 스킬이 영구). bkit은 모델 발전에 따른 스킬 수명 관리를 체계화.

---

## 3. Skill Frontmatter 구조

### 표준 필드

```yaml
---
name: phase-2-convention
description: "Use when defining coding rules, naming conventions..."
classification: workflow          # workflow | capability | hybrid
effort: medium                    # low | medium | high
deprecation-risk: none            # none | low | medium | high
agent: bkit:pipeline-guide        # 연결 에이전트
context: fork                     # fork (선택)
pdca-phase: plan                  # 연결 PDCA phase
arguments: "[feature]"            # CLI 인자
triggers:                         # 트리거 키워드 (다국어)
  - convention
  - coding rules
  - 코딩 컨벤션
imports:                          # 템플릿 import
  - bkit-templates:convention
tools:                            # 허용 도구
  - Read
  - Write
  - Edit
  - Glob
  - Grep
---
```

### Superpowers vs bkit Frontmatter 비교

| 필드 | Superpowers | bkit |
|------|-------------|------|
| name | O | O |
| description | "Use when..." (필수) | "Use when..." (필수) |
| classification | X | O (workflow/capability/hybrid) |
| deprecation-risk | X | O (none/low/medium/high) |
| agent | X (동적 spawn) | O (명시적 연결) |
| pdca-phase | X | O (plan/design/do/check/act) |
| effort | X | O (low/medium/high) |
| triggers | X (description이 트리거) | O (다국어 키워드 목록) |
| imports | X (`@` 금지) | O (템플릿 import) |
| tools | X | O (허용 도구 명시) |

**핵심 차이**: Superpowers는 description이 유일한 트리거. bkit은 별도 triggers 필드 + 8개 언어 semantic matching.

---

## 4. Phase Skills — 9-Stage Pipeline

### Pipeline 매핑

| Phase | Skill | Classification | PDCA Phase | Deprecation Risk |
|:-----:|-------|:--------------:|:----------:|:----------------:|
| 1 | `phase-1-schema` | capability | Plan | medium |
| 2 | `phase-2-convention` | workflow | Plan | none |
| 3 | `phase-3-mockup` | capability | Design | **high** |
| 4 | `phase-4-api` | capability | Do | medium |
| 5 | `phase-5-design-system` | capability | Design | medium |
| 6 | `phase-6-ui-integration` | capability | Do | medium |
| 7 | `phase-7-seo-security` | capability | Do | medium |
| 8 | `phase-8-review` | workflow | Check | none |
| 9 | `phase-9-deployment` | capability | Act | medium |

### Level별 Phase 적용

```
Starter:    1 → 2 → 3 → 6 → 9           (5 phases)
Dynamic:    1 → 2 → 3 → 4 → 5 → 6 → 7 → 9  (8 phases)
Enterprise: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9  (모든 9 phases)
```

### Phase별 핵심 내용

| Phase | 핵심 산출물 | 특징 |
|:-----:|-----------|------|
| 1 Schema | glossary.md, schema.md, domain-model.md | 용어 통일이 목적 |
| 2 Convention | CONVENTIONS.md, naming.md | Clean Architecture 4-layer 정의 |
| 3 Mockup | HTML/CSS/JS 프로토타입 + mockup-spec.md | 2025-26 트렌드 반영, v0.dev/Tailwind |
| 4 API | api-spec.md + 구현 코드 + api-qa.md | RESTful 원칙 + Zero Script QA |
| 5 Design System | 디자인 시스템 컴포넌트 | Atomic Design 기반 |
| 6 UI Integration | src/pages/, src/features/ + ui-qa.md | 3-Layer API Client Architecture |
| 7 SEO/Security | SEO + OWASP Top 10 | security-architect 연결 |
| 8 Review | architecture-review.md + refactoring-plan.md | SOLID 원칙, Gap Analysis |
| 9 Deployment | 프로덕션 배포 | — |

### Phase 8 Review — Gap Analysis

```
Design Document ←→ Implementation 비교
  → Match: 일치
  → Not implemented: 설계에 있으나 구현 없음
  → Missing from design: 구현에 있으나 설계 없음
  → Different: 설계와 다르게 구현됨
```

Phase 8이 PDCA Check phase와 연결 → gap-detector 자동 invoke.

---

## 5. Core Skills 상세

### pdca (통합 PDCA 관리)

```
classification: workflow | effort: medium | deprecation-risk: none
```

**Commands**:
- `/pdca plan {feature}` → Plan phase
- `/pdca design {feature}` → Design phase
- `/pdca do {feature}` → Do phase
- `/pdca analyze {feature}` → Check phase (gap-detector)
- `/pdca iterate {feature}` → Act phase (pdca-iterator)
- `/pdca qa {feature}` → QA phase (qa-lead)

**연결 에이전트**: gap-detector, pdca-iterator, report-generator, qa-lead

### bkit-rules (자동화 규칙)

```
classification: workflow | deprecation-risk: none
```

**10개 규칙**:

| # | Rule | 설명 |
|---|------|------|
| 1 | PDCA Auto-Apply | No-guessing. SoR(Source of Record) 우선순위 적용 |
| 2 | Level Auto-Detection | 프로젝트 구조로 Starter/Dynamic/Enterprise 자동 감지 |
| 3 | Agent Auto-Trigger | 유저 의도 기반 에이전트 자동 선택 |
| 4 | Code Quality Standards | DRY, SRP, pre-coding duplicate check |
| 5 | Task Classification | Quick Fix / Minor / Feature / Major Feature |
| 6 | Output Style Auto-Selection | 프로젝트 레벨별 출력 스타일 자동 선택 |
| 7 | Agent Teams Auto-Suggestion | Dynamic/Enterprise에서 팀 모드 자동 제안 |
| 8 | Agent Memory Awareness | 세션 간 컨텍스트 보존 |
| 9 | Plugin Hot Reload | `/reload-plugins` 지원 |
| 10 | Wildcard Permissions | CC 2.1.0+ `Bash(npm *)` 패턴 |

**Level Auto-Detection 기준**:

| Level | 감지 조건 |
|-------|----------|
| Enterprise | 2+ 조건: `infra/terraform/`, `infra/k8s/`, `services/`, `turbo.json`, `docker-compose.yml`, `.github/workflows/` |
| Dynamic | 1+ 조건: bkend in `.mcp.json`, `lib/bkend/`, `supabase/`, `firebase.json` |
| Starter | 위 조건 미충족 시 기본 |

### zero-script-qa (로그 기반 QA)

```
classification: workflow | agent: qa-monitor | deprecation-risk: none
```

전통적 테스트 스크립트 대신 **구조화된 JSON 로그 + Docker 로그 모니터링**:

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "level": "info",
  "service": "api",
  "request_id": "req-abc-123",
  "message": "User login successful",
  "data": { "userId": 1, "method": "email" }
}
```

**Request ID Propagation**: Client → API → Backend → Database 전 계층 추적.

**Issue Detection Patterns**: Error 감지, Slow response, 연속 실패, 비정상 status code.

### audit (감사 추적)

```
classification: workflow
```

**JSONL Audit Trail**:

```json
{"timestamp":"...", "action":"phase_transition", "feature":"auth",
 "from":"design", "to":"do", "automationLevel":2, "triggeredBy":"user"}
```

**Decision Trace**:

```json
{"timestamp":"...", "feature":"auth", "decision":"iterate",
 "rationale":"matchRate 78% < threshold 90%",
 "alternatives":["force_report","abandon"],
 "chosenBecause":"iterations 2 < max 5", "confidence":0.95}
```

모든 AI 결정이 추적/감사 가능 → Controllable AI "Full Visibility" 원칙 구현.

---

## 6. Trigger System — 8개 언어 Semantic Matching

### 소스: `lib/intent/` (4 모듈, 19 exports)

### 아키텍처

```
UserPromptSubmit hook
  → lib/intent/trigger.js
    → matchImplicitAgentTrigger(prompt)  → {agent, confidence}
    → matchImplicitSkillTrigger(prompt)  → {skill, level, confidence}
    → detectNewFeatureIntent(prompt)     → {isNewFeature, featureName, confidence}
  → confidence >= 0.7 (configurable) → 자동 트리거
  → confidence < 0.7 + ambiguity detected → clarifying question
```

### 지원 언어 (8)

```
EN, KO, JA, ZH, ES, FR, DE, IT
```

### Agent Trigger Patterns (8 agents)

| Agent | 트리거 키워드 (EN) | 트리거 키워드 (KO) |
|-------|------------------|------------------|
| gap-detector | gap, analysis, match rate | 갭, 분석, 매치율 |
| pdca-iterator | iterate, improve, fix gap | 반복, 개선, 갭 수정 |
| code-analyzer | code quality, review, analyze | 코드 품질, 리뷰, 분석 |
| report-generator | report, summary, complete | 보고서, 요약, 완료 |
| starter-guide | beginner, start, how to | 초보, 시작, 방법 |
| cto-lead | architecture, team, strategy | 아키텍처, 팀, 전략 |
| pm-lead | requirements, PRD, product | 요구사항, PRD, 제품 |
| bkend-expert | backend, BaaS, bkend | 백엔드, BaaS |

### Skill Trigger Patterns (4 levels)

```
starter:    "simple", "basic", "간단한", "基本的"
dynamic:    "BaaS", "bkend", "백엔드 연동"
enterprise: "microservice", "kubernetes", "마이크로서비스"
mobile-app: "mobile", "React Native", "모바일"
```

### Ambiguity Detection

```javascript
calculateAmbiguityScore(prompt)
  → containsFilePath()        // 파일 경로 언급?
  → containsTechnicalTerms()   // 기술 용어 포함?
  → hasSpecificNouns()         // 인용부호, PascalCase?
  → hasScopeDefinition()       // 범위 정의?
  → hasMultipleInterpretations() // 다중 해석 가능?
  → detectContextConflicts()   // Phase 불일치?
  → score + shouldClarify 반환
```

`shouldClarify = true` → `generateClarifyingQuestions()` → 구조화된 선택지 제시.

**Superpowers와의 차이**:
- Superpowers: description이 곧 트리거 ("Use when..."), 1% 규칙으로 강제 invoke
- bkit: 별도 intent detection 시스템, confidence threshold, ambiguity 감지 + 명확화 질문

---

## 7. Skill-Agent 연결 맵

| Skill | Primary Agent | Secondary Agents |
|-------|--------------|-----------------|
| pdca | (workflow orchestration) | gap-detector, pdca-iterator, report-generator, qa-lead |
| phase-1-schema | pipeline-guide | — |
| phase-2-convention | pipeline-guide | — |
| phase-3-mockup | pipeline-guide | frontend-architect |
| phase-4-api | qa-monitor | — |
| phase-5-design-system | pipeline-guide | frontend-architect |
| phase-6-ui-integration | pipeline-guide | frontend-architect |
| phase-7-seo-security | pipeline-guide | security-architect |
| phase-8-review | code-analyzer | design-validator, gap-detector, qa-strategist, cto-lead |
| code-review | code-analyzer | — |
| zero-script-qa | qa-monitor | — |
| enterprise | enterprise-expert | infra-architect |

**패턴**: Phase skill → `pipeline-guide` (가이드) + 전문 에이전트 (실행/검증).

---

## 8. Skill Evals 구조

### evals/ 디렉토리

```
evals/
├── capability/    # Capability 스킬 평가 정의
├── workflow/      # Workflow 스킬 평가 정의
├── hybrid/        # Hybrid 스킬 평가 정의
├── config.json    # 평가 설정
├── runner.js      # 평가 실행기
├── ab-tester.js   # A/B 테스트 (모델 간 비교)
└── reporter.js    # 결과 리포터
```

### 평가 흐름

```
runner.js
  → 스킬 로드 → eval 정의 로드 → 실행 → 결과 수집
  
ab-tester.js
  → 스킬 ON/OFF 비교 실행 → 품질 차이 측정
  → --parity 모드: 스킬 없이도 동등하면 deprecate 후보
```

### Deprecation Lifecycle

```
create → eval → deprecate → remove

1. create: skill-create 스킬로 생성
2. eval: runner.js로 주기적 평가
3. deprecate: ab-tester.js --parity로 모델 파리티 감지
4. remove: capability 스킬 중 모델이 내재화한 것 제거
```

**Workflow 스킬은 deprecate 대상이 아님** — 프로세스 자동화는 모델 지식과 독립.

---

## 9. Superpowers vs bkit Skill 비교

| 측면 | Superpowers | bkit |
|------|-------------|------|
| **스킬 수** | 14 | 38 |
| **분류** | 없음 (모두 동등) | Workflow/Capability/Hybrid |
| **트리거** | Description ("Use when...") + 1% 규칙 | 8개 언어 semantic matching + confidence |
| **Deprecation** | 없음 | Model parity test로 자동 감지 |
| **에이전트 연결** | 없음 (스킬 내에서 spawn) | frontmatter에 명시 (`agent:`) |
| **PDCA 연결** | 없음 | frontmatter에 명시 (`pdca-phase:`) |
| **Token 관리** | <200/<500 단어 가이드 (위반) | effort 필드 (low/medium/high) |
| **imports** | `@` 참조 금지 | 템플릿 import 지원 |
| **Platform** | 6개 플랫폼 | Claude Code 전용 |
| **Zero-dep** | Yes (bash only) | No (Node.js) |

---

## 10. 하네스 설계 시사점

### 10.1 Workflow vs Capability 분류의 가치

bkit의 가장 혁신적인 설계: **스킬의 수명을 분류로 관리**.
- Workflow: 영구 (프로세스는 모델 발전과 무관)
- Capability: 시한부 (모델이 내재화하면 불필요)
- **하네스 적용**: 스킬 생성 시 classification 필수. deprecation-risk 평가.

### 10.2 Intent Detection vs 1% Rule

| 접근 | 장점 | 단점 |
|------|------|------|
| **Superpowers 1%** | 단순, 강제, 누락 없음 | 과도한 invoke, 무관한 스킬 로드 |
| **bkit confidence** | 정밀, 필요한 것만 | 복잡 (4 모듈, 19 함수), false negative 가능 |

**하네스 적용**: 핵심 스킬은 1% 규칙 (항상 로드), 전문 스킬은 confidence-based 트리거.

### 10.3 다국어 트리거

8개 언어 지원은 글로벌 확장에 유리하지만, 유지보수 비용이 큼.
**하네스 적용**: EN + KO 2개 언어로 시작, 필요 시 확장.

### 10.4 Phase-Agent 분리

bkit의 `pipeline-guide` 패턴: Phase skill은 가이드만, 실행은 전문 에이전트.
이 분리로 같은 Phase skill이 다른 에이전트와 조합 가능.

### 10.5 Audit Trail

모든 AI 결정을 JSONL로 기록하는 audit 스킬은 Controllable AI의 핵심.
Superpowers에는 없는 기능. 하네스에 반드시 포함.

### 10.6 Zero Script QA

전통적 테스트 대신 구조화된 로그 + AI 모니터링은 혁신적이지만 아직 검증이 필요한 접근.
- 장점: 테스트 코드 작성 비용 제거
- 단점: 로그 구조가 표준화되지 않은 프로젝트에 적용 어려움
- **하네스 적용**: 전통 테스트 + Zero Script QA 병행 옵션 제공.

---

**다음 단계**: Step 5 — Hooks and Scripts (6-layer hook system, 42 scripts, 21 events) deep dive
