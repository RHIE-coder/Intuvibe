# Superpowers - Testing Strategy

> Step 6: `tests/`, `testing-skills-with-subagents.md`, `persuasion-principles.md` 분석

---

## 1. 테스트 구조 개요

```
tests/
├── skill-triggering/          # 스킬이 자연어 프롬프트로 자동 트리거되는지
│   ├── run-test.sh
│   ├── run-all.sh
│   └── prompts/               # 6개 스킬별 자연어 테스트 프롬프트
│       ├── systematic-debugging.txt
│       ├── test-driven-development.txt
│       ├── writing-plans.txt
│       ├── dispatching-parallel-agents.txt
│       ├── executing-plans.txt
│       └── requesting-code-review.txt
│
├── explicit-skill-requests/   # 유저가 스킬을 명시적으로 요청할 때 트리거되는지
│   ├── run-test.sh
│   ├── run-multiturn-test.sh  # 다중 턴 대화에서의 트리거 테스트
│   ├── run-all.sh
│   └── prompts/               # 9개 시나리오
│       ├── subagent-driven-development-please.txt
│       ├── please-use-brainstorming.txt
│       ├── use-systematic-debugging.txt
│       ├── action-oriented.txt
│       ├── after-planning-flow.txt
│       ├── claude-suggested-it.txt
│       ├── i-know-what-sdd-means.txt
│       ├── mid-conversation-execute-plan.txt
│       └── skip-formalities.txt
│
├── claude-code/               # 통합 테스트
│   ├── test-helpers.sh        # 공유 테스트 유틸리티
│   ├── test-subagent-driven-development.sh        # 스킬 지식 테스트 (9항목)
│   ├── test-subagent-driven-development-integration.sh  # 실제 구현 통합 테스트
│   ├── analyze-token-usage.py  # 토큰 사용량 분석
│   └── run-skill-tests.sh
│
├── brainstorm-server/         # brainstorming 시각화 서버 테스트
├── subagent-driven-dev/       # SDD 실제 프로젝트 테스트 (Go, Svelte)
└── opencode/                  # OpenCode 플러그인 테스트
```

---

## 2. 테스트 유형

### Type A: Skill Triggering Tests (자동 트리거)

**목적**: 유저가 스킬 이름을 언급하지 않아도, 자연어 프롬프트만으로 올바른 스킬이 트리거되는지 검증.

**실행 방법:**
```bash
./run-test.sh <skill-name> <prompt-file> [max-turns]
```

**동작 원리:**
1. 프롬프트 파일을 `claude -p`에 headless 모드로 전달
2. `--plugin-dir`로 superpowers 플러그인 로드
3. `--dangerously-skip-permissions` + `--max-turns 3`
4. `--output-format stream-json`으로 세션 트랜스크립트 캡처
5. JSON에서 `"name":"Skill"` + 해당 스킬명 존재 여부 확인

**테스트 프롬프트 예시:**

| 스킬 | 프롬프트 | 트리거 포인트 |
|------|---------|--------------|
| `test-driven-development` | "I need to add a new feature to validate email addresses..." | 구현 요청 |
| `systematic-debugging` | "The tests are failing with this error: TypeError..." | 디버깅 요청 |
| `writing-plans` | "Here's the spec for our new authentication system..." | 다중 스텝 구현 |
| `dispatching-parallel-agents` | "I have 4 independent test failures..." | 독립적 다중 실패 |
| `executing-plans` | "I have a plan document...that needs to be executed" | 계획 실행 요청 |
| `requesting-code-review` | "I just finished implementing...Can you review?" | 리뷰 요청 |

**판정 기준:**
- `✅ PASS`: stream-json에서 해당 스킬의 Skill tool invocation 발견
- `❌ FAIL`: 발견 안 됨

### Type B: Explicit Skill Request Tests (명시적 요청)

**목적**: 유저가 스킬을 명시적으로 요청할 때 (다양한 표현 방식으로) 올바르게 트리거되는지 검증.

**추가 검증 — 조기 행동 감지:**
```bash
# Skill tool invocation 전에 다른 tool이 호출되었는지 확인
PREMATURE_TOOLS=$(head -n "$FIRST_SKILL_LINE" "$LOG_FILE" | \
    grep '"type":"tool_use"' | \
    grep -v '"name":"Skill"' | \
    grep -v '"name":"TodoWrite"')
```

스킬 로드 **전에** 다른 tool을 사용하면 경고 — "Claude started working before loading the requested skill."

**테스트 프롬프트 시나리오:**

| 파일 | 시나리오 | 핵심 |
|------|---------|------|
| `subagent-driven-development-please.txt` | 단순 요청 | "subagent-driven-development, please" |
| `please-use-brainstorming.txt` | 정중한 요청 | "please use the brainstorming skill" |
| `use-systematic-debugging.txt` | 직접 지시 | "use systematic-debugging to figure out" |
| `action-oriented.txt` | 행동 지향 | "Do subagent-driven development on this" |
| `after-planning-flow.txt` | 계획 흐름 후 | 계획 완료 후 실행 선택 |
| `claude-suggested-it.txt` | Claude가 제안 후 유저 수락 | 이전 assistant 메시지의 옵션 선택 |
| `i-know-what-sdd-means.txt` | 설명 포함 요청 | 유저가 SDD를 이미 이해함을 표현 |
| `mid-conversation-execute-plan.txt` | 대화 중간 요청 | 맥락 전환 |
| `skip-formalities.txt` | 즉시 시작 요청 | "Don't waste time - just start" |

**Multi-turn Test** (`run-multiturn-test.sh`):
```
Turn 1: 계획 대화 시작 (planning)
Turn 2: 계획 완료, 실행 옵션 질문
Turn 3: "subagent-driven-development, please" ← 핵심 테스트
```

대화가 길어졌을 때도 스킬이 정확히 트리거되는지 검증.

### Type C: Integration Tests (통합 테스트)

**목적**: 스킬이 실제 프로젝트에서 올바른 동작(파일 생성, 테스트 통과, 커밋)을 수행하는지 검증.

**`test-subagent-driven-development.sh`** — 스킬 지식 테스트 (9항목):

| # | 테스트 | 검증 내용 |
|---|--------|-----------|
| 1 | Skill loading | 스킬이 인식됨 |
| 2 | Workflow ordering | spec compliance → code quality 순서 |
| 3 | Self-review | implementer 셀프리뷰 요구사항 |
| 4 | Plan reading efficiency | 계획을 1회만 읽는지 |
| 5 | Spec reviewer mindset | 불신 기반 리뷰 태도 |
| 6 | Review loops | 리뷰 루프 요구사항 |
| 7 | Task context provision | 태스크 텍스트 직접 제공 (파일 읽기 아닌) |
| 8 | Worktree requirement | git worktree 전제조건 |
| 9 | Main branch warning | main 브랜치 직접 구현 경고 |

**통합 테스트** (`test-subagent-driven-development-integration.sh`):
- 실제 Node.js 프로젝트 생성
- 계획 작성 → subagent-driven-development로 실행
- 10-30분 소요
- 검증: 스킬 호출, 서브에이전트 디스패치, TodoWrite 사용, 파일 생성, 테스트 통과, 커밋 히스토리

**토큰 분석** (`analyze-token-usage.py`):
- 세션 트랜스크립트(`.jsonl`) 파싱
- 메인 세션 + 서브에이전트별 토큰 사용량 분석
- 비용 추정 ($3/$15 per M tokens)

---

## 3. Test Helpers

```bash
run_claude "prompt" [timeout] [allowed_tools]   # Claude headless 실행
assert_contains "output" "pattern" "test name"   # 패턴 존재 확인
assert_not_contains "output" "pattern" "test"    # 패턴 부재 확인
assert_count "output" "pattern" expected "test"  # 패턴 횟수 확인
assert_order "output" "pattern_a" "pattern_b"    # 순서 확인
create_test_project                              # 임시 프로젝트 생성
cleanup_test_project "$dir"                      # 정리
create_test_plan "$dir" "plan-name"              # 테스트용 계획 생성
```

---

## 4. 스킬 테스트 방법론 (testing-skills-with-subagents.md)

### 핵심: "스킬 테스트 = 프로세스 문서에 대한 TDD"

```
RED:    스킬 없이 서브에이전트 실행 → 실패 관찰, 합리화 기록
GREEN:  스킬 작성 → 동일 시나리오 재실행 → 준수 확인
REFACTOR: 새로운 합리화 발견 → 차단 → 재검증 (루프)
```

### Pressure Scenario 설계

**나쁜 시나리오** (압력 없음):
```
"You need to implement a feature. What does the skill say?"
→ 학술적. 에이전트가 스킬을 단순 암송.
```

**좋은 시나리오** (단일 압력):
```
"Production is down. $10k/min lost. 5 minutes until deploy window."
→ 시간 압력 + 권위 + 결과.
```

**최고의 시나리오** (3+ 압력 조합):
```
"You spent 3 hours, 200 lines, manually tested. 6pm, dinner 6:30pm.
Just realized you forgot TDD. Choose A, B, or C."
→ 매몰비용 + 시간 + 피로 + 결과. 명시적 선택 강제.
```

### 7가지 Pressure Types

| Pressure | 예시 |
|----------|------|
| **Time** | 긴급, 데드라인, 배포 창 마감 |
| **Sunk cost** | 수시간 작업, "낭비" |
| **Authority** | 시니어가 스킵하라고 |
| **Economic** | 직장, 승진, 회사 생존 |
| **Exhaustion** | 하루 끝, 피곤, 퇴근하고 싶음 |
| **Social** | 독단적으로 보임, 경직되어 보임 |
| **Pragmatic** | "독단 vs 실용" |

**최적 테스트 = 3개 이상 압력 조합.**

### Good Scenario 요소

1. **구체적 옵션** — A/B/C 선택 강제 (개방형 아닌)
2. **실제 제약** — 구체적 시간, 실제 결과
3. **실제 경로** — `/tmp/payment-system` (추상적이지 않게)
4. **행동 강제** — "What do you do?" (not "What should you do?")
5. **쉬운 탈출 없음** — "I'd ask your human partner" 불가

### Meta-Testing

GREEN이 작동하지 않을 때:
```
"You read the skill and chose Option C anyway.
How could that skill have been written differently?"
```

3가지 응답 유형:
1. **"스킬은 명확했다, 무시했다"** → 더 강한 기초 원칙 필요 ("문자 위반 = 정신 위반")
2. **"스킬에 X가 있었어야"** → 문서 문제 → 제안을 그대로 추가
3. **"Y 섹션을 못 봤다"** → 구조 문제 → 핵심 포인트를 더 눈에 띄게

### Bulletproof 징후

- 에이전트가 최대 압력 하에서 올바른 옵션 선택
- 스킬 섹션을 인용하여 정당화
- 유혹을 인정하지만 규칙을 따름
- Meta-test에서 "스킬이 명확했다, 따라야 했다" 응답

---

## 5. Persuasion Principles — 스킬 설계 심리학

> Meincke et al. (2025): N=28,000 AI 대화에서 설득 기법이 compliance를 33% → 72%로 향상 (p < .001)

### 스킬에 적용되는 7가지 원칙

| 원칙 | 스킬 적용 | 예시 |
|------|-----------|------|
| **Authority** | 명령형 언어 ("YOU MUST", "Never", "No exceptions") | 결정 피로와 합리화 제거 |
| **Commitment** | 공표 강제 ("I'm using [Skill Name]"), 체크리스트 추적 | TodoWrite로 책임 |
| **Scarcity** | 시간 제한 ("Before proceeding", "IMMEDIATELY after") | "나중에" 방지 |
| **Social Proof** | 보편적 패턴 ("Every time", "Always"), 실패 모드 | 표준 확립 |

### 실전 예시

```markdown
# BAD (Authority 없음)
Consider writing tests first when feasible.

# GOOD (Authority 적용)
Write code before test? Delete it. Start over. No exceptions.
```

```markdown
# BAD (Commitment 없음)  
Consider letting your partner know which skill you're using.

# GOOD (Commitment 적용)
When you find a skill, you MUST announce: "I'm using [Skill Name]"
```

---

## 6. 토큰 분석 결과 (실제 SDD 테스트)

```
Agent           Msgs    Input    Output     Cache      Cost
main (coord)      34       27     3,996  1,213,703   $4.09
implementer-1      1        2       787     24,989   $0.09
implementer-2      1        4       644     25,114   $0.09
spec-reviewer-1    1        5       703     25,742   $0.09
spec-reviewer-2    1        6       416     22,485   $0.07
quality-rev-1      1        6       515     22,534   $0.08
quality-rev-2      1        6       504     22,949   $0.08
final-reviewer     1        6       854     25,319   $0.09

TOTAL: 1,524,058 tokens / $4.67
```

**핵심 관찰:**
- Controller가 전체 비용의 ~88% 차지 (컨텍스트 유지 비용)
- 서브에이전트당 $0.07-$0.09 (매우 저렴)
- Cache read가 대부분 (1,382,835 / 1,515,639 = 91%)
- 5태스크 + 7서브에이전트로 전체 $4.67

---

## 7. 하네스 설계 시사점

| 관찰 | 시사점 |
|------|--------|
| **3가지 테스트 유형 분리** | 트리거 테스트(발견) + 요청 테스트(이해) + 통합 테스트(동작) = 완전한 검증 |
| **Headless + stream-json** | `claude -p` + JSON 트랜스크립트 파싱 = 자동화 가능한 테스트 |
| **Premature action 감지** | 스킬 로드 전 다른 tool 사용 여부 확인 → 스킬 준수 검증 |
| **Multi-turn 테스트** | 대화가 길어져도 스킬이 트리거되는지 검증 필요 |
| **Pressure scenario 방법론** | 3+ 압력 조합 + 명시적 선택 강제 = 합리화 방어 테스트 |
| **Meta-testing** | 실패 원인을 에이전트에게 질문 → 스킬 개선 방향 도출 |
| **Persuasion principles** | LLM도 인간과 같은 설득 원칙에 반응 → 스킬 설계에 활용 |
| **Token 분석** | Controller 비용 >> 서브에이전트 비용. Cache가 91%. 비용 예측 가능. |
| **assert_order 패턴** | 워크플로우 순서 검증 → 스킬이 올바른 순서를 가르치는지 확인 |

---

**다음 단계**: Step 7 — 종합 정리 → `08-takeaways.md` (하네스 설계에 가져갈 패턴 추출)
