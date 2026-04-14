# Compound Engineering - Testing & Quality

> 48 test files, contract tests, confidence calibration, review tiers, structured findings pipeline

---

## 1. Test Suite 개요

### 48 Test Files — 7 Categories

| Category | 파일 수 | 대표 파일 | 테스트 대상 |
|----------|:-------:|----------|------------|
| **Converter** | 10 | converter.test.ts, codex-converter.test.ts | claude-to-* 변환 로직 |
| **Writer** | 10 | opencode-writer.test.ts, codex-writer.test.ts | write*Bundle() 파일 출력 |
| **Sync** | 10 | sync-codex.test.ts, sync-copilot.test.ts | syncTo*() 동기화 |
| **Parser** | 2 | claude-parser.test.ts, claude-home.test.ts | 플러그인/홈 config 파싱 |
| **Utility** | 6 | detect-tools.test.ts, model-utils.test.ts, frontmatter.test.ts, path-sanitization.test.ts, extract-commands-normalize.test.ts, resolve-output.test.ts | 유틸리티 함수 |
| **Contract** | 3 | review-skill-contract.test.ts, pipeline-review-contract.test.ts, compound-support-files.test.ts | **SKILL.md 프로즈 계약** |
| **Release** | 4 | release-components.test.ts, release-config.test.ts, release-metadata.test.ts, release-preview.test.ts | 릴리스 자동화 |
| **Other** | 3 | cli.test.ts, plugin-path.test.ts, resolve-base-script.test.ts | CLI/스크립트 |

### 프레임워크: bun:test

```typescript
import { describe, expect, test } from "bun:test"

describe("convertClaudeToOpenCode", () => {
  test("from-command mode: map allowedTools to permission block", async () => {
    const plugin = await loadClaudePlugin(fixtureRoot)
    const bundle = convertClaudeToOpenCode(plugin, { ... })
    expect(bundle.config.permission.edit).toBe("allow")
  })
})
```

**특징**: Zero external dependencies. bun:test는 Bun 내장. Jest와 호환되는 API.

---

## 2. 테스트 패턴

### 2.1 Fixture 기반 Converter Tests

```
tests/
├── fixtures/
│   ├── sample-plugin/          # 표준 플러그인 구조
│   ├── mcp-file/               # .mcp.json fallback
│   ├── custom-paths/           # 커스텀 컴포넌트 경로
│   ├── invalid-command-path/   # 경로 탈출 시도
│   ├── invalid-hooks-path/     # hooks 경로 탈출
│   └── invalid-mcp-path/       # MCP 경로 탈출
└── converter.test.ts
```

```typescript
// 6개 fixture root로 다양한 시나리오 커버
const fixtureRoot = path.join(import.meta.dir, "fixtures", "sample-plugin")
const invalidCommandPathRoot = path.join(import.meta.dir, "fixtures", "invalid-command-path")

test("rejects custom component paths that escape the plugin root", async () => {
  await expect(loadClaudePlugin(invalidCommandPathRoot)).rejects.toThrow(
    "Invalid commands path: ../outside-commands. Paths must stay within the plugin root."
  )
})
```

### 2.2 Temp Directory 격리 (Writer/Sync Tests)

```typescript
test("writes config without destroying user keys", async () => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "sync-codex-"))
  // ... 테스트 실행 ...
  // tempRoot는 OS가 정리
})
```

**모든 writer/sync 테스트**가 `fs.mkdtemp`로 격리된 임시 디렉토리 사용. 테스트 간 상태 공유 없음.

### 2.3 Contract Tests (핵심 혁신)

```typescript
// review-skill-contract.test.ts
describe("ce-review contract", () => {
  test("documents explicit modes and orchestration boundaries", async () => {
    const content = await readRepoFile(
      "plugins/compound-engineering/skills/ce-review/SKILL.md"
    )
    expect(content).toContain("## Mode Detection")
    expect(content).toContain("mode:autofix")
    expect(content).toContain("mode:report-only")
    expect(content).toContain("mode:headless")
    // Negative assertion: interactive question removed from autofix mode
    expect(content).not.toContain("Which severities should I fix?")
  })
})
```

```typescript
// pipeline-review-contract.test.ts
describe("ce:work review contract", () => {
  test("requires code review before shipping", async () => {
    const content = await readRepoFile(
      "plugins/compound-engineering/skills/ce-work/SKILL.md"
    )
    expect(content).toContain("ce:review")
    // Ordering assertion
    const reviewIdx = content.indexOf("ce:review")
    const shipIdx = content.indexOf("Ship It")
    expect(reviewIdx).toBeLessThan(shipIdx)
  })
})
```

**Contract Tests란**: 런타임 코드가 아니라 **SKILL.md 프로즈(산문) 내용**을 테스트.

| 테스트 대상 | 검증 항목 |
|------------|----------|
| 문자열 포함 (`toContain`) | 필수 섹션/키워드 존재 |
| 문자열 부재 (`not.toContain`) | 제거된 기능이 재등장하지 않음 |
| 순서 (`indexOf` 비교) | 워크플로우 단계 순서 보장 |
| 크로스 파일 일관성 | ce:work ↔ ce:work-beta ↔ ce:plan 동기화 |
| JSON 스키마 파싱 | findings-schema.json 내 enum 값 검증 |

**Superpowers/bkit 대비**:
- Superpowers: 테스트 없음
- bkit: 4,028 TC (unit, integration, philosophy, behavioral, contract)
- Compound: **48 파일, contract tests 포함** — bkit보다 적지만 contract test 패턴은 유사

### 2.4 보안 테스트

```typescript
// Path traversal 방지
test("rejects paths that escape plugin root", async () => {
  await expect(loadClaudePlugin(invalidCommandPathRoot)).rejects.toThrow(
    "Invalid commands path: ../outside-commands"
  )
})

// Prototype pollution regression
test("does not throw on Object.prototype property names", () => {
  expect(() => isRiskFlag("constructor", "git")).not.toThrow()
  expect(() => isRiskFlag("__proto__", "git")).not.toThrow()
  expect(isRiskFlag("constructor", "git")).toBe(false)
})
```

### 2.5 Regression 라벨

```typescript
// Issue 번호를 테스트명에 포함
test("omits model for subagents to allow provider inheritance (#477)", () => { ... })
test("rewrites FQ agent names in copied skill markdown (#477)", async () => { ... })
```

---

## 3. Review Quality System

### 3.1 Persona 선택 체계

```
ce:review 실행
  ↓
Always-on (6):
  correctness, testing, maintainability, project-standards  (structured JSON)
  agent-native-reviewer, learnings-researcher               (unstructured, 별도 합성)
  ↓
Conditional — Orchestrator judgment (keyword match가 아님):
  security, performance, api-contract, data-migrations,
  reliability, adversarial, cli-readiness, previous-comments
  ↓
Stack-specific:
  dhh-rails, kieran-rails, kieran-python,
  kieran-typescript, julik-frontend-races
  ↓
CE Conditional (migration-specific):
  schema-drift-detector, deployment-verification-agent
```

### 3.2 조건부 선택 기준

| Persona | 활성화 조건 |
|---------|-----------|
| **security** | Auth middleware, public endpoints, user input, secrets |
| **performance** | DB queries, ORM, 루프 데이터 변환, 캐싱, async |
| **api-contract** | Route definitions, serializer, event schemas, exported types |
| **data-migrations** | Migration files, schema changes, backfill scripts |
| **reliability** | Error handling, retry, circuit breakers, timeouts, background jobs |
| **adversarial** | **≥50 changed executable lines** OR auth/payments/data mutations |
| **cli-readiness** | CLI command definitions, argument parsing, command handlers |
| **previous-comments** | PR-only, 기존 리뷰 코멘트/스레드 존재 |

**핵심**: "agent judgment, not keyword matching" — 오케스트레이터가 diff를 읽고 **판단**으로 선택.

### 3.3 Adversarial Reviewer — Depth Calibration

| Depth | 조건 | 기법 수 | 최대 findings |
|:-----:|------|:-------:|:------------:|
| **Quick** | <50 lines, no risk | 1 (assumption violation) | ≤3 |
| **Standard** | 50-199 lines OR minor risk | 3 | — |
| **Deep** | 200+ lines OR strong risk | 4 (all techniques, multiple passes) | — |

**4가지 공격 기법**:
1. **Assumption violation**: 데이터 형태, 타이밍, 순서, 값 범위
2. **Composition failures**: 계약 불일치, 공유 상태 변이, 경계 간 순서
3. **Cascade construction**: 리소스 고갈, 상태 손상 전파, 복구 유발 실패
4. **Abuse cases**: 반복, 타이밍, 동시 변이, 경계 탐색

---

## 4. Confidence Calibration

### 공통 신뢰도 척도

| 범위 | 의미 | 행동 |
|:----:|------|------|
| 0.00-0.29 | Not confident / false positive | **Suppress** |
| 0.30-0.49 | Somewhat confident | **Suppress** (too speculative) |
| 0.50-0.59 | Moderately confident | **P0만 보고** |
| 0.60-0.69 | Confident enough to flag | 명확히 actionable할 때만 |
| 0.70-0.84 | Highly confident | **Full evidence로 보고** |
| 0.85-1.00 | Certain | **반드시 보고** |

**Suppress Threshold**: `0.60` (예외: P0 severity는 `0.50+`)

### Persona별 신뢰도 기준

| Persona | High (0.80+) | Moderate (0.60-0.79) | Low (<0.60) |
|---------|-------------|---------------------|-------------|
| **correctness** | 전체 실행 경로 추적 가능 | 조건 보이지만 완전 확인 불가 | Suppress |
| **adversarial** | 완전한 구체적 시나리오 | 추적 가능하지만 부분 확인 | Suppress |
| **testing** | gap이 diff만으로 증명 가능 | 파일 구조에서 추론 | Suppress |
| **security** | 전체 공격 경로 추적 가능 | 위험 패턴이지만 악용 불확실 | Suppress |

### Cross-Reviewer Agreement Boost

```
동일 finding에 2+ reviewer가 동의 → confidence +0.10
```

### False-Positive 억제 목록

- diff와 무관한 기존 이슈 (pre_existing: true)
- linter/formatter가 잡을 스타일 nitpick
- 의도적 코드 (코멘트, 커밋 메시지 확인)
- 코드베이스 다른 곳에서 이미 처리된 이슈
- 다른 표현으로 기존 코드를 재서술하는 제안
- 구체적 실패 모드 없는 "consider adding" 조언

---

## 5. Structured Findings Pipeline

### Sub-Agent 출력: Two-Tier Pattern

```
Sub-Agent 실행
  ├─ Full Artifact (disk)
  │   .context/compound-engineering/ce-review/{run_id}/{reviewer_name}.json
  │   → 모든 필드 (why_it_matters, evidence 포함)
  │   → downstream consumers, headless output, 디버깅용
  │
  └─ Compact Return (in-memory)
      → merge-tier 필드만 (title, severity, file, line,
         confidence, autofix_class, owner, requires_verification,
         pre_existing, suggested_fix)
      → orchestrator context를 lean하게 유지
```

**핵심**: context window 관리. 오케스트레이터에는 compact return만, 상세 정보는 disk artifact에.

### Finding Schema (ce-review)

```json
{
  "reviewer": "string",
  "findings": [{
    "title": "string (≤100자)",
    "severity": "P0 | P1 | P2 | P3",
    "file": "string",
    "line": "number",
    "why_it_matters": "string",
    "autofix_class": "safe_auto | gated_auto | manual | advisory",
    "owner": "review-fixer | downstream-resolver | human | release",
    "requires_verification": "boolean",
    "confidence": "0.0-1.0",
    "evidence": ["string (minItems: 1)"],
    "pre_existing": "boolean",
    "suggested_fix": "string (optional)"
  }],
  "residual_risks": ["string"],
  "testing_gaps": ["string"]
}
```

### Severity 정의

| Severity | 의미 | 행동 |
|:--------:|------|------|
| **P0** | Critical breakage, 악용 가능, 데이터 손실 | merge 전 수정 필수 |
| **P1** | 정상 사용에서 발생할 고영향 결함 | 수정 권장 |
| **P2** | 유의미한 단점이 있는 중간 이슈 | 간단하면 수정 |
| **P3** | 저영향, minor improvement | 재량 |

### Autofix Class 라우팅

| Class | 의미 | 다음 Actor |
|-------|------|-----------|
| `safe_auto` | 로컬, 결정적, 기계적 적용 가능 | **review-fixer** (자동) |
| `gated_auto` | 구체적 수정 있지만 계약/경계 변경 | downstream-resolver 또는 human |
| `manual` | 설계 결정 필요, cross-cutting 변경 | downstream-resolver 또는 human |
| `advisory` | 보고 전용, 코드 수정 작업 아님 | human 또는 release |

### Finding Classification Tiers

| Tier | 정의 | 보고 |
|------|------|------|
| **Primary** | diff에서 직접 변경된 줄 | Full confidence |
| **Secondary** | 변경된 줄과 같은 함수/블록의 미변경 코드 | 상호작용 주석과 함께 |
| **Pre-existing** | diff와 무관한 미변경 코드 | `pre_existing: true`, verdict 제외 |

### 7-Stage Merge Pipeline

```
1. Scope Discovery (resolve-base.sh → diff)
2. Intent Discovery (2-3줄 요약)
3. Plan Discovery (plan: 인자 → PR body → 자동 검색)
4. Reviewer Selection (always-on + conditional)
5. Standards Discovery (AGENTS.md, CLAUDE.md glob)
6. Sub-Agent Dispatch
     → model tiering: personas = sonnet, orchestrator = default
     → run_id 생성
     → 각 agent: artifact JSON + compact return
7. Merge Findings
     → confidence gate (0.60, P0은 0.50+)
     → dedup by fingerprint
     → cross-reviewer agreement boost (+0.10)
     → normalize routing (most conservative wins)
     → partition: fixer queue / residual / report-only
8. Synthesize & Present
     → severity-grouped pipe-delimited tables
     → Applied Fixes / Residual / Learnings / Agent-Native Gaps
     → Verdict blockquote
```

---

## 6. Document Review Quality

### ce-review vs document-review 비교

| 측면 | ce-review (코드) | document-review (문서) |
|------|-----------------|---------------------|
| **Finding 위치** | `file:line` | `section` (문서 섹션명) |
| **Autofix** | 4-way (safe_auto/gated_auto/manual/advisory) | Binary (auto/present) |
| **Finding 유형** | — | `error` vs `omission` |
| **Owner** | 4-way (review-fixer/downstream/human/release) | — |
| **Pre-existing** | ✅ | — |
| **Artifact file** | ✅ (.context/.../run_id/) | — |
| **Personas** | 17 (4 always + 13 conditional) | 7 (2 always + 5 conditional) |
| **Suppress threshold** | 0.60 | 0.50 |

### Document Review Synthesis (7-Step)

```
1. Validate schema
2. Confidence gate (0.50)
3. Deduplicate (normalize(section)+normalize(title) fingerprint)
     → 모순은 보존 (dedup 제외)
4. Promote residuals (cross-persona corroboration, concrete blocking risk)
5. Resolve contradictions → combined present+error findings
6. Promote present→auto (codebase pattern이 모호성 해결 시)
7. Route/sort: P0→P3 → errors→omissions → confidence↓
```

---

## 7. Review Modes

### 4가지 실행 모드

| Mode | 질문 | 수정 | Todo | 용도 |
|------|:----:|:----:|:----:|------|
| **Interactive** (기본) | ✅ | safe_auto | ✅ | 대화형 리뷰 |
| **Autofix** | ❌ | safe_auto | ✅ (residual) | ce:work에서 자동 호출 |
| **Report-only** | ❌ | ❌ | ❌ | 동시 브라우저 테스트 중 |
| **Headless** | ❌ | safe_auto (단일 패스) | ❌ | skill-to-skill 프로그래밍 호출 |

### Headless 출력 포맷

```
Verdict: <verdict>
Artifact: .context/compound-engineering/ce-review/<run-id>/

=== autofix_class: safe_auto ===
| Title | Severity | File | Line | Confidence |
...

=== autofix_class: gated_auto ===
...

Review complete    ← terminal signal
```

### Review Tiers (ce:work에서의 선택)

| Tier | 조건 | 방법 |
|:----:|------|------|
| **Tier 2** (기본) | 대부분의 변경 | `ce:review mode:autofix plan:<path>` |
| **Tier 1** (self-review) | **4조건 모두 충족**: purely additive + single concern + pattern-following + plan-faithful | Inline self-review (ce:review 호출 안 함) |

---

## 8. Protected Artifacts

```
ce:review와 document-review 모두:
  docs/brainstorms/*      → 삭제 플래그 금지
  docs/plans/*.md         → 삭제 플래그 금지
  docs/solutions/*.md     → 삭제 플래그 금지
```

Knowledge compounding 파이프라인의 산출물은 리뷰에서 보호.

---

## 9. Superpowers/bkit/Compound 비교

| 측면 | Superpowers | bkit | Compound |
|------|-------------|------|----------|
| **테스트 수** | 없음 | 4,028 TC (12 카테고리) | **48 파일** (7 카테고리) |
| **프레임워크** | — | Zero-dep (console.assert) | **bun:test** |
| **Contract tests** | — | ✅ (40 TC) | **✅ (SKILL.md 프로즈)** |
| **Philosophy tests** | — | ✅ (138 TC) | — |
| **리뷰 personas** | 2-stage (Spec→Quality) | Council pattern | **17 personas (structured JSON)** |
| **신뢰도** | — | — | **0.0-1.0 scale, 0.60 suppress** |
| **자동 수정** | — | — | **4-way autofix class** |
| **Finding 구조** | — | — | **JSON schema + two-tier output** |

### Compound의 독특한 패턴

1. **Contract Tests on Prose** — SKILL.md 내용을 문자열 검증. bkit의 contract test가 코드 인터페이스를 테스트하는 반면, Compound는 **프롬프트 산문**을 테스트.

2. **Two-Tier Output** — context window 관리를 위해 full artifact (disk) + compact return (memory) 분리. bkit에는 없는 패턴.

3. **Confidence Calibration** — 모든 reviewer에 통일된 0.0-1.0 scale + suppress threshold. bkit의 Trust Score (6 component, 0-100)와 목적은 유사하지만 적용 범위가 다름 (CE: per-finding, bkit: per-session).

4. **Base Branch Detection** — `resolve-base.sh` 스크립트: PR metadata → symbolic ref → gh API → common name scan → merge-base. 4단계 fallback으로 다양한 git 환경 지원.

---

## 10. 하네스 설계 시사점

### 채용할 패턴

1. **Contract Tests on Prompt Prose** — 스킬의 SKILL.md가 필수 섹션, 키워드, 워크플로우 순서를 유지하는지 자동 검증. 프롬프트 drift 방지.

2. **Confidence Calibration** — 모든 review agent에 통일된 신뢰도 척도 + suppress threshold. False positive 감소의 핵심.

3. **Two-Tier Output** — sub-agent 결과를 full (disk) + compact (memory)로 분리. 오케스트레이터 context window를 보호하면서 상세 정보 보존.

4. **Finding Classification** — Primary/Secondary/Pre-existing 3-tier. diff와 무관한 기존 이슈를 verdict에서 제외하여 noise 감소.

5. **Autofix Class 라우팅** — safe_auto/gated_auto/manual/advisory 4단계로 자동 수정 범위를 명확히 제한.

6. **Adversarial Depth Calibration** — diff 크기 + 도메인 위험도로 리뷰 깊이 자동 조절. 작은 변경에 과도한 리뷰 방지.

### 주의할 패턴

1. **Persona 수 관리** — 17 personas는 관리 부담. Stack-specific personas (dhh-rails, kieran-*)는 팀/프로젝트에 특화되어 범용성 낮음.

2. **Contract Test 취약성** — 문자열 포함/부재 검증은 프롬프트 리팩토링 시 쉽게 깨짐. 의미적 검증이 아닌 구문적 검증의 한계.

3. **Merge Pipeline 복잡도** — 7-stage merge pipeline은 강력하지만 디버깅 어려움. 단계별 artifact 보존이 중요.

---

**다음 단계**: Step 8 — Takeaways (하네스 설계 시사점 + 3자 비교 종합) final
