# Superpowers - Remaining Skills Summary

> 나머지 스킬들의 핵심 패턴 요약: `brainstorming`, `executing-plans`, `finishing-a-development-branch`, `systematic-debugging`, `verification-before-completion`

---

## 1. brainstorming

**트리거**: 모든 creative work 전 (기능 생성, 컴포넌트 빌드, 동작 수정)

**HARD-GATE**: 설계가 제시되고 유저가 승인할 때까지 구현 행동(코드 작성, 스캐폴딩) 절대 금지.

**Anti-Pattern 차단**: "이건 너무 단순해서 설계가 필요 없다" → 모든 프로젝트가 이 프로세스를 거침. todo list도, 단일 함수도.

**프로세스 (9단계)**:
1. 프로젝트 컨텍스트 탐색
2. Visual companion 제안 (선택)
3. 명확화 질문 — **한 번에 하나씩** (multiple choice 선호)
4. 2-3가지 접근법 제안 (트레이드오프 + 추천)
5. 설계 제시 — 섹션별, 각 섹션 후 승인
6. 설계 문서 작성 → `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
7. Spec self-review (placeholder, 모순, 범위, 모호성)
8. **유저 리뷰 게이트** — 유저가 승인할 때까지 대기
9. writing-plans 스킬로 전환 (유일한 다음 스텝)

**핵심 원칙**:
- 한 번에 하나의 질문
- 대규모 프로젝트 → 서브프로젝트로 분해 먼저
- Scope check: 단일 구현 계획으로 충분한가?

---

## 2. executing-plans

**트리거**: 별도 세션에서 구현 계획 실행 시

**subagent-driven-development과의 차이**:
- SDD: 같은 세션, 태스크별 서브에이전트, 2단계 리뷰
- executing-plans: 별도 세션, 배치 실행, 체크포인트

**프로세스**:
1. 계획 로드 + 비판적 리뷰 (우려사항 → 유저에게 제기)
2. 태스크 순차 실행 (TodoWrite 추적)
3. finishing-a-development-branch로 완료

**서브에이전트 지원 없는 플랫폼의 fallback** — Gemini CLI 등에서 사용.

> "Superpowers works much better with access to subagents."

---

## 3. finishing-a-development-branch

**트리거**: 구현 완료, 모든 테스트 통과 후

**프로세스**:
1. 테스트 검증 (실패 시 중지)
2. Base branch 결정
3. **정확히 4가지 옵션 제시**:
   - Merge locally
   - Push and create PR
   - Keep as-is
   - Discard (typed "discard" 확인 필요)
4. 선택 실행
5. Worktree 정리 (옵션 1, 4만)

**설계 포인트**: 개방형 질문 금지 → 구조화된 4개 옵션만.

---

## 4. systematic-debugging

**트리거**: 모든 버그, 테스트 실패, 예기치 않은 동작

**Iron Law**: 근본 원인 조사 없이 수정 금지.

**4 Phases** (각 단계 완료 전 다음 단계 진행 금지):

| Phase | 핵심 | 방법 |
|-------|------|------|
| 1. Root Cause Investigation | 에러 메시지 정독, 재현, 최근 변경, 증거 수집 | 멀티 컴포넌트 시스템 → 각 계층 경계에 진단 로깅 |
| 2. Pattern Analysis | 작동하는 유사 코드 찾기, 차이점 식별 | 참조 구현 완전 읽기 (skim 금지) |
| 3. Hypothesis & Testing | 단일 가설, 최소 변경, 하나씩 테스트 | "I don't know" 인정 허용 |
| 4. Implementation | 실패 테스트 작성 → 단일 수정 → 검증 | **3회 이상 수정 실패 → 아키텍처 질문** |

**3회 실패 규칙**: 3번 이상 수정 시도가 실패하면 → "architectural problem"으로 판단 → 유저와 논의 필요.

**Supporting techniques**: root-cause-tracing, defense-in-depth, condition-based-waiting (각각 별도 .md)

---

## 5. verification-before-completion

**트리거**: 작업 완료/성공/통과를 주장하기 직전

**Iron Law**: 신선한 검증 증거 없이 완료 주장 금지.

**Gate Function**:
```
1. IDENTIFY: 이 주장을 증명하는 명령은?
2. RUN: 명령 실행 (신선하게, 완전하게)
3. READ: 전체 출력, exit code, 실패 수 확인
4. VERIFY: 출력이 주장을 확인하는가?
5. ONLY THEN: 주장
```

**핵심 구별:**

| 주장 | 필요한 증거 | 불충분한 것 |
|------|-----------|------------|
| "Tests pass" | 테스트 명령 출력: 0 failures | 이전 실행, "should pass" |
| "Bug fixed" | 원래 증상 테스트: passes | 코드 변경, assumed fixed |
| "Agent completed" | VCS diff 확인 | 에이전트 성공 보고 |

**Red Flags**: "should", "probably", "seems to", "Great!", "Perfect!", "Done!" — 검증 전 만족 표현.

> "Claiming work is complete without verification is dishonesty, not efficiency."

---

## 6. 전체 워크플로우 파이프라인 (완성)

```
brainstorming (설계 정제 + 유저 승인)
  → HARD-GATE: 승인 전 구현 금지
  → Design spec 작성 + self-review + 유저 리뷰
  │
  ↓
writing-plans (상세 구현 계획)
  → 2-5분 단위 태스크, placeholder 금지
  → self-review: spec coverage + type consistency
  │
  ↓
using-git-worktrees (격리된 workspace)
  → 테스트 베이스라인 확인
  │
  ↓
subagent-driven-development (추천) OR executing-plans (fallback)
  → SDD: Controller + Implementer + Spec Reviewer + Quality Reviewer
  → TDD 강제 (test-driven-development)
  → systematic-debugging (문제 발생 시)
  → verification-before-completion (매 주장마다)
  → requesting-code-review (매 태스크 후)
  │
  ↓
finishing-a-development-branch
  → 테스트 검증 → 4가지 옵션 → 실행 → worktree 정리
```
