# OpenAI — Harness Engineering: Leveraging Codex in an Agent-First World

> **원문 URL:** https://openai.com/index/harness-engineering/
> **주요 저자:** Ryan Lopopolo (OpenAI 기술팀) 외
> **발행일:** 2026년 2월 (추정, 2차 출처 기준)
>
> ⚠️ **출처 경고:** OpenAI 원문은 WebFetch로 직접 접근 실패(HTTP 403). 본 문서는 다음 2차 출처의 교차 인용으로 구성:
> - [InfoQ — "OpenAI Introduces Harness Engineering"](https://www.infoq.com/news/2026/02/openai-harness-engineering-codex/) · Leela Kumili · 2026-02-21
> - [NxCode — "Harness Engineering Complete Guide"](https://www.nxcode.io/resources/news/harness-engineering-complete-guide-ai-agent-codex-2026) · 2026-03-01
>
> 원문 직접 인용·발췌가 필요하면 별도 수단(브라우저·WebArchive)으로 재수집 필요.

---

## 핵심 테제

**Harness Engineering =** "AI 에이전트를 신뢰할 수 있는 규모로 만드는 **인프라·제약조건·피드백 루프**를 설계하는 분야" (NxCode 요약)

**OpenAI의 주장**:
- AI 에이전트가 소프트웨어 개발 라이프사이클의 핵심 업무를 주도하는 새로운 엔지니어링 방법론
- **인간 엔지니어의 역할 전환**: 코드 작성 → **환경 설계 · 의도 명시**

**Ryan Lopopolo 인용** (InfoQ):
> "일관되고 신뢰할 수 있는 방식으로 대규모 AI 워크로드를 실행하기 위해 Harness를 구축했습니다."

**Martin Fowler** (Thoughtworks, InfoQ 인용):
> "Harness Engineering은 AI 지원 소프트웨어 개발의 핵심 부분을 효과적으로 정의한다."

---

## 1. Harness의 3가지 기둥 (NxCode 정리)

### ① Context Engineering

| 구분 | 내용 |
|---|---|
| **정적 컨텍스트** | 리포지토리 문서, `AGENTS.md`/`CLAUDE.md` 파일, 설계 문서 |
| **동적 컨텍스트** | 로그·메트릭·추적 데이터, 디렉토리 구조 매핑, CI/CD 상태 |
| **핵심 규칙** | "에이전트가 접근할 수 없는 정보는 존재하지 않음" |

### ② Architectural Constraints

**의존성 계층화** (엄격한 방향):
```
Types → Config → Repo → Service → Runtime → UI
```

**강제 수단**:
- 결정론적 린터
- LLM 기반 감사자
- 구조 테스트
- pre-commit 훅
- CI 검증

### ③ Entropy Management ("가비지 컬렉션")

**구성 요소**:
- 문서 일관성 에이전트
- 제약조건 위반 스캐너
- 패턴 강제 에이전트
- 의존성 감사자

**실행 트리거**: 일일 · 주간 · 이벤트 기반

---

## 2. Codex와의 통합 (InfoQ)

**주요 구성요소**:
- **Codex 에이전트**: 코드 생성 · 테스트 · 버그 재현 · 수정 제안 · 결과 검증
- **선언적 프롬프트**: 엔지니어가 정의한 작업 사양
- **구조화된 문서**: 설계 명세 · 실행 계획 · 타입 맵 — 단일 출처

**동작 방식**:
- 개발 도구와 직접 상호작용 (PR 개설, 변경사항 평가, 자율 반복)
- 엔지니어 검토 기반 피드백 루프 활용
- 격리된 개발 환경에서 버그 재현·수정
- 자동화된 테스트 생성

---

## 3. 실증 수치 (5개월 내부 실험)

| 지표 | 값 |
|---|---|
| **생성 코드 규모** | 약 **100만 줄** (production code) |
| **인간이 작성한 줄** | **0줄** |
| **개발 기간** | 5개월 |
| **전통 개발 대비** | 약 **1/10의 시간** |
| **범위** | 애플리케이션 로직 · 문서화 · CI 구성 · 관찰성 설정 · 도구 |
| **팀 크기** | 소규모 엔지니어 팀 (PR·CI 워크플로우로 에이전트 안내) |

**실제 운영 상태**:
- 내부 사용자 · 알파 테스터 보유
- 자동 배포 · 수정 운영

---

## 4. 팀 크기별 구현 단계 (NxCode)

| Level | 규모 | 구성 | 설정 시간 |
|---|---|---|---|
| **1** | 개인 | `CLAUDE.md` 또는 `.cursorrules` + pre-commit 훅 + 테스트 스위트 | 1~2시간 |
| **2** | 소규모팀 | `AGENTS.md` 추가 + CI 제약조건 + 공유 프롬프트 템플릿 + 린트 검증 | 1~2일 |
| **3** | 대규모 조직 | 커스텀 미들웨어 + 관찰성 통합 + 엔트로피 관리 에이전트 + A/B 테스팅 + 대시보드 | 1~2주 |

---

## 5. LangChain의 미들웨어 예시 (NxCode 인용)

```
Agent Request
  → LocalContextMiddleware (코드베이스 매핑)
  → LoopDetectionMiddleware (반복 방지)
  → ReasoningSandwichMiddleware (계산 최적화)
  → PreCompletionChecklistMiddleware (검증 강제)
  → Agent Response
```

**벤치마크** (Terminal Bench 2.0):
- 52.8% → **66.5%** 향상
- **Top 30 → Top 5** 상승
- *모델 변경 없이 harness 개선만으로*

**Stripe "Minions" 사례**:
- 주간 병합 PR 수: **1,000개 이상**

---

## 6. 산업 용어 구분 (NxCode)

| 개념 | 범위 | 초점 |
|---|---|---|
| **Prompt Engineering** | 단일 상호작용 | 효과적 프롬프트 |
| **Context Engineering** | 모델 컨텍스트 윈도우 | 정보 공급 |
| **Harness Engineering** | 전체 에이전트 시스템 | 환경 · 제약 · 피드백 · 라이프사이클 |
| **Agent Engineering** | 에이전트 구조 | 내부 설계 · 라우팅 |
| **Platform Engineering** | 인프라 | 배포 · 확장 · 운영 |

Harness Engineering은 위 계층을 **통합·조합**하는 층.

---

## 7. 핵심 설계 원칙 (InfoQ 정리)

- **관찰성 통합** — 로그 · 메트릭 · 스팬으로 애플리케이션 모니터링
- **의존성 계층화** — Types → Config → Repo → Service → Runtime → UI 엄격한 흐름
- **구조 검증** — 린터 · CI 검증으로 아키텍처 경계 강제
- **기계가 읽을 수 있는 제약** — 모듈식 레이어링 위반 방지

---

## 8. Evals/벤치마크 방법론

**InfoQ 확인 범위**: SWE-bench 등 표준 벤치마크 명시적 언급 **없음**.

**확인되는 검증 수단**:
- 기계적 검증 (린터 · CI)
- 구조적 테스트 (모듈식 계층 위반 방지)
- 설계·아키텍처 문서 일관성의 린터 강제

**2차 출처 내에선 **정량 eval framework보다 "구조적·기계적 제약"** 이 중심.

---

## 9. 관련 OpenAI 모델 군 (WebSearch 확인)

| 모델 | 특징 |
|---|---|
| **GPT-5-Codex** | GPT-5를 agentic software engineering에 최적화. 전체 프로젝트 생성, 기능/테스트 추가, 디버깅, 대규모 리팩토링, 코드 리뷰 |
| **GPT-5.1-Codex-Max** | **Compaction** 네이티브 학습 — 다중 컨텍스트 윈도우를 넘나들며 수백만 토큰 단일 태스크 수행. 프로젝트 규모 리팩토링·딥 디버깅·멀티시간 에이전트 루프 |
| **GPT-5.2-Codex** · **5.3-Codex** | 후속 개선 버전 (cybersecurity 기능 강화 포함) |

Harness engineering은 이 모델군을 **운영 가능한 형태**로 묶어내는 층.

---

## 10. Anthropic 대비

| 축 | OpenAI | Anthropic |
|---|---|---|
| 중심 개념 | **Context/Constraints/Entropy 3기둥** | **Generator-Evaluator + Context Reset** |
| 강조점 | 인간 역할 전환 · 1M LOC 실증 | 모델 한계에 맞춘 구조 · 모델 진화에 따른 재설계 |
| 구현 도구 | Codex CLI · PR 워크플로우 | Claude Agent SDK · Playwright MCP |
| 측정 방식 | 린터 · CI · 구조 테스트 | Grading criteria (Design/Originality/Craft/Functionality) |
| 담론 스타일 | 실증 수치 중심 (1M LOC, 5개월, 1/10 시간) | 사례 비교 중심 (solo vs harness, 모델 버전별) |

**공통점**:
- Evaluator와 Generator 분리 필요성 인정
- `AGENTS.md`/`CLAUDE.md` 같은 컨텍스트 파일을 harness의 진입점으로 활용
- 정기 자체 검증 루프

**차이점**:
- Anthropic은 **모델 진화 시 단순화**를 강조 (살아있는 시스템)
- OpenAI는 **대규모 자동 생성의 실증**을 강조 (정적 팀 / agent-first)

---

## 11. 누락된 원문 섹션 (복원 필요)

2차 출처에서 재구성할 수 없는 항목:

- OpenAI 원문의 정확한 섹션 구조 · 헤더
- Lopopolo 외 저자의 전체 인용 · 일화
- 내부 실험(1M LOC)의 구체적 스택·도메인·성공/실패 상세
- "Harness"를 구체적으로 어떻게 조직했는지의 도식·코드 예시

필요 시: `openai.com/index/harness-engineering/` 직접 브라우저 수집 또는 `web.archive.org` 경유 재수집 권장.

---

## 핵심 한 줄

> Harness는 **컨텍스트 공급 · 아키텍처 제약 · 엔트로피 관리**의 3기둥으로, 인간 엔지니어를 **코드 작성자에서 환경·의도 설계자로 재정의**하는 층이다.
