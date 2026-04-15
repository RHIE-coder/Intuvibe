# packages/harness 개발 가이드

이 디렉토리는 intuvibe-harness 플러그인의 개발 공간이다.

## 필수 선행 읽기

작업 전 반드시 아래 문서를 읽는다:

- `CONVENTIONS.md` — 디렉토리별 관리 원칙, 개발 워크플로우 (`book/ → PLAN.md → bench/ → plugin/ → git tag`)
- `PLAN.md` — 현재 구현 계획 (상태가 `active`일 때만 따른다)

## 핵심 규칙

1. **book/이 단일 진실이다.** plugin/은 book/을 따라잡는 산출물이다.
2. **plugin/ 변경 시 book/, bench/ 갱신을 빠뜨리지 않는다.** 스킬, 스크립트, 기능을 추가/변경하면 관련 설계 문서(book/)와 검증(bench/)을 같은 작업 내에서 갱신한다.
3. **한국어 우선.** 본문은 한국어. 코드, 필드명, CLI 명령은 영어.
