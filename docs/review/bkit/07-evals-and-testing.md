# bkit - Evals and Testing

> Skill Evals 프레임워크, A/B testing, Model Parity Test, 4,028 TC 테스트 인프라 deep dive

---

## 1. Skill Evals 프레임워크

### 소스: `evals/`

```
evals/
├── config.json        # 전역 설정 (v2.0.4)
├── runner.js          # 평가 실행 엔진 (v1.6.1)
├── ab-tester.js       # A/B 테스트 엔진 (v1.6.0)
├── reporter.js        # 결과 리포터 (v1.6.1)
├── capability/        # 18 capability 스킬 평가
├── workflow/          # 9+2 workflow 스킬 평가
└── hybrid/            # 1 hybrid 스킬 평가 (plan-plus)
```

### Eval Classification

| Type | 수 | 평가 대상 | Parity Test |
|------|:--:|----------|:-----------:|
| **workflow** | 11 | trigger accuracy + process compliance | X (불필요) |
| **capability** | 18 | output quality | O |
| **hybrid** | 1 | 둘 다 | O |

**핵심 설계**: Workflow 스킬은 프로세스 자동화 → 모델 발전과 무관 → parity test 불필요.
Capability 스킬은 도메인 지식 → 모델이 내재화 가능 → parity test로 deprecation 감지.

### Eval 정의 구조

각 스킬 디렉토리:

```
evals/capability/starter/
├── eval.yaml       # 메타데이터 + 평가 정의
├── prompt-1.md     # 입력 프롬프트
└── expected-1.md   # 기대 출력 (체크리스트)
```

**eval.yaml 형식**:

```yaml
name: starter
classification: capability
version: 1.6.1
description: "starter output quality evaluation"

evals:
  - name: output-quality
    prompt: prompt-1.md
    expected: expected-1.md
    criteria:
      - "Must produce accurate and relevant output"
      - "Must follow documented patterns"
    timeout: 60000

parity_test:
  enabled: true
  description: "Tests if model can perform equally well without this skill"

benchmark:
  model_baseline: "claude-sonnet-4-6"
  metrics:
    - output_quality
    - model_parity
```

---

## 2. 평가 유형별 상세

### 2.1 Capability Evals — Output Quality

**목적**: 스킬이 올바른 품질의 출력을 생성하는가?

**prompt 예시** (starter):
```
Build a portfolio website for a graphic designer named Alex Chen.
The site should use HTML, CSS, and vanilla JavaScript only.
Include a hero section, project gallery (6+ items), about section, contact form.
Responsive design for mobile/tablet/desktop.
```

**expected 예시** (15 criteria):
```
## HTML Structure Quality
1. semantic HTML5 elements (header, nav, main, section, footer)
2. proper meta viewport tag
3. accessible alt attributes, aria labels
4. Hero h1 + tagline
5. Gallery grid/flexbox with 6+ items

## Responsive Design Quality
6. media queries for 2+ breakpoints
7. multi-column → single-column
8. font sizes scale
9. navigation collapse (hamburger)
10. images max-width: 100%

## Code Organization Quality
11. CSS organized (reset, layout, components, utilities)
12. JavaScript minimal (scroll, filter, nav toggle)
13. form with proper input types + required
14. 4-5 colors as CSS custom properties
15. separate HTML/CSS/JS files
```

**Level별 차이**:
- **starter**: HTML/CSS/JS 포트폴리오
- **dynamic**: Next.js + bkend.ai fullstack
- **enterprise**: 마이크로서비스 아키텍처 (10K RPS, K8s, service mesh)

### 2.2 Workflow Evals — Process Compliance

**목적**: 스킬이 올바른 프로세스를 따르는가?

**prompt 예시** (pdca):
```
User request: /pdca plan user-auth
Context: PRD exists at docs/00-pm/user-auth.prd.md.
Phase is currently "pm" for user-auth.
```

**expected** (20 criteria, 5 steps):
```
Step 1: Action Parsing and Phase Detection
  1. Parse action = "plan", feature = "user-auth"
  2. Detect target phase as Plan
  3. Route to Plan handler (not design/analyze/iterate)
  4. Verify valid transition from "pm"

Step 2: PRD Auto-Reference Check
  5. Check docs/00-pm/user-auth.prd.md exists
  6. Read PRD content
  7. Use as context for Plan quality
  8. Reference OST, VP, market data from PRD

Step 3: Plan Document Generation
  9. Check docs/01-plan/features/user-auth.plan.md exists
  10. Create from plan.template.md
  11. Apply template with PRD content
  12-13. Write Executive Summary (4-perspective table)

Step 4: Task Integration
  14. Create Task: [Plan] user-auth
  15. Set blockedBy dependencies
  16. Update .bkit-memory.json phase = "plan"

Step 5: Output and Next Phase Guidance
  17. Write to docs/01-plan/
  18. Output Executive Summary
  19. Suggest /pdca design user-auth
  20. Mention /plan-plus alternative
```

### 2.3 Hybrid Evals — Both

**plan-plus** (유일한 hybrid):
- Process compliance: 5 phases (Context Exploration → Intent Discovery → Alternatives → YAGNI Review → Incremental Validation)
- Output quality: Plan document 생성 (Executive Summary, User Intent, Alternatives, YAGNI, Brainstorming Log)
- HARD-GATE compliance: 프로세스 중 코드 작성/스캐폴딩 금지

---

## 3. 평가 엔진

### runner.js — 실행

```bash
node runner.js --skill pdca               # 단일 스킬
node runner.js --classification workflow   # 분류별 전체
node runner.js --benchmark                # 전체 벤치마크
node runner.js --parity starter           # Parity test
```

**평가 로직**:

```javascript
evaluateAgainstCriteria(prompt, expected, criteria)
  → Placeholder detection (< 50 chars or single line = fail)
  → Keyword-based criterion matching
  → Score = matched / total criteria
  → Return { score, matched, failed, details }
```

### ab-tester.js — A/B 테스트

```bash
node ab-tester.js --skill starter --modelA claude-sonnet-4-6 --modelB claude-opus-4-6
node ab-tester.js --parity starter --model claude-opus-4-6
```

**A/B Test**:
```
Model A (sonnet) vs Model B (opus) → 같은 스킬, 같은 프롬프트
  → metrics: accuracy, time, tokens
  → 어느 모델이 더 나은 결과?
```

**Parity Test**:
```
Model + Skill vs Model alone (스킬 없이)
  → 스킬 없는 결과가 85%+ 품질이면 → deprecation 후보
  → generateDeprecationRecommendation(parityResult)
```

**Parity Threshold**: 85% (config.json에서 조정 가능)

### reporter.js — 결과 리포트

3 포맷:

| Format | 용도 | 내용 |
|--------|------|------|
| **markdown** | 사람 읽기용 | pass/fail summary |
| **detailed** | 분석용 | failed criteria, score distribution, placeholder detection |
| **json** | 통합용 | compact summary |

---

## 4. Config

### evals/config.json (v2.0.4)

```json
{
  "version": "2.0.4",
  "defaultTimeout": 60000,
  "maxRetries": 2,
  "benchmarkModel": "claude-sonnet-4-6",
  "parityThreshold": 0.85,
  "classifications": {
    "workflow":   { "evalType": "process_compliance", "parityTest": false },
    "capability": { "evalType": "output_quality",     "parityTest": true },
    "hybrid":     { "evalType": "both",               "parityTest": true }
  },
  "skills": {
    "workflow": ["bkit-rules", "bkit-templates", "pdca", ...],    // 11
    "capability": ["starter", "dynamic", "enterprise", ...],       // 18
    "hybrid": ["plan-plus"]                                        // 1
  }
}
```

---

## 5. Superpowers vs bkit Eval 비교

| 측면 | Superpowers | bkit |
|------|-------------|------|
| **평가 방식** | Pressure scenario (수동) | YAML eval definitions (자동) |
| **실행** | `claude -p` headless + stream-json | `node runner.js` |
| **평가 기준** | 3+ 압력 조합 + A/B/C 선택 강제 | 15-20 numbered criteria checklist |
| **Parity Test** | 없음 | 모델 vs 모델+스킬 비교 (85%) |
| **A/B Test** | 없음 | 모델 간 비교 |
| **Deprecation** | 없음 | Parity → deprecation recommendation |
| **분류별 평가** | 없음 | Workflow(compliance) / Capability(quality) |
| **자동화** | 반자동 (시나리오 수동 설계) | 완전 자동 (runner + reporter) |

### Superpowers Pressure Testing의 장점 (bkit에 없는 것)

Superpowers의 pressure scenario는 **LLM이 규칙을 회피하려는 상황**을 테스트:
- 3+ 압력 조합 ("시간 부족 + 테스트 불필요 + 빠르게 해달라")
- 명시적 A/B/C 선택 강제
- "What do you do?" (should가 아닌 do)

bkit의 eval은 **올바른 출력/프로세스**를 체크하지만, **합리화 저항력**은 테스트하지 않음.

---

## 6. Test Infrastructure — 4,028 TC

### 12 Test Categories

| Category | Files | TC | 설명 |
|----------|:-----:|:--:|------|
| **unit** | 57 | ~1,700 | 개별 함수 단위 테스트 |
| **integration** | 25 | ~560 | 모듈 간 통합 테스트 |
| **security** | 13 | ~249 | 권한, 파괴적 작업, 무결성 |
| **regression** | 21 | ~531 | 버전 호환성, 회귀 방지 |
| **performance** | 13 | ~182 | Hook/module/benchmark 성능 |
| **philosophy** | 8 | ~138 | 설계 원칙 검증 |
| **ux** | 15 | ~185 | UI 렌더링, 인터페이스 |
| **e2e** | 6 | ~80 | Eval benchmark + CLI 테스트 |
| **architecture** | 5 | ~100 | State machine, 의존성 |
| **controllable-ai** | 4 | ~80 | 안전성, Trust 패턴 |
| **behavioral** | 3 | ~45 | 에이전트/스킬 오케스트레이션 (v2.1.0) |
| **contract** | 3 | ~40 | Hook/MCP 스키마 검증 (v2.1.0) |
| **TOTAL** | **192+** | **~4,028** | **607/607 exports covered** |

### Test Framework

**No external dependencies** — `console.assert` 기반 커스텀 프레임워크.

```javascript
function assert(id, condition, message) {
  total++;
  if (condition) { passed++; console.log(`  PASS: ${id} - ${message}`); }
  else { failed++; console.error(`  FAIL: ${id} - ${message}`); }
}
```

**Zero-dep 패턴**: Jest/Mocha 없이 Node.js 내장 기능만 사용. bkit의 zero-dep 철학은 아니지만 (Node.js 필수), 테스트 프레임워크 의존은 없음.

### Test Runners (2종)

**run-all.js** (Node.js, ~3,880 TC):

```bash
node test/run-all.js                # 전체
node test/run-all.js --unit         # 단위만
node test/run-all.js --security     # 보안만
node test/run-all.js --behavioral   # 행동만 (v2.1.0)
```

**run-all-tests.sh** (Shell, E2E + Performance):

```bash
./test/run-all-tests.sh --e2e      # E2E (80 TC)
./test/run-all-tests.sh --perf     # 성능 (70 TC)
./test/run-all-tests.sh --all      # 둘 다
```

### Test Helpers (6 utilities)

| Helper | 역할 |
|--------|------|
| `assert.js` | 커스텀 assertion |
| `hook-runner.js` | Hook 스크립트를 자식 프로세스로 실행, stdin/stdout JSON |
| `mcp-client.js` | JSON-RPC 2.0 클라이언트 (MCP 서버 테스트) |
| `report.js` | 테스트 리포트 생성 + v1.6.2 baseline 비교 |
| `temp-dir.js` | 격리된 임시 디렉토리 |
| `timer.js` | 정밀 시간 측정 |

### Performance Baselines

| Hook | Threshold |
|------|:---------:|
| SessionStart | ~450ms |
| UserPromptSubmit | ~120ms |
| PreToolUse | ~80ms |
| PostToolUse | ~150ms |
| Full startup | ~800-900ms |
| Core modules only | ~300-400ms |
| Eval YAML parse | ~15-20ms/file |
| Full benchmark (31 skills) | ~25-30s |

---

## 7. 독특한 Test Categories

### 7.1 Philosophy Tests (8 files, ~138 TC)

설계 원칙 자체를 테스트:
- "Automation First"가 코드에 반영되어 있는가?
- "No Guessing" 정책이 guard로 구현되어 있는가?
- "Docs = Code" 동기화가 유지되는가?

**Superpowers에 없는 접근**: 철학/원칙을 코드 레벨에서 검증.

### 7.2 Controllable AI Tests (4 files, ~80 TC)

L0-L4 자동화 레벨 + Trust Score + Guardrail을 테스트:
- Emergency stop이 작동하는가?
- Trust Score 계산이 정확한가?
- Destructive detection이 올바르게 차단하는가?

### 7.3 Behavioral Tests (v2.1.0, 3 files, ~45 TC)

에이전트/스킬의 오케스트레이션 동작 테스트:
- Agent trigger matching (8개 언어)
- Skill classification과 discovery
- Multi-agent team coordination

### 7.4 Contract Tests (v2.1.0, 3 files, ~40 TC)

Hook/MCP의 스키마 호환성 테스트:
- Hook input JSON 스키마 검증
- Hook output JSON 스키마 검증
- MCP 프로토콜 컴플라이언스

---

## 8. Eval Lifecycle 전체 흐름

```
1. Skill 생성
   → skill-create 스킬로 생성
   → evals/{classification}/{skill}/ 디렉토리 생성

2. Eval 정의
   → eval.yaml + prompt-1.md + expected-1.md 작성
   → criteria: 15-20개 numbered checklist

3. 평가 실행
   → node runner.js --skill {name}
   → score = matched / total criteria
   → Pass/Fail 판정

4. Benchmark
   → node runner.js --benchmark
   → 모든 스킬 전체 평가
   → reporter.js로 리포트 생성

5. Model Parity Test (Capability only)
   → node ab-tester.js --parity {skill} --model {model}
   → 스킬 없이 85%+ 달성? → deprecation 후보
   → generateDeprecationRecommendation()

6. A/B Test (모델 업그레이드 시)
   → node ab-tester.js --skill {name} --modelA {old} --modelB {new}
   → 새 모델이 더 나은가?

7. Deprecation
   → Parity 통과 → deprecation 표시
   → 다음 major version에서 제거
```

---

## 9. Superpowers 3-Layer vs bkit Multi-Layer 비교

| Layer | Superpowers | bkit |
|-------|-------------|------|
| **1. Trigger** | headless `claude -p` + stream-json | YAML eval + runner.js |
| **2. Compliance** | Pressure scenario (3+ 압력) | Process compliance checklist (20 criteria) |
| **3. Integration** | 파일 생성/테스트/커밋 검증 | E2E benchmark + CLI |
| **4. Output Quality** | — | Capability eval (15 criteria) |
| **5. Model Parity** | — | A/B tester (85% threshold) |
| **6. Unit/Integration** | — | 4,028 TC across 12 categories |
| **7. Performance** | — | Hook/module baselines |
| **8. Philosophy** | — | 설계 원칙 검증 |
| **9. Contract** | — | Hook/MCP 스키마 검증 |

---

## 10. 하네스 설계 시사점

### 10.1 Eval = Skill의 품질 보증

bkit의 eval 시스템은 **스킬마다 정의된 평가 기준**으로 자동화된 품질 검증을 가능하게 함.

**하네스 적용**: 스킬 생성 시 eval 정의 필수. 최소한 trigger accuracy + output quality.

### 10.2 Parity Test의 혁신성

"모델이 발전하면 이 스킬이 불필요해지는가?"를 자동 감지:
- Capability 스킬의 수명을 관리
- 불필요한 컨텍스트 소모 방지
- 모델 업그레이드마다 전체 benchmark 실행

**하네스 적용**: 초기에는 수동 parity 판단, 스킬 수 증가 시 자동화.

### 10.3 Pressure Testing 부재

bkit eval의 가장 큰 약점: **합리화 저항력 테스트 없음**.
- Superpowers의 pressure scenario가 이를 보완
- "시간 압박 + 테스트 불필요 + 빠르게" 조합에서 스킬이 버티는가?

**하네스 적용**: Superpowers의 pressure testing + bkit의 criteria checklist를 **결합**.

### 10.4 Philosophy Tests

설계 원칙을 코드 레벨에서 검증하는 접근은 독창적:
- "우리가 말한 원칙이 실제로 구현되어 있는가?"
- 원칙과 구현의 괴리를 조기 감지

**하네스 적용**: 핵심 원칙 3-5개를 코드로 검증하는 테스트 작성.

### 10.5 Zero-Dep Test Framework

Jest/Mocha 없이 `console.assert` 기반:
- 장점: 설치 없이 즉시 실행, 외부 의존 제거
- 단점: watch mode, coverage 등 고급 기능 부재

**하네스 적용**: 초기에는 zero-dep으로 시작, 규모 커지면 test runner 도입 검토.

### 10.6 Contract Testing

Hook input/output 스키마와 MCP 프로토콜을 검증하는 contract test는:
- Claude Code 버전 업그레이드 시 호환성 보장
- 외부 인터페이스 변경 조기 감지

**하네스 적용**: Hook I/O 스키마 contract test 필수.

---

**다음 단계**: Step 8 — Takeaways (하네스 설계 시사점 + Superpowers 비교 종합)
