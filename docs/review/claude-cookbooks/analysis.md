# Claude Cookbooks 연구 분석

---

하네스 엔지니어링 관점에서 anthropics/claude-cookbooks의 핵심 패턴, 아키텍처, 기법을 분석한다.
CLI 기반 하네스 설계에 직접 활용 가능한 인사이트에 집중.

---

## 1. 에이전트 워크플로우 패턴 (5종)

`patterns/agents/` — 모든 패턴의 기본 인프라는 `llm_call()` + `extract_xml()` 두 함수뿐.

### 1.1 Chain (Prompt Chaining)

순차 파이프라인. 스텝 N의 출력이 스텝 N+1의 입력.

```python
def chain(input, prompts):
    result = input
    for prompt in prompts:
        result = llm_call(f"{prompt}\nInput: {result}")
    return result
```

용도: 데이터 추출 → 변환 → 정렬 → 포맷 같은 단계적 정제.

### 1.2 Parallel (Fan-out)

같은 프롬프트를 여러 입력에 동시 적용.

```python
def parallel(prompt, inputs, n_workers=3):
    with ThreadPoolExecutor(max_workers=n_workers) as executor:
        futures = [executor.submit(llm_call, f"{prompt}\nInput: {x}") for x in inputs]
        return [f.result() for f in futures]
```

용도: 이해관계자별 영향 분석, 다중 관점 평가.

### 1.3 Router (Classifier + Specialist)

LLM이 입력을 분류 → 전문화된 프롬프트로 라우팅. 2회 호출.

```python
def route(input, routes):
    route_key = extract_xml(llm_call(selector_prompt), "selection")
    return llm_call(f"{routes[route_key]}\nInput: {input}")
```

분류에 XML chain-of-thought 사용 (`<reasoning>` + `<selection>`).

### 1.4 Evaluator-Optimizer (Generate-Evaluate Loop)

생성기 + 평가기 반복. 모든 이전 시도를 메모리로 축적.

```python
def loop(task, evaluator_prompt, generator_prompt):
    memory = []
    thoughts, result = generate(generator_prompt, task)
    memory.append(result)
    while True:
        evaluation, feedback = evaluate(evaluator_prompt, result, task)
        if evaluation == "PASS": return result
        context = "\n".join(["Previous attempts:", *[f"- {m}" for m in memory], f"\nFeedback: {feedback}"])
        thoughts, result = generate(generator_prompt, task, context)
        memory.append(result)
```

핵심: 3상태 평가 (PASS / NEEDS_IMPROVEMENT / FAIL), 누적 메모리.

### 1.5 Orchestrator-Workers (Dynamic Fan-out)

오케스트레이터가 런타임에 서브태스크를 동적 결정 → 워커에 위임.

```python
class FlexibleOrchestrator:
    def process(self, task, context=None):
        # Phase 1: 분석 + 계획 (XML로 태스크 구조화)
        tasks = parse_tasks(extract_xml(llm_call(orchestrator_prompt), "tasks"))
        # Phase 2: 워커 실행
        for task_info in tasks:
            result = llm_call(worker_prompt.format(task_type=task_info["type"], ...))
```

권장 최적화: Opus로 오케스트레이터, Haiku로 워커 (비용 최적화).

### 패턴 비교 요약

| 패턴 | 토폴로지 | LLM 호출 | 트레이드오프 |
|------|----------|----------|-------------|
| Chain | 순차 | N | 지연 ↔ 품질 (분해) |
| Parallel | 팬아웃 | N (동시) | 비용 ↔ 폭 |
| Router | 분류+전문 | 2 | 1회 추가 ↔ 전문화 |
| Evaluator-Optimizer | 생성-평가 루프 | 2+/반복 | 비용/지연 ↔ 반복 개선 |
| Orchestrator-Workers | 동적 팬아웃 | 1+N | 유연성 ↔ 예측 가능성 |

> [insight] 5가지 패턴의 공통 인프라가 `llm_call()` + `extract_xml()` 두 함수뿐이라는 점은 하네스 설계에서 핵심이다. 하네스의 워크플로우 엔진도 이 두 프리미티브(LLM 호출 래퍼 + 구조화 출력 파서)만으로 모든 패턴을 조합할 수 있어야 한다. XML 태그 기반 구조화가 JSON보다 LLM 친화적 — `<reasoning>`, `<selection>`, `<evaluation>`, `<feedback>` 태그가 일관되게 사용됨.

> [insight] Evaluator-Optimizer의 "모든 이전 시도 누적" 패턴은 하네스의 자체 평가 프레임워크에서 직접 활용 가능. 플러그인/스킬 출력을 평가하고 피드백을 축적해 반복 개선하는 품질 루프를 Hooks(PostToolUse)로 구현할 수 있다. 단, 프로덕션에서는 max iteration cap이 필수.

---

## 2. 컨텍스트 엔지니어링 (3종 프리미티브)

`tool_use/context_engineering/` — 가장 포괄적인 컨텍스트 관리 문서.

### 2.1 세 가지 프리미티브

| 프리미티브 | API 타입 | 트리거 | 무엇을 교환 |
|-----------|---------|--------|------------|
| **Compaction** | `compact_20260112` | 토큰 임계값 (최소 50K) | 상세 → 요약 |
| **Tool Clearing** | `clear_tool_uses_20250919` | 토큰 임계값 | 오래된 도구 결과 제거 |
| **Memory** | `memory_20250818` | 모델 주도 도구 호출 | 도구 호출 오버헤드 |

### 2.2 Compaction 설정

```python
context_management={"edits": [{
    "type": "compact_20260112",
    "trigger": {"type": "input_tokens", "value": 180_000},
    "instructions": "커스텀 요약 프롬프트...",  # 기본 프롬프트 완전 대체
}]}
```

`instructions`는 기본 프롬프트를 **완전 대체**. 기본은 `<summary></summary>` 태그 요청.

### 2.3 Tool Clearing 설정

```python
context_management={"edits": [{
    "type": "clear_tool_uses_20250919",
    "trigger": {"type": "input_tokens", "value": 30_000},
    "keep": {"type": "tool_uses", "value": 4},      # 최근 4개 유지
    "clear_at_least": {"type": "input_tokens", "value": 10_000},  # 최소 10K 토큰 제거
}]}
```

추론 비용 제로. 단, 캐시된 프롬프트 프리픽스를 무효화하므로 `clear_at_least` 튜닝 필요.

### 2.4 Memory 도구 (파일 기반)

6개 명령: view, create, str_replace, insert, delete, rename.
경로 탐색 가드(`_resolve()`). 시스템 프롬프트에 "항상 메모리 디렉토리를 먼저 확인" 프로토콜 주입.

### 2.5 3종 조합 시 핵심 규칙

```python
context_management={"edits": [
    {"type": "clear_tool_uses_20250919", ..., "exclude_tools": ["memory"]},  # 메모리 읽기/쓰기 보존
    {"type": "compact_20260112", ...},
]}
```

**`exclude_tools: ["memory"]`** — clearing이 메모리 도구 결과를 제거하지 않도록 반드시 설정.

### 2.6 의사결정 프레임워크

| 상황 | 권장 |
|------|------|
| 수일/수주 걸친 세션 | Memory |
| 재조회 가능한 큰 도구 결과 | Clearing |
| 대화가 주요 컨텍스트 | Compaction |
| 재조회 불가능한 도구 결과 | Compaction (clearing 아닌) |
| 매 세션 새로 시작 | Memory 건너뛰기 |
| 윈도우 이내 세션 | Compaction 건너뛰기 |

### 2.7 즉시 컴팩션 (Instant Compaction)

`misc/session_memory_compaction.ipynb` — 사용자 대기 시간 제거.

| 전략 | 방식 | 대기 시간 |
|------|------|----------|
| 전통적 | 한계 도달 시 요약 생성 | 40+초 |
| 즉시 | 소프트 임계값에서 백그라운드 스레드로 선제 요약 | 0초 (즉시 교체) |

**세션 메모리 프롬프트 구조:**

```
## User Intent — 원래 요청 + 정제사항
## Completed Work — 수행된 작업, 정확한 식별자
## Errors & Corrections — 사용자 수정 원문
## Active Work — 작업 중단 지점, 부분 결과
## Pending Tasks — 명시 요청 vs 암시
## Key References — ID, 경로, URL, 값, 컨텍스트
```

**압축 우선순위:** 사용자 수정 > 오류 > 진행 중 작업 > 완료 작업.

**프롬프트 캐싱 최적화:** 백그라운드 요약기가 메인 대화와 프리픽스 캐시를 공유 → ~80% 비용 절감.

> [insight] 즉시 컴팩션의 "소프트 임계값에서 백그라운드 선제 요약" 패턴은 하네스의 컨텍스트 관리 전략에서 가장 직접적으로 활용 가능하다. CLI 기반 하네스에서 Hook(PostToolUse)으로 토큰 사용량을 모니터링하고, 임계값 도달 시 `/compact`를 자동 트리거하는 방어적 전략으로 구현할 수 있다. 세션 메모리 프롬프트의 6단계 구조는 하네스의 `Summarize from here` 커스텀 지시문 템플릿으로 채택하기 좋다.

> [insight] `exclude_tools: ["memory"]` 규칙은 하네스에서 CLAUDE.md 자동 메모리와 Tool Clearing을 동시에 사용할 때의 핵심 방어 패턴이다. 메모리 도구의 읽기/쓰기가 clearing으로 소실되면 에이전트가 이미 학습한 패턴을 반복 조회하게 되어 비용이 급증한다.

---

## 3. Agent SDK 패턴 (CLI 하네스 관점)

현재 하네스는 CLI 기반이므로 SDK 패턴은 참고용. 단, `.claude/` 파일시스템 구조는 동일하게 공유.

### 3.1 `.claude/` 디렉토리 = 설정 표면

Chief of Staff Agent 쿡북(A-05)이 보여주는 7가지 기능:

| 기능 | 위치 | SDK 로드 조건 |
|------|------|-------------|
| CLAUDE.md | `{cwd}/CLAUDE.md` | `cwd` 지정 |
| Settings | `.claude/settings.json` | `setting_sources=["project"]` |
| Local Settings | `.claude/settings.local.json` | `setting_sources=["local"]` |
| Output Styles | `.claude/output-styles/*.md` | settings의 `outputStyle` |
| Slash Commands | `.claude/commands/*.md` | `setting_sources=["project"]` |
| Hooks | `.claude/settings.local.json` 내 hooks | `setting_sources=["local"]` |
| Subagents | `.claude/agents/*.md` | `setting_sources=["project"]` |

**핵심**: `setting_sources` 파라미터가 어떤 설정 레이어를 로드할지 제어. CLI에서는 자동 로드되지만 SDK에서는 명시 필요.

### 3.2 Plan Mode 출력 추출 패턴

SDK에서 Plan Mode 결과를 추출할 때 다중 소스 폴백:

1. 메시지 스트림 (XML 태그)
2. Write 도구 캡처
3. `~/.claude/plans/` 디렉토리
4. Raw 컨텐츠 폴백

검증: 최소 200자 이상이면 유효한 계획으로 판정.

### 3.3 Stateless vs Stateful

| 모드 | 인터페이스 | 메모리 | 용도 |
|------|----------|--------|------|
| Stateless | `query()` | 없음 | 단발 작업 |
| Stateful | `ClaudeSDKClient` + `receive_response()` | 대화 유지 | 멀티턴 |

> [insight] SDK의 `.claude/` 디렉토리 구조가 CLI와 완전히 동일하다는 점은 하네스의 "CLI에서 프로토타입 → SDK로 서비스화" 전환 경로를 뒷받침한다. 하네스의 Skills, Commands, Hooks, Subagents를 `.claude/` 파일시스템으로 설계하면 CLI↔SDK 간 이식성이 보장된다. `setting_sources` 파라미터 하나로 로드 범위를 제어하는 구조는 하네스의 환경별(개발/스테이징/프로덕션) 설정 격리에도 활용 가능.

---

## 4. Managed Agents API 패턴

클라우드 호스팅 에이전트 API. CLI 하네스와 직접 관계는 없지만 아키텍처 패턴은 참고할 만함.

### 4.1 3대 리소스

| 리소스 | 역할 | 수명 |
|--------|------|------|
| **Agent** | 재사용 가능한 설정 (모델, 시스템 프롬프트, 도구) | 영구 |
| **Environment** | 컨테이너 템플릿 (패키지, 네트워킹) | 영구 |
| **Session** | Agent + Environment 바인딩, 실행 단위 | 일회성 |

### 4.2 스트리밍 이벤트 패턴

```python
# 핵심: 스트림 열기 → 메시지 전송 (순서 중요)
with client.beta.sessions.events.stream(session.id) as stream:
    client.beta.sessions.events.send(session_id=session.id, events=[...])
    for ev in stream:
        match ev.type:
            case "session.status_idle" if ev.stop_reason.type == "end_turn": break
            case "session.status_idle" if ev.stop_reason.type == "requires_action":
                # 커스텀 도구 결과 전송
```

### 4.3 HITL (Human-in-the-Loop) 패턴

커스텀 도구가 세션을 일시 정지 → `requires_action` 상태 → 앱이 결과 전송 → 재개.

병렬 커스텀 도구 호출 시 `stop_reason.event_ids`가 슬라이딩 윈도우(5개)로 반환 → **중복 제거 set 필수**.

### 4.4 프롬프트 버전 관리

```python
# v1 생성
agent = client.beta.agents.create(...)
# v2 업데이트 (낙관적 동시성 제어)
agent = client.beta.agents.update(agent.id, version=agent.version, system=V2_PROMPT)
# 세션은 버전 고정 가능
session = client.beta.sessions.create(agent={"id": agent.id, "version": 1}, ...)
```

롤백 = 이전 버전 번호로 다시 고정. 배포 불필요.

### 4.5 실행 중 리소스 추가/제거

```python
client.beta.sessions.resources.add(session_id=session.id, type="file", file_id=..., mount_path="...")
client.beta.sessions.resources.delete(session_id=session.id, resource_id=...)
```

### 4.6 Vault + MCP

Vault = 사용자별 자격증명 컨테이너. MCP 서버 URL 매칭으로 자동 토큰 주입. 에이전트는 토큰을 절대 직접 보지 않음.

> [insight] Managed Agents의 "Agent/Environment/Session" 3자원 모델은 하네스의 플러그인 실행 모델과 구조적으로 대응한다. Agent≈Skill 정의, Environment≈실행 환경(worktree/sandbox), Session≈실행 인스턴스. 이 대응을 의식하면 향후 CLI→Managed Agents 전환 시 개념적 갭이 줄어든다.

> [insight] 프롬프트 버전 관리 + 세션 버전 고정 패턴은 하네스에서 CLAUDE.md나 Skill의 버전 관리로 차용할 수 있다. Git 브랜치 기반으로 CLAUDE.md를 버전 관리하고, 특정 커밋을 "프로덕션 버전"으로 고정하는 워크플로우가 Managed Agents의 `version` 파라미터와 동일한 효과를 준다.

---

## 5. 평가(Eval) 패턴

### 5.1 3종 그레이딩

| 방식 | 속도 | 정확도 | 용도 |
|------|------|--------|------|
| **코드 기반** | 최고 | 높음 (설계 가능 시) | exact match, contains, regex |
| **모델 기반** | 중간 | 중상 | `<correctness>correct/incorrect</correctness>` XML 추출 |
| **인간** | 최저 | 최고 | 골든 답변을 루브릭으로 사용 |

### 5.2 모델 기반 그레이딩 패턴

```python
def build_grader_prompt(answer, rubric):
    return f"""<answer>{answer}</answer>
<rubric>{rubric}</rubric>
Think in <thinking></thinking> tags.
Output 'correct' or 'incorrect' in <correctness></correctness> tags."""

match = re.search(r"<correctness>(.*?)</correctness>", completion, re.DOTALL)
```

### 5.3 Eval 설계 원칙

- Eval 분포 = 실제 사용 분포와 일치
- 높은 볼륨 + 낮은 품질 > 낮은 볼륨 + 높은 품질
- 객관식 변환으로 자동 그레이딩 가능하게 재구성
- `max_tokens=5`로 출력 제한 (숫자만 응답)

### 5.4 도구 평가 (Tool Evaluation)

`tool_evaluation/` — XML 기반 평가 정의 파일로 병렬 에이전트 도구 평가. 도구별 테스트 케이스를 독립 실행.

> [insight] 모델 기반 그레이딩의 `<correctness>` XML 추출 패턴은 하네스의 자체 평가 프레임워크에서 Evaluator-Optimizer 루프와 결합할 수 있다. Hook(PostToolUse)에서 에이전트 출력을 별도 모델(Haiku)로 평가하고, `<correctness>incorrect</correctness>` 시 피드백을 주입하는 품질 루프 구현이 가능하다.

---

## 6. Skills 시스템 심화

### 6.1 Progressive Disclosure 아키텍처

| 단계 | 로드 | 비용 |
|------|------|------|
| Stage 1: 메타데이터 | 항상 (이름, 설명) | ~10t |
| Stage 2: 지시사항 | 관련성 판단 시 | ~100-5000t |
| Stage 3: 리소스 | 실행 시 | 가변 |

### 6.2 커스텀 스킬 구조

```
custom_skills/my-skill/
├── SKILL.md          # 필수 (frontmatter + 지시사항)
├── scripts/          # 선택 (실행 가능 코드)
├── resources/        # 선택 (참조 데이터)
└── *.md              # 선택 (추가 문서)
```

SKILL.md 제한: name 64자 (소문자+하이픈), description 1024자, instructions 권장 5,000t 미만.

### 6.3 스킬 버전 관리 (API)

```python
client.beta.skills.versions.create(skill_id=skill.id, files=files_from_dir("path/to/skill"))
```

스킬도 Managed Agents의 Agent처럼 버전 관리 가능.

### 6.4 스킬 조합

```python
container={"skills": [
    {"type": "custom", "skill_id": custom_skill.id, "version": "latest"},
    {"type": "anthropic", "skill_id": "pptx", "version": "latest"},
]}
```

여러 스킬을 한 요청에 조합. 빌트인(xlsx, pptx, pdf, docx)과 커스텀 혼합 가능.

> [insight] Skills의 Progressive Disclosure 3단계는 하네스의 컨텍스트 비용 최적화의 핵심 메커니즘이다. 메타데이터(~10t)만으로 관련성을 판단하고, 필요할 때만 지시사항(~5000t)을 로드하는 패턴은 하네스에 다수의 스킬이 등록되어 있을 때 컨텍스트 폭발을 방지한다. `paths` 필드의 글로브 패턴과 결합하면 "이 파일 작업 시에만 이 스킬 로드"라는 정밀 제어가 가능하다.

---

## 7. 쿡북 레포 자체의 Claude Code 활용

레포의 `.claude/` 디렉토리 자체가 하네스 설계의 실전 예시.

### 7.1 디렉토리 구조

```
.claude/
├── agents/
│   └── code-reviewer.md          # 코드 리뷰 서브에이전트
├── commands/
│   ├── add-registry.md           # 레지스트리 등록
│   ├── link-review.md            # 링크 검증
│   ├── model-check.md            # 모델 명 확인
│   ├── notebook-review.md        # 노트북 품질 검사
│   ├── review-issue.md           # 이슈 리뷰
│   ├── review-pr.md              # PR 리뷰
│   └── review-pr-ci.md           # CI PR 리뷰
└── skills/
    └── cookbook-audit/
        ├── SKILL.md              # 감사 스킬 정의
        ├── style_guide.md        # 스타일 가이드
        └── validate_notebook.py  # 검증 스크립트
```

### 7.2 CLAUDE.md 규칙 (주요)

- 모델명은 비날짜 별칭 사용 (`claude-sonnet-4-6`, not versioned ID)
- `.env` 커밋 금지, `dotenv.load_dotenv()` 사용
- 100자 줄 길이, 더블 쿼트, Ruff 포매터
- Conventional commits (`feat(scope):`, `fix(scope):`)
- 커밋 전 `make check` 실행
- 노트북은 출력 유지 (데모 목적)

### 7.3 CI 워크플로우

| 워크플로우 | 용도 |
|-----------|------|
| `claude-pr-review.yml` | Claude 기반 PR 리뷰 |
| `claude-model-check.yml` | 모델명 규칙 검사 |
| `claude-link-review.yml` | 링크 유효성 검사 |
| `notebook-quality.yml` | 노트북 품질 검사 |
| `notebook-tests.yml` | 노트북 실행 테스트 |
| `verify-authors.yml` | 저자 정보 검증 |

> [insight] 쿡북 레포의 `.claude/` 구조는 하네스의 "프로젝트별 설정" 실전 예시로서 가장 가치 있다. 특히 `commands/` 7개가 PR 리뷰, 이슈 리뷰, 링크 검증 등 CI 파이프라인과 연동되는 패턴은 하네스에서 "개발 워크플로우 자동화"를 Slash Commands로 구현하는 직접적 레퍼런스다. `skills/cookbook-audit/`의 검증 스크립트 + 스타일 가이드 조합은 하네스의 품질 게이트 스킬 설계 템플릿으로 채택할 수 있다.

---

## 8. 크로스커팅 설계 원칙

쿡북 전체를 관통하는 하네스 설계 원칙:

### 8.1 컨텍스트는 유한 자원

모든 문서가 수렴하는 핵심. 3종 프리미티브(Compaction, Clearing, Memory)가 각각 다른 컨텍스트 성장 벡터를 타겟.

### 8.2 Progressive Disclosure / Lazy Loading

스킬은 단계별 로드, 서브에이전트 정의는 온디맨드, 도구 권한이 컨텍스트 진입을 제어.

### 8.3 파일시스템 = 설정 표면

`.claude/` 디렉토리 구조가 하네스의 전체 설정 인터페이스: settings, output-styles, commands, agents, hooks, skills.

### 8.4 다중 소스 폴백 추출

Plan Mode의 4단계 폴백(스트림 → Write 캡처 → 파일시스템 → raw) 패턴. 하나의 추출 경로에 의존하지 않음.

### 8.5 백그라운드 선제 처리

즉시 컴팩션의 "한계 전에 미리 준비" 패턴. 사용자 경험과 시스템 한계 사이의 버퍼.

### 8.6 XML 태그 = LLM 구조화 프로토콜

모든 패턴에서 XML 태그가 LLM 출력 구조화의 기본 프로토콜: `<reasoning>`, `<selection>`, `<evaluation>`, `<feedback>`, `<correctness>`, `<summary>`, `<tasks>`.

### 8.7 토큰 궤적 = 진단 도구

`context_engineering_tools`의 토큰 궤적 추적 패턴 — 컨텍스트 관리 파라미터 튜닝에 필수.

> [insight] 쿡북 전체에서 가장 하네스에 직접적인 가치를 제공하는 것은 (1) 5가지 워크플로우 패턴, (2) 3종 컨텍스트 프리미티브, (3) 즉시 컴팩션 패턴, (4) `.claude/` 실전 구조 이 네 가지다. SDK/Managed Agents 관련 쿡북은 현재 CLI 기반 하네스에서는 참고용이지만, `.claude/` 파일시스템 구조의 공유로 향후 전환 비용이 최소화된다.
