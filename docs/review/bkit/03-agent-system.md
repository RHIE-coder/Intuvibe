# bkit - Agent System

> 36 agents, CTO/PM Agent Teams, orchestration patterns, lib/team 모듈 deep dive

---

## 1. Agent 전체 현황

### 37 Agents (11 Opus / 24 Sonnet / 2 Haiku)

| # | Agent | Model | 역할 |
|---|-------|-------|------|
| | **CTO Team** | | |
| 1 | `cto-lead` | opus | PDCA 전체 오케스트레이션, 기술 방향, 팀 구성 |
| 2 | `frontend-architect` | opus | UI/UX 설계, 컴포넌트 아키텍처 (React/Next.js) |
| 3 | `security-architect` | opus | 취약점 분석, OWASP Top 10, 인증 설계 |
| 4 | `infra-architect` | opus | AWS/K8s/Terraform, CI/CD 설계 |
| 5 | `enterprise-expert` | opus | Enterprise급 AI Native 개발 전략 |
| 6 | `product-manager` | sonnet | 요구사항 분석, Plan 문서 작성 |
| 7 | `qa-strategist` | sonnet | 테스트 전략, 품질 메트릭 관리 |
| | **PM Team** | | |
| 8 | `pm-lead` | opus | PM 팀 오케스트레이션, PRD 전달 |
| 9 | `pm-discovery` | sonnet | OST + 위험 평가 (Teresa Torres) |
| 10 | `pm-strategy` | sonnet | JTBD + Lean Canvas + SWOT |
| 11 | `pm-research` | sonnet | 경쟁 분석 + TAM/SAM/SOM |
| 12 | `pm-prd` | sonnet | PRD 합성 (10 frameworks) |
| 13 | `pm-lead-skill-patch` | sonnet | pm-lead Phase 4 확장, 스킬 니즈 추출 |
| 14 | `skill-needs-extractor` | sonnet | PRD에서 프로젝트별 스킬 니즈 추출 |
| | **QA Team** | | |
| 15 | `qa-lead` | opus | QA 팀 오케스트레이션 |
| 16 | `qa-test-planner` | sonnet | L1-L5 테스트 계획 생성 |
| 17 | `qa-test-generator` | sonnet | 테스트 코드 생성 |
| 18 | `qa-debug-analyst` | sonnet | 디버그 로깅 설계, 런타임 에러 분석 |
| 19 | `qa-monitor` | **haiku** | Docker 로그 실시간 모니터링 (Zero Script QA) |
| | **PDCA Core** | | |
| 20 | `gap-detector` | opus | 설계-구현 gap analysis (Check phase 핵심) |
| 21 | `pdca-iterator` | opus | Evaluator-Optimizer 자동 반복 (Act phase 핵심) |
| 22 | `design-validator` | opus | 설계 문서 완성도/일관성/구현가능성 검증 |
| 23 | `code-analyzer` | opus | 코드 품질, 보안, 성능 이슈 감지 |
| | **PDCA Eval** | | |
| 24 | `pdca-eval-pm` | sonnet | PM 분석 phase 평가 |
| 25 | `pdca-eval-plan` | sonnet | Plan phase 평가 |
| 26 | `pdca-eval-design` | sonnet | Design phase 평가 |
| 27 | `pdca-eval-do` | sonnet | Do (구현) phase 평가 |
| 28 | `pdca-eval-check` | sonnet | Check (검증) phase 평가 |
| 29 | `pdca-eval-act` | sonnet | Act (개선) phase 평가 |
| | **Guide & Support** | | |
| 30 | `pipeline-guide` | sonnet | 9-phase 개발 파이프라인 가이드 |
| 31 | `starter-guide` | sonnet | 비개발자/초보 프로젝트 가이드 |
| 32 | `report-generator` | **haiku** | PDCA 완료 보고서 자동 생성 |
| | **Specialized** | | |
| 33 | `bkend-expert` | sonnet | bkend.ai BaaS 전문가 (인증, 데이터 모델링) |
| 34 | `self-healing` | opus | Living Context 기반 에러 자동 감지/수정 |
| 35 | `bkit-impact-analyst` | opus | CC 외부 변경의 bkit 아키텍처 영향 분석 |
| 36 | `cc-version-researcher` | opus | Claude Code CLI 버전 변경 조사, diff 보고서 |

### Model 분포 분석

| Model | 수 | 비율 | 용도 |
|-------|:--:|:----:|------|
| **opus** | 12 | 33% | 리더, 아키텍처 판단, 복잡한 분석 |
| **sonnet** | 22 | 61% | 전문 작업, 생성, 평가 |
| **haiku** | 2 | 6% | 모니터링, 보고서 생성 (저비용 반복 작업) |

**Superpowers와의 차이**: Superpowers는 1개 명시 agent (code-reviewer) + 동적 spawn. bkit은 36개 사전 정의 agent.

---

## 2. CTO-Led Agent Team

### cto-lead 상세

**frontmatter**: `model: opus | effort: high | maxTurns: 50 | memory: project`

**tools**: Read, Write, Edit, Glob, Grep, Bash, WebSearch + **Task**(enterprise-expert, infra-architect, bkend-expert, frontend-architect, security-architect, product-manager, qa-strategist, code-analyzer, gap-detector, report-generator, Explore)

**핵심 역할**:
1. PDCA 전체 워크플로우 오케스트레이션
2. Phase별 팀 구성 결정
3. Quality gate 통과/실패 판단
4. 5개 Interactive Checkpoint 관리
5. Background Agent Recovery (CC v2.1.71+)

### Phase별 CTO Actions

| Phase | CTO 행동 | 위임 대상 |
|-------|----------|----------|
| **Plan** | 목표/범위 설정, 리뷰 | product-manager |
| **Design** | 아키텍처 결정, 검증 | frontend-architect, infra-architect, design-validator |
| **Do** | 태스크 분배, 진행 추적 | bkend-expert, frontend-architect (swarm) |
| **Check** | gap analysis 오케스트레이션 | gap-detector, code-analyzer, qa-strategist |
| **Act** | 수정 전략 결정 | pdca-iterator |

### 5 Interactive Checkpoints

```
1. Plan Review     → 유저 승인 후 Design 진입
2. Design Review   → 유저 승인 후 Do 진입
3. Mid-Do Check    → 진행 상황 보고, 방향 확인
4. Check Results   → matchRate 보고, 다음 행동 결정
5. Report Review   → 최종 보고서 승인
```

**설계 원칙**: "CTO는 결정하고 위임한다. 직접 구현하지 않는다."

---

## 3. PM Agent Team

### 4-Phase PM Workflow

```
Phase 1: Context Collection
  → pm-lead가 프로젝트 컨텍스트 수집
  
Phase 2: Parallel Analysis (3 에이전트 동시)
  ├── pm-discovery  → OST + 위험 평가
  ├── pm-strategy   → JTBD + Lean Canvas + SWOT
  └── pm-research   → 경쟁 분석 + TAM/SAM/SOM

Phase 3: PRD Synthesis (순차)
  → pm-prd가 3개 분석 결과를 종합하여 PRD 작성

Phase 4: Delivery
  → pm-lead가 PRD 검증 + 유저에게 전달
```

### PM Agent 프레임워크 매핑

| Agent | 핵심 프레임워크 | 출처 |
|-------|---------------|------|
| `pm-discovery` | OST (Teresa Torres), Pretotypes (Alberto Savoia), 8-Category Risk | pm-skills |
| `pm-strategy` | JTBD 6-Part VP, Lean Canvas (Ash Maurya), SWOT, Porter's 5 Forces | pm-skills |
| `pm-research` | 3 Personas, 5 Competitors, TAM/SAM/SOM (Dual-method), Journey Map | pm-skills |
| `pm-prd` | Beachhead Segment, GTM Strategy, ICP, Pre-mortem, User/Job Stories | pm-skills, Geoffrey Moore |

**총 43 frameworks** — pm-skills (Pawel Huryn, MIT License) 기반.

### Tool 제한 패턴

| Agent | Write | Edit | Bash | 이유 |
|-------|:-----:|:----:|:----:|------|
| `pm-discovery` | X | X | X | 분석만, 코드/파일 수정 금지 |
| `pm-strategy` | X | X | X | 분석만 |
| `pm-research` | X | X | X | 분석만 |
| `pm-prd` | O | O | X | PRD 문서 작성 필요 |
| `pm-lead` | O | O | O | 오케스트레이션 전체 권한 |

**설계 원칙**: 분석 에이전트는 읽기만. 작성 에이전트만 쓰기 권한. 리더만 전체 권한.

---

## 4. PDCA Core Agents

### gap-detector (Check phase 핵심)

**model**: opus | **maxTurns**: 30 | **disallowedTools**: Write, Edit

**matchRate 계산 방식**:

```
matchRate = weighted_sum(
  Structural Score,     # API endpoint/entity 구조 일치
  Functional Score,     # 비즈니스 로직/에러 핸들링
  Contract Score,       # API 3-way 검증 (Design → Server → Client)
  Intent Score,         # 설계 의도 반영 (v2.1.1 semantic)
  Behavioral Score,     # 동작 완성도 (v2.1.1 semantic)
  UX Score,             # UI 충실도 (v2.1.1 semantic)
  Runtime Score         # 실제 실행 검증
)
```

**API 3-Way Verification**:
```
Design spec → Server 구현 → Client 호출
  URL, method, params, response shape 각각 비교
  불일치 = gap으로 기록
```

**Placeholder Detection**: 단순히 구현된 척하는 shallow implementation 감지 규칙 내장.

### pdca-iterator (Act phase 핵심)

**model**: opus | **maxTurns**: 20 | **tools**: Write, Edit, Bash + Task(gap-detector)

**Evaluator-Optimizer 패턴**:

```
Generator (수정 적용)
  → Output (코드 변경)
  → Evaluator (gap-detector 재실행)
  → Decision
    ├── matchRate >= threshold → COMPLETE
    ├── iterations < max → 다시 Generator
    └── iterations >= max → PARTIAL/FAIL
```

**4 Evaluator Types**:

| Type | 평가 대상 | 도구 |
|------|----------|------|
| Design-Implementation | 설계-구현 일치 | gap-detector |
| Code Quality | 코드 품질 | code-analyzer |
| Functional | 기능 동작 | qa-monitor |
| Semantic | 의도/행동/UX | v2.1.1 확장 |

### design-validator

**model**: opus | **maxTurns**: 30 | **disallowedTools**: Write, Edit, Bash

읽기 전용. 설계 문서의 3가지를 검증:

| 검증 | 내용 |
|------|------|
| **Completeness** | Phase별 필수 섹션 존재 여부 |
| **Consistency** | 용어, 데이터 타입, 네이밍, API 형식 통일 |
| **Implementability** | 기술 제약, 의존성, 타임라인 현실성 |

`docs/02-design/` 폴더에 문서 생성/수정 시 **자동 invoke**.

---

## 5. Orchestration Patterns

### 5 패턴 정의

| Pattern | 설명 | 사용 Phase |
|---------|------|-----------|
| **leader** | CTO가 결정, 에이전트가 실행 | Plan, Design |
| **council** | 다중 에이전트 합의 투표 | Design (Enterprise), Check |
| **swarm** | 병렬 실행 + 조율 | Do |
| **pipeline** | 순차 단계 실행 | — |
| **watchdog** | 모니터링 + 검증 | Act (Enterprise) |

### Level별 Orchestration Matrix

| Phase | Starter | Dynamic | Enterprise |
|-------|---------|---------|------------|
| **Plan** | single | leader | council |
| **Design** | single | leader | council |
| **Do** | single | swarm | swarm |
| **Check** | single | council | council |
| **Act** | single | leader | watchdog |

**Starter**: 팀 없음 (단일 세션). **Dynamic**: 3명 팀. **Enterprise**: 6명 팀.

### Phase 전이 시 팀 재구성

```
Phase 전이 감지
  → orchestrator.shouldRecompose(newPhase, level)
  → true: 새 팀 구성 + spawnTeam 명령 생성
  → false: 기존 팀 유지, 태스크만 갱신
```

**핵심**: Do → Check 전이 시 구현 팀(bkend-expert, frontend-architect) → 검증 팀(gap-detector, code-analyzer, qa-strategist)으로 교체.

---

## 6. lib/team 모듈 구조

### 9 모듈, 44 exports

| Module | 역할 | 핵심 함수 |
|--------|------|----------|
| **coordinator.js** | 팀 가용성, 전략 생성 | `isTeamAvailable()`, `buildAgentTeamPlan()` |
| **orchestrator.js** | Phase별 패턴 선택, 팀 구성 | `selectPattern()`, `composeTeam()`, `generateSpawnTeam()` |
| **cto-logic.js** | CTO 의사결정 로직 | `decidePdcaPhase()`, `evaluateDocument()`, `evaluateCheckResults()` |
| **strategy.js** | Level별 전략 정의 | `TEAM_STRATEGIES` (Dynamic: 3, Enterprise: 6 roles) |
| **communication.js** | 팀 메시지 구조 | `createMessage()`, `broadcast()` (8 message types) |
| **task-queue.js** | 태스크 할당/추적 | `findNextTask()`, `getProgress()`, `isPhaseComplete()` |
| **hooks.js** | TaskCompleted/TeammateIdle 처리 | `assignNextTeammateWork()`, `handleTeammateIdle()` |
| **state-writer.js** | 런타임 상태 영속화 | `.bkit/runtime/agent-state.json` (atomic write) |
| **index.js** | 전체 export 집약 | 44 exports |

### Communication Protocol (8 message types)

| Type | 방향 | 용도 |
|------|------|------|
| `task_assignment` | CTO → Worker | 태스크 할당 |
| `review_request` | Worker → CTO | 리뷰 요청 |
| `approval` | CTO → Worker | 승인 |
| `rejection` | CTO → Worker | 반려 + 사유 |
| `phase_transition` | CTO → All | Phase 전환 알림 |
| `status_update` | Worker → CTO | 진행 상황 보고 |
| `directive` | CTO → Worker | 지시 |
| `info` | Any → Any | 정보 공유 |

**Superpowers의 4-Status Protocol과 비교**:
- Superpowers: DONE/CONCERNS/NEEDS_CONTEXT/BLOCKED (서브에이전트 → Controller 단방향)
- bkit: 8 message types (양방향 통신, 팀 브로드캐스트 포함)

### State Persistence

```
.bkit/runtime/agent-state.json
{
  teamName, feature, pdcaPhase,
  orchestrationPattern,
  teammates: [...],  // max 10
  messages: [...],   // 50-entry ring buffer
  progress: { total, completed, inProgress, pending }
}
```

**Atomic write**: tmp 파일 작성 → rename. 세션 간 상태 유지.

### Feature Flag

```
CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

Agent Teams 미지원 환경에서는 graceful fallback → 단일 세션 모드.

---

## 7. QA Agent Team

### 구성

```
qa-lead (opus)
  ├── qa-test-planner (sonnet)  → L1-L5 테스트 계획
  ├── qa-test-generator (sonnet) → 테스트 코드 생성
  ├── qa-debug-analyst (sonnet)  → 디버그 로깅/에러 분석
  └── qa-monitor (haiku)         → Docker 로그 실시간 모니터링
```

**Zero Script QA**: 전통적 테스트 스크립트 대신 Docker 로그 기반 AI 모니터링. `qa-monitor`가 haiku 모델로 저비용 상시 감시.

### L1-L5 테스트 레벨

| Level | 범위 | 방법 |
|-------|------|------|
| L1 | curl API 테스트 | curl 명령 기반 |
| L2 | UI 컴포넌트 테스트 | Playwright |
| L3 | E2E 테스트 | Playwright |
| L4 | 성능/부하 테스트 | — |
| L5 | 보안 테스트 | — |

---

## 8. PDCA Eval Agents (6개)

각 PDCA phase별 평가 전문 에이전트:

```
pdca-eval-pm     (sonnet) → PM 분석 품질 평가
pdca-eval-plan   (sonnet) → Plan 문서 품질 평가
pdca-eval-design (sonnet) → Design 문서 품질 평가
pdca-eval-do     (sonnet) → 구현 품질 평가
pdca-eval-check  (sonnet) → 검증 프로세스 평가
pdca-eval-act    (sonnet) → 개선 프로세스 평가
```

**용도**: Skill Evals 시스템에서 각 phase의 스킬이 올바르게 동작하는지 평가. A/B 테스트에서 모델 간 성능 비교에 활용.

---

## 9. Agent Frontmatter 패턴 분석

### 공통 frontmatter 필드

```yaml
name: agent-name
model: opus | sonnet | haiku
effort: high | medium | low
maxTurns: 20-50
context: fork          # 컨텍스트 격리 (선택)
memory: project        # 프로젝트 수준 메모리
tools: [...]           # 허용 도구
disallowedTools: [...]  # 금지 도구
skills: [...]          # 연결 스킬
skills_preload: [...]  # 사전 로드 스킬
```

### Model 선택 기준

| 기준 | opus | sonnet | haiku |
|------|------|--------|-------|
| **의사결정** | O | X | X |
| **아키텍처 판단** | O | X | X |
| **복잡한 분석** | O | X | X |
| **전문 생성/작성** | X | O | X |
| **평가/검증** | 핵심 | 일반 | X |
| **모니터링/반복** | X | X | O |
| **비용 민감** | X | X | O |

### Tool 제한 패턴

| 역할 | Read | Write | Edit | Bash | 원칙 |
|------|:----:|:-----:|:----:|:----:|------|
| **Leader** (cto, pm-lead) | O | O | O | O | 전체 권한 |
| **Validator** (design-validator, gap-detector) | O | X | X | X | 읽기만 — 판단은 하되 수정은 안 함 |
| **Analyzer** (pm-discovery, pm-research) | O | X | X | X | 분석만 |
| **Writer** (pm-prd, report-generator) | O | O | O | X | 문서 작성만, 코드 실행 금지 |
| **Implementer** (pdca-iterator) | O | O | O | O | 수정 + 실행 권한 |

**설계 원칙**: "역할에 필요한 최소 권한만 부여." (Principle of Least Privilege)

---

## 10. Superpowers vs bkit Agent 비교

| 측면 | Superpowers | bkit |
|------|-------------|------|
| **에이전트 수** | 1 named + 동적 spawn | 36 사전 정의 |
| **오케스트레이션** | Controller + Workers (단일 패턴) | 5 patterns (leader/council/swarm/pipeline/watchdog) |
| **팀 구성** | 고정 (Controller 1 + Workers N) | Phase별 동적 재구성 |
| **통신** | 4-Status (단방향) | 8 Message Types (양방향) |
| **상태 관리** | Stateless (TodoWrite 추적만) | Persistent state (agent-state.json) |
| **리뷰** | 2-Stage (Spec → Quality) | council 패턴 (합의 투표) |
| **비용 모델** | Controller 88%, Worker $0.07-0.09 | opus 리더 + sonnet 워커 + haiku 모니터 |
| **확장성** | 유연 (동적 spawn) | 구조적 (사전 정의 역할) |

---

## 11. 하네스 설계 시사점

### 11.1 사전 정의 vs 동적 spawn

- **bkit**: 36개 사전 정의 → 역할/권한이 명확, 관리 용이, 하지만 새 역할 추가에 파일 생성 필요
- **Superpowers**: 동적 spawn → 유연, 하지만 역할 일관성 보장이 어려움
- **하네스 적용**: 핵심 역할은 사전 정의 (5-10개), 나머지는 동적 spawn + 템플릿

### 11.2 최소 권한 원칙

bkit의 `disallowedTools` 패턴은 강력:
- Validator/Analyzer → Write/Edit/Bash 금지
- Leader만 전체 권한
- **하네스 적용**: 모든 agent에 `allowedTools`/`disallowedTools` 명시 필수

### 11.3 Phase별 팀 재구성

Do → Check 전이 시 구현 팀 → 검증 팀 교체는 "불신 기반 리뷰"를 구조적으로 보장.
구현한 에이전트가 자기 코드를 검증하지 않음.

### 11.4 Haiku for Monitoring

`qa-monitor` (haiku)와 `report-generator` (haiku) — 반복적/저복잡도 작업에 최저 비용 모델.
Superpowers의 model selection strategy와 일치하는 패턴.

### 11.5 Communication Protocol

bkit의 8 message types는 과도할 수 있음. Superpowers의 4-Status가 더 실용적.
하지만 council/watchdog 패턴에는 양방향 통신이 필수.
**하네스 적용**: 기본은 4-Status, 합의 필요 시 확장.

---

**다음 단계**: Step 4 — Skill System (38 skills, classification, frontmatter hooks) deep dive
