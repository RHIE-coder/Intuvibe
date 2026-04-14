# Prompt Engineering Overview

---

프롬프트 엔지니어링 가이드의 진입점. 기법 자체보다 **언제/어떻게 시작할지**에 초점.

---

## 시작 전 선행 조건 (3가지)

1. **성공 기준 정의** — 이 사용 사례에서 무엇이 "좋은 결과"인가
2. **평가 방법 확보** — 성공 기준을 실증적으로 측정할 수단
3. **첫 번째 초안 프롬프트** — 개선할 대상이 있어야 프롬프트 엔지니어링 가능

> 선행 조건 미충족 시: [Define success criteria and build evaluations] 문서 먼저 참고.

---

## 언제 프롬프트 엔지니어링인가

- 프롬프트 엔지니어링으로 **제어 가능한** 성공 기준에만 적용
- 모든 문제가 프롬프트로 해결되지 않음
  - 예: 레이턴시/비용 최적화 → 모델 선택이 더 효과적일 수 있음

---

## 기법 참조

모든 프롬프트 기법(명확성, 예제, XML 구조화, 역할 프롬프팅, 사고 기법, 프롬프트 체이닝 등)은 **[Prompting best practices]** 문서에 통합.

**Claude Console 도구**:
- 프롬프트 생성기 (초안 없을 때)
- 템플릿 & 변수
- 프롬프트 개선기

---

## 학습 리소스

- [GitHub 인터랙티브 튜토리얼](https://github.com/anthropics/prompt-eng-interactive-tutorial)
- [Google Sheets 경량 튜토리얼](https://docs.google.com/spreadsheets/d/19jzLgRruG9kjUQNKtCg1ZjdD6l6weA6qRXG5zLIAhC8)

---

> [insight] 이 페이지는 내용이 매우 간략하며 실질적 기법은 모두 `prompting-best-practices`로 위임한다. 하네스 관점에서는 플러그인 개발자가 Claude를 처음 활용할 때 "성공 기준 → 평가 → 프롬프트 초안 → 개선" 순서를 따르도록 플러그인 개발 가이드에 이 흐름을 반영하는 것이 타당하다. 특히 레이턴시/비용 문제는 프롬프트가 아닌 모델 선택 문제임을 명시하는 것이 하네스 플러그인 디버깅 가이드에도 필요하다.
