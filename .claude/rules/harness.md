---
globs: packages/harness/**
---

# harness 모듈 규칙

## 필수 선행 읽기

작업 전 반드시 아래 문서를 읽는다:

- `packages/harness/CONVENTIONS.md` — 디렉토리별 관리 원칙, 개발 워크플로우 (`book/ → PLAN.md → bench/ → plugin/ → git tag`)
- `packages/harness/PLAN.md` — 현재 구현 계획 (상태가 `active`일 때만 따른다)

## 핵심 규칙

1. **book/이 단일 진실이다.** plugin/은 book/을 따라잡는 산출물이다.
2. **plugin/ 변경 시 book/, bench/ 갱신을 빠뜨리지 않는다.**
3. 워크플로우: `book/ → PLAN.md → bench/ → plugin/ → git tag`

## 참고 문서

설계 근거나 플랫폼 동작을 확인해야 할 때 아래 경로를 선택적으로 읽는다.

| 경로 | 내용 |
|------|------|
| `docs/review/harness-engineering/` | 하네스 엔지니어링 논문/사례 리뷰 |
| `docs/review/bkit/` | bkit 분석 (PDCA, 스킬, 훅, 에이전트) |
| `docs/review/claude-ai/` | Claude Code 플랫폼 레퍼런스 (설정, MCP, 플러그인, 스킬 등) |
| `docs/review/compound-engineering/` | 복합 엔지니어링 리뷰 |
| `docs/review/superpowers/` | 에이전트 강화 패턴 리뷰 |
| `docs/insights/` | 패턴 정리, 설계 청사진, 산업 분석 |
| `docs/review/claude-cookbooks/` | Claude 쿡북 분석 |
