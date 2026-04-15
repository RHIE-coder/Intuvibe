# Scope Writing Guide

## Scope 문서란

Scope 문서(`00-overview.md`)는 제품/프로젝트의 전체 기능 범위를 정의하는 문서다. Brainstorm에서 나온 아이디어를 구조화하고, 이후 Spec 작성의 출발점이 된다.

## 핵심 원칙

1. **WHAT만 담는다** — 기술 스택, 구현 방법, 아키텍처 결정은 Scope에 넣지 않는다. 그것은 architect/plan의 역할이다.
2. **Domain은 기능 영역별 분류** — 개발 순서나 기술 레이어가 아니라 사용자/비즈니스 관점의 기능 영역으로 나눈다.
3. **Section = 하나의 harness cycle** — 각 Section은 독립적으로 spec → plan → implement를 돌릴 수 있는 단위다.
4. **요구사항 요약은 한 줄** — 상세 요구사항은 각 Section의 spec에서 다룬다.

## Domain 분류 기준

- 사용자가 인지하는 기능 영역 단위로 나눈다
- 기술 레이어(Frontend/Backend/DB)로 나누지 않는다
- 하나의 Domain에 3-8개의 Section이 적절하다

## 좋은 예시

| Section | 요구사항 요약 |
|---------|--------------|
| 로그인 | 이메일/비밀번호로 로그인, 소셜 로그인 지원 |
| 회원가입 | 이메일 인증 기반 가입, 약관 동의 필수 |
| 비밀번호 재설정 | 이메일로 재설정 링크 발송, 24시간 유효 |

## 나쁜 예시

| Section | 요구사항 요약 |
|---------|--------------|
| 로그인 | JWT + Redis session, Express middleware로 구현 |
| 회원가입 | PostgreSQL users 테이블에 INSERT, bcrypt 해싱 |
| API 라우터 | REST API endpoint /api/v1/auth/* 설계 |

**문제점:**
- 기술 구현(JWT, Redis, Express, PostgreSQL, bcrypt)이 섞여 있다
- "API 라우터"는 기술 레이어 분류이지 기능 영역이 아니다
- 요구사항이 아닌 구현 방법을 서술하고 있다

## Decisions 섹션 활용

Scope 단계에서 확정해야 하는 사항은 Decisions 테이블에 기록한다:

| 항목 | 결정 | 근거 |
|------|------|------|
| 다국어 지원 | v1에서 제외 | 초기 타겟이 국내 시장 |
| 결제 수단 | 카드 결제만 | 사업 계약 일정 |

**기술 결정은 여기에 넣지 않는다.** "DB는 PostgreSQL" 같은 결정은 architect 단계로 위임한다.

## Section 크기 판단

- 너무 작은 Section: spec/plan/implement 사이클을 돌리기에 내용이 부족
- 너무 큰 Section: 하나의 사이클에서 소화할 수 없어 중간에 분리가 필요
- 적절한 크기: AC(Acceptance Criteria) 3-10개 정도로 예상되는 단위
