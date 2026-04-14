# Prompting Best Practices — Claude 4.6 프롬프트 엔지니어링

---

Claude 4.6 모델 기준 종합 프롬프트 가이드. 기초 기법 → 출력 제어 → 도구 → 사고 → 에이전틱 시스템.

---

## 1. 일반 원칙

### 명확하고 직접적으로

- Claude = "맥락 없는 신입 천재". 구체적으로 설명할수록 결과 향상
- "above and beyond" 원하면 **명시적으로 요청**
- 황금 규칙: 맥락 없는 동료에게 프롬프트를 보여주고 혼란스러우면 Claude도 혼란

### 동기/맥락 제공

```
# 비효과적
NEVER use ellipses

# 효과적
Your response will be read aloud by TTS, so never use ellipses since TTS can't pronounce them.
```

Claude가 이유를 알면 **일반화**할 수 있음.

### 예시(Few-shot) 활용

- 3-5개 권장. `<example>` / `<examples>` 태그로 감싸기
- 관련성, 다양성(엣지 케이스), 구조 유지

### XML 태그 구조화

`<instructions>`, `<context>`, `<input>` 등으로 혼합 콘텐츠 분리 → 오해석 방지.

### 역할 부여

시스템 프롬프트에 한 문장만으로도 효과:
```python
system="You are a helpful coding assistant specializing in Python."
```

### Long context (20K+ 토큰)

- **긴 데이터를 상단에** 배치 (쿼리/지시문/예시 아래)
- 쿼리를 끝에 두면 응답 품질 **최대 30% 향상**
- 다중 문서: `<documents>` > `<document index="n">` > `<source>` + `<document_content>`
- 인용 유도: "관련 부분을 먼저 인용한 후 작업 수행"

---

## 2. 출력 & 포맷

### Claude 4.6 스타일 변화

이전 모델 대비: **더 간결, 더 직접적, 덜 장황**. 도구 사용 후 요약을 생략하고 다음 행동으로 직행할 수 있음.

요약 원하면: `"After completing a task with tool use, provide a quick summary."`

### 포맷 제어 4가지

1. **하지 말라 → 대신 하라**: "markdown 쓰지 마" → "flowing prose paragraphs로 작성하라"
2. **XML 출력 태그**: `<smoothly_flowing_prose_paragraphs>` 태그 안에 작성 유도
3. **프롬프트 스타일 = 출력 스타일**: 프롬프트에서 markdown을 빼면 출력에서도 감소
4. **상세 포맷 지시**: 명시적 산문 우선 가이드

### LaTeX 기본값

Opus 4.6는 수학 표현에 LaTeX 기본. 원치 않으면 plain text 명시.

### Prefill 제거 대안

| 기존 prefill 용도 | 대안 |
|-------------------|------|
| 출력 형식 강제 (JSON/YAML) | **Structured outputs**, 직접 지시 |
| 서문 제거 | 시스템 프롬프트: "Respond directly without preamble" |
| 불필요한 거부 회피 | Claude 4.6에서 개선됨. 명확한 프롬프팅으로 충분 |
| 이어쓰기 | user 메시지에 이전 응답 끝부분 포함 |
| 컨텍스트 주입 | user 턴에 삽입, 또는 도구/compaction 활용 |

---

## 3. 도구 사용

### 행동 지시 = 명시적으로

```
# 제안만 함
Can you suggest some changes?

# 직접 실행
Change this function to improve its performance.
```

시스템 프롬프트에 `<default_to_action>` 블록으로 기본 행동 모드 설정 가능.

### 과다 트리거 주의

Opus 4.5/4.6는 시스템 프롬프트에 더 민감. 이전 "CRITICAL: You MUST use this tool" → "Use this tool when..."으로 완화.

### 병렬 도구 호출

기본적으로 잘하지만, `<use_parallel_tool_calls>` 블록으로 ~100% 달성 가능.
의존성 있는 호출은 순차 실행 명시.

---

## 4. 사고 (Thinking)

### Adaptive thinking (권장)

```python
thinking={"type": "adaptive"},
output_config={"effort": "high"},  # or max, medium, low
```

- 쿼리 복잡도 + effort에 따라 **동적 사고**
- Interleaved thinking 자동 활성화
- `budget_tokens` deprecated → effort로 대체

### 과도한 사고 제어

Opus 4.6는 이전 모델보다 **탐색을 많이** 함. 제어:
- 타겟 지시로 대체: "Default to using [tool]" → "Use [tool] when it would enhance understanding"
- effort 낮추기
- "Choose an approach and commit to it. Avoid revisiting decisions."

### 사고 프롬프트 팁

- 일반 지시 > 처방적 단계 ("think thoroughly" > 수작업 step-by-step)
- Few-shot에 `<thinking>` 태그 포함 가능
- "Before you finish, verify your answer against [test criteria]" → 자기 검증

---

## 5. 에이전틱 시스템

### 컨텍스트 인식 & 다중 윈도우

Claude 4.6/4.5는 남은 컨텍스트 윈도우 크기를 추적. 하네스에서 compact/저장 가능하면 프롬프트에 명시:

```
Your context window will be automatically compacted. Do not stop tasks early due to token budget concerns.
Save progress to memory before context refresh. Never artificially stop any task early.
```

### 다중 컨텍스트 윈도우 워크플로

1. **첫 윈도우 = 프레임워크 설정** (테스트, 셋업 스크립트). 이후 윈도우 = todo-list 반복
2. **구조화된 테스트 파일** (`tests.json`) — 테스트 제거/수정 금지 강조
3. **QoL 도구** (`init.sh`) — 서버, 테스트, 린터 자동 시작
4. **Fresh start > compaction**: 파일시스템에서 상태 재발견이 compaction보다 나을 수 있음
5. **검증 도구** 제공 (Playwright, computer use)

### 자율성 vs 안전성 균형

Opus 4.6는 파일 삭제, force-push 같은 비가역 행동을 할 수 있음. 확인 요청 프롬프트:
```
Consider reversibility and impact. Take local, reversible actions freely.
For hard-to-reverse or shared-system actions, ask before proceeding.
```

### 서브에이전트 오케스트레이션

Opus 4.6는 서브에이전트를 **자동으로** 생성/위임. 과다 사용 시:
```
Use subagents for parallel tasks, isolated context, independent workstreams.
For simple tasks, single-file edits, work directly.
```

### 할루시네이션 최소화

```xml
<investigate_before_answering>
Never speculate about code you have not opened.
Read relevant files BEFORE answering questions about the codebase.
</investigate_before_answering>
```

### 과잉 엔지니어링 방지

```
Avoid over-engineering. Only make changes directly requested.
Don't add features, refactor, or add abstractions beyond what was asked.
```

---

## 6. Sonnet 4.5 → 4.6 마이그레이션 요약

| 설정 | 권장 |
|------|------|
| 대부분 앱 | effort `medium` |
| 고볼륨/레이턴시 민감 | effort `low` |
| 최대 출력 여유 | `max_tokens=64000` |
| thinking 미사용 → 계속 미사용 | `thinking: disabled`, effort `low` |
| thinking 사용 → adaptive | `thinking: adaptive`, effort `high` |

> [insight] 이 문서는 하네스 시스템 프롬프트 설계의 **레시피북**이다. `<default_to_action>`, `<use_parallel_tool_calls>`, `<investigate_before_answering>`, `<avoid_excessive_markdown>` 같은 XML 블록들이 Claude Code의 시스템 프롬프트에 실제로 사용되는 패턴과 정확히 일치한다.

> [insight] "Fresh start > compaction" 패턴이 흥미롭다. Claude 4.6가 파일시스템에서 상태를 재발견하는 능력이 뛰어나서, compaction보다 새 컨텍스트에서 `pwd`, `progress.txt`, `git log` 읽기로 시작하는 것이 더 나을 수 있다. 하네스에서 컨텍스트 갱신 전략의 대안.

> [insight] Opus 4.6는 서브에이전트를 **과다 생성**하는 경향이 있다. 단순 grep으로 충분한 상황에서도 서브에이전트를 스폰. 하네스에서 서브에이전트 사용 가이드라인을 시스템 프롬프트에 포함해야 비용/시간 낭비 방지.

> [insight] tool_result 후 Claude가 요약 없이 다음 행동으로 직행하는 것이 4.6의 기본 동작이다. 사용자에게 진행 상황을 보여주려면 "provide a quick summary after tool use" 명시 필요.
