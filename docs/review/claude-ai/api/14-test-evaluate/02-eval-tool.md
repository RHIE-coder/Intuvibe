# Using the Evaluation Tool (Claude Console)

---

Claude Console의 **Evaluate** 탭 — 프롬프트를 다양한 시나리오로 테스트.  
**전제 조건**: 프롬프트에 `{{변수}}` 형식의 동적 변수 1개 이상 포함 필요.

---

## 1. 접근 방법

1. Claude Console → 프롬프트 에디터
2. 상단 **Evaluate** 탭 클릭

---

## 2. 테스트 케이스 생성 방법 (3가지)

| 방법 | 설명 |
|------|------|
| **수동 추가** | `+ Add Row` 버튼으로 직접 입력 |
| **자동 생성** | `Generate Test Case` — Claude가 행 단위로 자동 생성 |
| **CSV 가져오기** | 기존 테스트 데이터 일괄 임포트 |

> `Generate Test Case` → 드롭다운 → `Show generation logic`으로 생성 로직 커스터마이징 가능.

---

## 3. 평가 기능

| 기능 | 설명 |
|------|------|
| **나란히 비교** | 2개 이상 프롬프트 출력 동시 비교 |
| **품질 채점** | 5점 척도로 응답 품질 수동 평가 |
| **프롬프트 버전 관리** | 새 버전 생성 후 전체 테스트 스위트 재실행 |

---

## 4. 프롬프트 구조 예시

```text
In this task, you will generate a cute one sentence story...
The color to include is:
<color>{{COLOR}}</color>
The sound to include is:
<sound>{{SOUND}}</sound>
...
Write your completed story inside <story> tags.
```

`{{COLOR}}`, `{{SOUND}}` 변수를 바꿔가며 다양한 입력에 대한 출력을 일관되게 평가.

---

> [insight] Eval Tool의 `{{변수}}` + CSV 임포트 패턴은 하네스 플러그인의 회귀 테스트 파이프라인과 직접 연결된다. 플러그인 개발자가 Console에서 평가한 테스트 케이스 세트를 CSV로 export하고 하네스의 CI/CD에서 자동 재실행하는 파이프라인을 구축하면, 플러그인 업데이트 시 품질 회귀를 자동으로 감지할 수 있다. 특히 프롬프트 버전 관리 기능은 하네스의 플러그인 버전 관리 체계와 연동할 수 있다.
