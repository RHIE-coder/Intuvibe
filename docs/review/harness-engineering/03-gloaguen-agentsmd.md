# ETH Zürich — Evaluating AGENTS.md: 컨텍스트 파일이 코딩 에이전트에 실제로 도움이 되는가?

> **출처:** https://arxiv.org/html/2602.11988v1
> **저자:** Thibaud Gloaguen, Niels Mündler, Mark Müller, Veselin Raychev, Martin Vechev (ETH Zürich · SRI Lab / LogicStar.ai)
> **발행일:** 2026-02 (v1)
> **분량:** 정량 실험 중심 arXiv 프리프린트 (벤치마크 공개 동반)

---

## 핵심 테제

> **"Context files typically *reduce* success rates while *increasing costs by over 20%*."**

2026년 기준 60,000+ 레포지토리가 채택한 `AGENTS.md` / `CLAUDE.md` 패턴 — 업계(Anthropic · OpenAI · QwenLM) 전부가 권장 — 이 **실증적으로 이득이 없거나 역효과**임을 최초로 체계적으로 입증.

핵심 결론:
- **LLM 생성 컨텍스트 파일**: 성공률 ~3% 하락, 비용 ~23% 증가
- **개발자 수기 컨텍스트 파일**: 성공률 ~4% 소폭 상승, 비용 ~19% 증가
- **기존 문서(README 등)를 제거하면 LLM 생성 컨텍스트 파일이 오히려 성능을 올림(+2.7%)** → 즉 자동 생성본은 기존 문서의 **중복**에 불과

---

## 1. 문제 정의

업계 권장과 실증 간의 간극:
- Anthropic, OpenAI, QwenLM 모두 `AGENTS.md` / `CLAUDE.md` 를 "agent 진입 컨텍스트"로 권장
- 그러나 이들이 **task 성공률**을 실제로 올리는지에 대한 체계적 평가 전무
- 기존 벤치마크(SWE-Bench 등) 레포지토리 대부분이 컨텍스트 파일이 없음 → 평가 불가

---

## 2. 방법론

### 2.1 AGENTbench (신규 벤치마크)

| 항목 | 값 |
|---|---|
| 태스크 인스턴스 | 138 |
| 대상 레포지토리 | 12 (모두 개발자 작성 컨텍스트 파일 존재) |
| 언어 | Python (한계점으로 명시) |

### 2.2 실험 조건 3가지

| 조건 | 설명 |
|---|---|
| **NoCtx** | 컨텍스트 파일 없음 (baseline) |
| **LLMCtx** | LLM이 자동 생성한 컨텍스트 파일 (각 agent 벤더 권장 프롬프트 기반) |
| **DevCtx** | 개발자가 실제로 작성해 둔 컨텍스트 파일 |

### 2.3 평가 대상 에이전트

- Claude Code (Sonnet 4.5)
- Codex (GPT-5.2, GPT-5.1 mini)
- Qwen Code (Qwen3-30b-coder)

### 2.4 측정 지표

- **Resolution Rate**: 태스크 성공률
- **Cost**: 토큰 비용 (추가)
- **Trace Analysis**: 도구 호출 빈도, reasoning 토큰, 10개 intent cluster
  (git, model lifecycle, env/deps, build, quality, test, execution, search, file ops, system utilities)

---

## 3. 주요 결과

### 3.1 성공률·비용 요약

| 조건 | ΔSuccess | ΔCost |
|---|---:|---:|
| LLMCtx vs NoCtx | **−2~3%** | **+23%** |
| DevCtx vs NoCtx | **+4%** | **+19%** |

> **"Auto-generated context files don't pay their cost."**

### 3.2 행동 변화 (Trace Analysis)

컨텍스트 파일이 있으면 에이전트는:
- **더 많은 테스트 실행** (+15~40%)
- **더 많은 파일 읽기·검색**
- **레포-특화 도구 호출 증가** (지시사항은 잘 따름)
- **reasoning 토큰 +10~22%**

→ **"agents struggle with additional constraints"** — 지시사항을 따르려는 부담이 성능에 역효과.

### 3.3 중복성 가설의 결정적 증거

> **"When removing all documentation-related files from the codebase, LLM-generated context files tend to outperform developer-provided ones."**

즉 LLM이 생성한 `AGENTS.md`는 **README를 요약·재포장한 것**에 불과. 원본이 있을 때는 중복 → 혼선 → 성능 저하. 원본이 없을 때만 가치 발생.

### 3.4 컨텍스트 파일이 "진입점" 역할을 한다는 가정 검증

- **Claim:** "컨텍스트 파일이 레포 개요를 주어서 agent가 관련 파일을 빠르게 찾는다"
- **결과:** NoCtx 와 DevCtx/LLMCtx 간 **관련 파일 접근률 차이 없음** → 진입점 가설 기각

---

## 4. 저자의 엔지니어링 권고

### 4.1 실무 지침

> **"Omit LLM-generated context files for the time being."**
> **"Include only minimal requirements (e.g., specific tooling to use with this repository)."**

- **자동 생성 금지** (거의 항상 README 중복)
- 수기 작성 시에도 **최소화** — 자주 발견되는 아키텍처·관습을 다시 적지 말 것
- **레포-특화 비자명 제약**만 기록: 특이 빌드 명령, 정책적 금지사항, 숨은 환경 요구

### 4.2 벤더 권장의 오류

Anthropic/OpenAI/QwenLM 의 공개 권장은 **"가이드가 있으면 좋겠다"는 직관**에 기반 — 실증 데이터 없음. 본 연구가 첫 체계적 반증.

### 4.3 평가 설계에 대한 함의

> **"Testing must include trace analysis alongside success metrics."**

- 성공률만 보면 비용 증가·행동 변화가 숨겨짐
- harness/agent 평가는 항상 **(성공률, 비용, trace 행동)** 삼각 측정
- trace intent cluster는 재사용 가능 분류체계

---

## 5. 한계점 (저자 명시)

| 한계 | 설명 |
|---|---|
| 언어 편향 | Python 전용 — 훈련 데이터가 도메인 관습을 이미 인코딩 |
| 메트릭 범위 | 태스크 해결만 — 보안·효율·규약성은 미측정 |
| 생성 방식 | 벤더 권장 프롬프트만 사용 — "원칙적 컨텍스트 생성법" 탐색 없음 |
| 모델 세대 | 2026-02 시점 모델 — 향후 세대에서 결론이 바뀔 가능성 |

---

## 6. 본 프로젝트(devrig/forge) 와의 연결점

### 6.1 이미 정렬된 결정

본 설계는 이 논문 이전에 이미 **`CLAUDE.md` 자동 생성 제거 + SessionStart hook 주입**으로 방향 전환 완료 (`02-architecture.md §6`, `05-project-structure.md §6.1`). 본 논문은 이 결정에 **외부 실증 근거**를 제공:

| 본 설계 | 논문 결론 |
|---|---|
| `/harness:init` 이 CLAUDE.md 자동 생성 안 함 | LLMCtx −3% 성능, +23% 비용 |
| `CLAUDE.md` 는 유저 소유 (optional) | "developer-written helps marginally, keep minimal" |
| SessionStart hook 으로 스킬 카탈로그 주입 | "파일 기반 진입점 가설 기각" 과 일치 |
| `examples/CLAUDE.md.example` 복사 안내만 | "only minimal repo-specific requirements" |

### 6.2 본 설계가 배울 지점

1. **`CLAUDE.md.example` 최소화 원칙** — 현재 템플릿에 README 중복 가능성 점검 필요
2. **Trace 기반 평가** — 본 설계의 `audit.jsonl` 14 이벤트 + `tool_frequency` 텔레메트리로 확장 가능
3. **"Context cost budget"** — SessionStart hook 주입량 자체도 논문 경고 대상 (redundancy risk)
4. **벤치마크 형식** — AGENTbench 의 trace cluster 분류(10종)를 본 설계의 scripts/qa 감사에 차용 가능

### 6.3 본 설계가 이미 앞선 지점

- 논문은 **행동 지표(trace)** 의 필요성을 주창 — 본 설계의 `audit.jsonl` 이 이미 14개 결정론적 이벤트로 체계화
- 논문은 "minimal" 을 권고 — 본 설계는 `SessionStart` hook 의 주입량을 **토큰 예산표**로 명시 (`02-architecture.md §8.3`)

---

## 7. 인용할 가치가 있는 문장

> *"Every bit of context you add is a bet that the model benefits more from information than it loses from distraction."*
> — (저자의 요지 재구성)

> *"The gap between vendor recommendations and empirical results represents a concrete opportunity to improve agent system design through evidence-based practices rather than intuition."*

---

## 참고

- 벤치마크 코드/데이터: (논문 부록 참조 — AGENTbench)
- 반복 실험 환경: Claude Code, Codex, Qwen Code 표준 설정
- 본 프로젝트 관련 설계 문서:
  - `packages/harness/dev/design/02-architecture.md §6` (SessionStart hook 주입 정책)
  - `packages/harness/dev/design/05-project-structure.md §3, §6.1` (CLAUDE.md 유저 소유 원칙)
  - `packages/harness/dev/design/06-cli-reference.md` `session-start-context.mjs`
