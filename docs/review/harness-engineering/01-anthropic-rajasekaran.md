# Anthropic — Harness design for long-running apps

> **출처:** https://www.anthropic.com/engineering/harness-design-long-running-apps
> **저자:** Prithvi Rajasekaran (Anthropic Labs)
> **발행일:** 2026-03-24
> **분량:** 장문 기술 블로그

---

## 핵심 테제

> "Harness design has a substantial impact on the effectiveness of long running agentic coding."

- Harness = AI 에이전트가 **장시간 복잡한 작업**을 수행할 수 있도록 설계된 **구조화된 프롬프트 + 오케스트레이션 시스템**.
- 더 좋은 모델을 기다리는 것만으로는 부족 — **모델 성능**과 **harness 튜닝**은 별개의 변수.
- 본 글의 실험: Opus 4.5 · 4.6을 대상으로 장시간 코딩 태스크에서 harness 설계가 주는 효과를 정량 측정.

---

## 1. Long-running app의 특수성 (short-task와의 차이)

| 문제 | 설명 |
|---|---|
| **Context Window 채움** | "models tend to lose coherence on lengthy tasks as the context window fills" |
| **Context Anxiety** | 남은 context가 줄어들면 조기에 작업 종료 시도 |
| **자기평가 왜곡** | 에이전트는 자신의 결과를 과도하게 긍정적으로 평가 |
| **누적 오류** | 초반 실수가 후속 작업으로 cascade |

---

## 2. Context Management

### Compaction vs Context Reset

| 방식 | 설명 | 한계 |
|---|---|---|
| **Compaction** | 초반 대화를 요약하되 같은 에이전트가 계속 실행 | Context anxiety 여전 |
| **Context Reset** | 컨텍스트 창 완전 초기화 + **구조화된 handoff artifact**로 상태 전승 | Sonnet 4.5에선 필수, Opus 4.6에선 불필요 |

**모델별 차이**:
- **Sonnet 4.5**: context anxiety 강함 → reset 필수
- **Opus 4.6**: 완화됨 → automatic compaction으로 충분

---

## 3. Generator-Evaluator 패턴 (GAN 영감)

```
Generator → Output → Evaluator → Feedback Loop → Generator (iteration)
```

**분리의 이유**:
- 단일 에이전트는 자신의 결과를 객관적으로 평가 불가
- 저자 원문: *"Tuning a standalone evaluator to be skeptical turns out to be far more tractable."*
- 독립적 evaluator는 **hard thresholds** 설정 가능

---

## 4. Frontend Design 사례: 4가지 Grading Criteria

Generator와 Evaluator 양측에 동일하게 제공:

1. **Design Quality** — "Does the design feel like a coherent whole rather than a collection of parts?"
   - 색상 · 타이포그래피 · 레이아웃이 일관된 무드 창출
2. **Originality** — 템플릿/라이브러리 기본값 vs 맞춤형 결정
   - *"Telltale signs of AI generation like purple gradients over white cards—fail here."*
3. **Craft** — 기술적 실행 (타이포 계층, 간격, 색상 조화, 명도비)
   - Claude 기본기가 좋아 덜 강조
4. **Functionality** — 인터페이스 이해도, 주요 액션 발견, 추측 없이 작업 완료

**가중치**: Design Quality · Originality > Craft · Functionality
**Calibration**: Few-shot examples로 evaluator 튜닝

---

## 5. Full-Stack 코딩: 3-Agent 아키텍처

### 5.1 Agent Personas

**Planner**
- 1~4문장 프롬프트 → 16-feature 완전 스펙 확장
- 범위는 ambitious, 구현 상세는 제한적 (cascade 오류 방지)
- AI 기능 통합 기회 식별

**Generator**
- Sprint 단위 작업 (한 번에 한 feature)
- Stack: React, Vite, FastAPI, SQLite/PostgreSQL, Git
- 각 sprint 종료 후 self-evaluate → QA로 handoff

**Evaluator (QA)**
- **Playwright MCP**로 실행 중 앱 자동 클릭 테스트
- **Sprint Contract** 사전 협상: "done"의 정의를 code 전에 합의
- Hard thresholds — 하나 미달 시 sprint fail + 상세 피드백 반환

### 5.2 Sprint Contract

**목적**: High-level spec ↔ testable implementation 사이의 다리

**프로세스**:
1. Generator가 구현 제안 + 검증 방법 제시
2. Evaluator가 제안 검토
3. 합의까지 iterate

---

## 6. 실패 모드 & Anti-Patterns

### 6.1 Out-of-the-box Claude의 약점

**QA로서의 한계**:
- *"Out of the box, Claude is a poor QA agent."*
- 발견한 이슈를 스스로 정당화하며 승인
- Superficial testing → 엣지 케이스 누락
- 해결: evaluator 로그 읽고 divergence 수정 → prompt 반복 tuning

**디자인 출력의 한계**:
- *"Gravitates toward safe, predictable layouts that are technically functional but visually unremarkable."*
- 기본값으로는 "AI slop" 패턴 (purple gradients · stock components)

### 6.2 Sprint 구조의 필요성과 제거

- **원래 필요했던 이유**: Opus 4.5의 coherence 한계
- **Opus 4.6에서 제거 가능**: 더 나은 long-context reasoning
- 원문 핵심: *"Every component in a harness encodes an assumption about what the model can't do."*

---

## 7. 구체적 구현 사례

### 7.1 Retro Game Maker (Opus 4.5)

| 실행 방식 | 소요 시간 | 비용 |
|---|---|---|
| Solo (단일 에이전트) | 20분 | $9 |
| Full Harness | 6시간 | $200 |

**Solo의 문제점**:
- UI 레이아웃 비효율
- 게임 플레이 코어 기능 작동 안 함 (entity ↔ runtime 연결 끊김)
- 워크플로우 불명확

**Harness 결과**:
- 16 features · 10 sprints
- 폴리시드 인터페이스 + 일관된 비주얼 아이덴티티
- 실제 게임 플레이 작동 + AI 스프라이트/레벨 생성 통합

### 7.2 Digital Audio Workstation (Opus 4.6, 개선된 harness)

- **소요 시간**: 3시간 50분
- **비용**: $124.70

**Phase별 배분**:

| Phase | 시간 | 비용 |
|---|---|---|
| Planner | 4.7분 | $0.46 |
| Build (3 rounds) | 3시간 20분 | $113.85 |
| QA (3 rounds) | 25.2분 | $10.39 |

**QA가 발견한 Major Gaps (Round 1)**:
- 클립 드래그/이동 미구현
- Instrument UI 패널 (신스 노브, 드럼 패드) 미구현
- 이펙트 에디터 (EQ curves, compressor meters) 미구현

---

## 8. 모델 Evolution: Opus 4.5 vs 4.6

| 특성 | 4.5 | 4.6 |
|---|---|---|
| Context Anxiety | 강함 (reset 필수) | 약함 (compaction OK) |
| Sprint 필요성 | 필수 (scope 관리) | Optional |
| Code Review 능력 | 약함 | 개선 |
| Long-context retrieval | 약함 | 강화 |

---

## 9. 설계 원칙: 점진적 단순화

**원문 핵심 인용**:
> *"Every component in a harness encodes an assumption about what the model can't do on its own, and those assumptions are worth stress testing."*

**적용 방법**:
1. 모든 컴포넌트를 한 번에 제거하려 하지 말 것 (실패함)
2. 한 번에 하나씩 제거 → 영향 검토
3. 새 모델 출시 시 harness 재검토 (불필요한 scaffolding 제거)

---

## 10. 미래 전망 (저자 결론)

> *"As models continue to improve, we can roughly expect them to be capable of working for longer, and on more complex tasks."*

- 모델 개선 = harness 단순화 가능성
- 동시에, 더 나은 모델 = 더 복잡한 작업 시도 가능
- *"The space of interesting harness combinations doesn't shrink as models improve. Instead, it moves."*

---

## 11. 인정 & 참고 자료

**콜라보레이터**: Mike Krieger, Michael Agaby, Justin Young, Jeremy Hadfield, David Hershey, Julius Tarng, Xiaoyi Zhang, Barry Zhang 외

**선행 문서**:
- [Building Effective Agents](https://www.anthropic.com/research/building-effective-agents)
- [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- Claude Agent SDK 공식 문서

---

## 핵심 한 줄

> Harness는 모델의 한계를 구조적으로 보완하되, **모델이 진화하면 그에 맞춰 다시 설계해야 하는 살아있는 시스템**이다.
