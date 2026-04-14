# Superpowers - Skill System

> Step 2: `skills/using-superpowers/SKILL.md` + `skills/writing-skills/SKILL.md` + platform references 분석

---

## 1. SKILL.md 포맷

### Frontmatter (YAML)

```yaml
---
name: skill-name-with-hyphens
description: Use when [triggering conditions and symptoms]
---
```

- **name**: 문자, 숫자, 하이픈만 허용 (특수문자/괄호 금지)
- **description**: 3인칭, "Use when..."으로 시작, **트리거 조건만 기술** (워크플로우 요약 금지)
- **전체 frontmatter**: 최대 1024자
- **스펙**: [agentskills.io/specification](https://agentskills.io/specification)

### Description 작성의 핵심 원칙

**Description = "언제 사용하는가"이지 "무엇을 하는가"가 아니다.**

```yaml
# BAD: 워크플로우 요약 → Claude가 스킬 본문을 읽지 않고 description만 따름
description: Use when executing plans - dispatches subagent per task with code review between tasks

# GOOD: 트리거 조건만 → Claude가 본문을 읽게 됨
description: Use when executing implementation plans with independent tasks in the current session
```

> 테스트 결과: description에 "code review between tasks"라고 요약하면 Claude가 리뷰를 1회만 수행.
> 트리거 조건만 쓰면 본문의 flowchart를 정확히 따라 2단계 리뷰를 수행함.

이것은 **CSO(Claude Search Optimization)** — Claude가 스킬을 발견하고 올바르게 사용하도록 최적화하는 기법.

### 본문 구조

```markdown
# Skill Name

## Overview
핵심 원칙 1-2 문장

## When to Use
증상, 유스케이스 (NOT 사용 시점에는 flowchart)
사용하지 말아야 할 때

## Core Pattern
Before/After 코드 비교

## Quick Reference
테이블 또는 bullet (스캔용)

## Implementation
간단한 패턴은 인라인 코드, 무거운 레퍼런스는 별도 파일 링크

## Common Mistakes
잘못되는 것 + 수정법
```

### 디렉토리 구조

```
skills/
  skill-name/
    SKILL.md              # 메인 레퍼런스 (필수)
    supporting-file.*     # 필요시에만
```

- **Flat namespace** — 모든 스킬이 하나의 검색 가능한 네임스페이스에 존재
- 별도 파일은 **100줄 이상 레퍼런스** 또는 **재사용 가능한 스크립트**일 때만
- 50줄 이하 코드 패턴은 인라인

---

## 2. 스킬 트리거 메커니즘

### `using-superpowers` — 시스템 진입점

이 스킬이 **모든 대화의 첫 번째로 로드**되며, 다른 모든 스킬의 활성화 규칙을 정의한다.

### 트리거 규칙

```
"1%라도 스킬이 적용될 가능성이 있으면 반드시 해당 스킬을 invoke해야 한다."
```

**흐름도:**
```
User message received
  → "스킬이 적용될 수 있는가?" (1%라도)
    → YES: Skill tool invoke → 스킬 내용 로드 → 따르기
    → NO (확실할 때만): 직접 응답
```

**특수 케이스:**
- EnterPlanMode 진입 전 → brainstorming 먼저 확인
- 서브에이전트로 디스패치된 경우 → `<SUBAGENT-STOP>` 태그로 skip

### Red Flags — 스킬 회피 합리화 패턴

| 합리화 | 현실 |
|---------|------|
| "간단한 질문이라서" | 질문도 작업이다. 스킬 확인 필수. |
| "먼저 맥락이 필요해서" | 스킬 확인이 질문보다 선행. |
| "코드베이스부터 탐색해야" | 스킬이 탐색 방법을 알려준다. |
| "이 스킬은 과도하다" | 단순한 것이 복잡해진다. 사용하라. |
| "이 스킬을 기억한다" | 스킬은 진화한다. 현재 버전을 읽어라. |
| "먼저 이것만 하나 하고" | 무엇이든 하기 전에 확인. |

### 우선순위

```
1. 유저의 명시적 지시 (CLAUDE.md, 직접 요청) — 최고 우선순위
2. Superpowers 스킬 — 시스템 기본 동작을 오버라이드
3. 기본 시스템 프롬프트 — 최저 우선순위
```

유저가 "TDD 하지 마"라고 했으면 TDD 스킬보다 유저 지시가 우선.

### 스킬 유형별 강제성

| 유형 | 예시 | 적용 방식 |
|------|------|-----------|
| **Rigid** | TDD, debugging | 정확히 따라야 함. 변형 불가. |
| **Flexible** | patterns | 원칙을 맥락에 맞게 적용 |

스킬 자체가 어떤 유형인지 명시함.

---

## 3. 스킬 작성 방법론 (writing-skills)

### 핵심: "스킬 작성 = 프로세스 문서에 대한 TDD"

| TDD 개념 | 스킬 작성 |
|-----------|-----------|
| 테스트 케이스 | 서브에이전트를 사용한 pressure scenario |
| 프로덕션 코드 | SKILL.md 문서 |
| RED (실패) | 스킬 없이 에이전트가 규칙 위반 (베이스라인) |
| GREEN (성공) | 스킬 있을 때 에이전트가 규칙 준수 |
| REFACTOR | 새로운 합리화 루프홀 발견 → 차단 → 재검증 |

> "스킬 없이 에이전트가 실패하는 것을 보지 않았다면, 스킬이 올바른 것을 가르치는지 알 수 없다."

### Iron Law

```
스킬에 대한 실패 테스트 없이는 스킬을 작성하지 않는다.
```

- "간단한 추가"에도 예외 없음
- "문서 업데이트"에도 예외 없음
- 테스트 없이 작성한 스킬 → 삭제 후 처음부터

### 합리화 방어 설계

1. **모든 루프홀을 명시적으로 차단**
   ```markdown
   테스트 전에 코드 작성? 삭제. 처음부터.
   예외 없음:
   - "참고용"으로 보관 금지
   - 테스트 중 "적응" 금지
   - 삭제는 삭제
   ```

2. **합리화 테이블 구축** — 베이스라인 테스트에서 발견된 모든 변명 수집

3. **Red Flags 리스트** — 에이전트 자가 점검용

4. **"정신 vs 문자" 논쟁 차단**
   ```markdown
   규칙의 문자를 위반하는 것은 규칙의 정신을 위반하는 것이다.
   ```

### 스킬 유형별 테스트 방법

| 유형 | 예시 | 테스트 방법 |
|------|------|-------------|
| **Discipline** | TDD, verification | 학술 질문 + pressure scenario (시간+매몰비용+피로) |
| **Technique** | condition-based-waiting | 적용 시나리오 + 엣지 케이스 + 정보 부족 |
| **Pattern** | reducing-complexity | 인식 + 적용 + 반례 (적용하지 말아야 할 때) |
| **Reference** | API 문서 | 검색 + 적용 + 갭 테스트 |

---

## 4. Multi-Platform 도구 매핑

스킬은 Claude Code 도구명으로 작성되며, 각 플랫폼이 자체 매핑을 제공:

| Claude Code | Copilot CLI | Codex | Gemini CLI |
|-------------|------------|-------|------------|
| `Read` | `view` | native file tools | `read_file` |
| `Write` | `create` | native file tools | `write_file` |
| `Edit` | `edit` | native file tools | `replace` |
| `Bash` | `bash` | native shell | `run_shell_command` |
| `Grep` | `grep` | — | `grep_search` |
| `Glob` | `glob` | — | `glob` |
| `Skill` | `skill` | native load | `activate_skill` |
| `Task` (subagent) | `task` | `spawn_agent` | **없음** (fallback to executing-plans) |
| `TodoWrite` | `sql` (todos table) | `update_plan` | `write_todos` |
| `WebSearch` | — | — | `google_web_search` |

### 주요 플랫폼 차이

- **Gemini CLI**: 서브에이전트 미지원 → `subagent-driven-development` 불가, `executing-plans`로 fallback
- **Codex**: named agent registry 없음 → agent .md 파일을 읽어서 `spawn_agent(message=...)` 로 전달
- **Copilot CLI**: `async: true` 비동기 쉘 세션 지원 (Claude Code에는 없는 기능)

---

## 5. CSO (Claude Search Optimization) 전략

스킬의 **발견 가능성**을 높이는 기법:

### Discovery Flow
```
에이전트가 문제 직면 → description 매칭 → overview 스캔 → quick reference → 예제 로드
```

### 기법
1. **Rich Description**: "Use when..." + 구체적 증상/트리거
2. **Keyword Coverage**: 에러 메시지, 증상, 동의어, 도구명
3. **Descriptive Naming**: 동사 우선 (`creating-skills` > `skill-creation`)
4. **Token Efficiency**: getting-started <150단어, 자주 로드되는 스킬 <200단어, 기타 <500단어

### Cross-Reference 규칙
```markdown
# GOOD: 명시적 요구 마커
**REQUIRED BACKGROUND:** You MUST understand superpowers:test-driven-development

# BAD: @ 링크 → 즉시 로드되어 컨텍스트 소모
@skills/testing/test-driven-development/SKILL.md
```

---

## 6. 하네스 설계 시사점

| 관찰 | 시사점 |
|------|--------|
| Frontmatter로 메타데이터 정의 | 스킬 discovery를 위한 표준 포맷 필요 |
| Description ≠ 요약, = 트리거 조건 | LLM이 shortcut을 타는 문제 — 설계 시 주의 |
| 1% 규칙으로 강제 트리거 | opt-in 방식은 실패한다. 강제 적용 메커니즘 필요 |
| TDD for skills | 스킬/프롬프트도 테스트 가능한 코드로 취급 |
| 합리화 방어 패턴 | LLM의 규칙 회피 성향을 설계에 반영해야 함 |
| Multi-platform 도구 매핑 | 하나의 스킬 정의, 여러 harness에서 실행 가능한 추상화 레이어 |
| Token efficiency 목표치 | 자주 로드되는 스킬은 컨텍스트 비용 관리 필수 |
| Flat namespace | 검색 최적화를 위해 계층 구조보다 flat + 키워드 방식 |

---

**다음 단계**: Step 3 — 핵심 스킬 3개 deep dive: `subagent-driven-development`, `writing-plans`, `test-driven-development`
