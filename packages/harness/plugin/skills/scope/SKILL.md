# /harness:scope

> 제품/프로젝트의 전체 기능 범위(scope)를 정의한다. 어떤 기능 영역(Domain)이 있고, 각 Domain이 어떤 Section으로 나뉘는지 확정하여 `00-overview.md`를 생성한다.

## 목표

1. 제품의 전체 기능 범위를 Domain/Section으로 구조화
2. 각 Section에 요구사항 요약(WHAT)만 기술 — 기술 스택/구현 방법은 포함하지 않음
3. Scope 단계에서 확정된 사항(포함/제외, 전략 선택 등)을 Decisions로 기록
4. `.harness/specs/00-overview.md`에 저장

## 인자

- `--from-brainstorm` — brainstorm 결과를 자동 로드하여 출발점으로 사용

## 실행 순서

### Step 1: 기존 Scope 확인

`.harness/specs/00-overview.md`가 이미 존재하면 유저에게 알리고 덮어쓸지 확인한다.

### Step 2: 참조 자료 수집

유저에게 참조할 자료(기획 문서, PoC 경로, brainstorm 결과 등)를 질문한다.
`--from-brainstorm` 플래그가 있으면 brainstorm 결과를 자동 로드한다.

### Step 3: Domain/Section 도출

유저와 대화하며 기능 영역을 도출한다. 에이전트 활용:
- **requirements-analyst**: 요구사항을 Domain/Section으로 구조화
- **devils-advocate**: 누락된 영역이나 과도한 범위 공격

참조 가이드:
```bash
cat ${CLAUDE_PLUGIN_ROOT}/skills/scope/references/scope-writing-guide.md
```

### Step 4: Scope Decision 수집

확정이 필요한 항목(포함/제외, 전략 선택 등)을 유저에게 질문하고 기록한다.

### Step 5: Overview 문서 생성

수집한 정보로 `00-overview.md`를 작성한다. 산출물 구조:

```markdown
# {프로젝트명} — Spec Overview

> **Status**: DRAFT | CONFIRMED
> **Created**: {날짜}

## Product Summary
(제품이 무엇인지 2-3 문단)

## Domain & Section Map
(Domain별 Section 테이블. 각 Section = 하나의 harness cycle 단위)
(Section에는 "요구사항 요약"만 기술. 기술 스택/구현 방법은 적지 않는다)

## Decisions
(scope 단계에서 확정된 사항 테이블)

## Notes
(이 문서의 역할 설명, 다음 단계 안내)
```

### Step 6: 검증

```bash
HARNESS_OVERVIEW_FILE=.harness/specs/00-overview.md \
  node ${CLAUDE_PLUGIN_ROOT}/skills/scope/scripts/validate-scope.mjs
```

검증 실패 시 오류를 수정하고 재검증한다.

### Step 7: Event emit

Scope 확정 이벤트:
```bash
HARNESS_PRODUCER=harness:scope \
  echo '{"type":"ScopeConfirmed","payload":{"file":".harness/specs/00-overview.md"}}' | \
  node ${CLAUDE_PLUGIN_ROOT}/scripts/state/event-emit.mjs
```

## 완료 조건

- `.harness/specs/00-overview.md` 존재
- 모든 Section에 요구사항 요약이 있음
- 요구사항 요약에 기술 용어(DB, framework, API endpoint 등)가 혼입되지 않음
- Status가 유효한 값(DRAFT 또는 CONFIRMED)
- ScopeConfirmed 이벤트 발행됨

## 참조

- `references/scope-writing-guide.md` — Scope 문서 작성 가이드
