# Agent Skills Best Practices

---

효과적인 Skills 작성 원칙. 간결함, 자유도 조절, 진보적 공개, 반복 개선.

---

## 1. 핵심 원칙

### 간결함
- Claude는 이미 똑똑하다 → Claude가 모르는 것만 추가
- 각 정보가 토큰 비용을 정당화하는지 검토
- SKILL.md 본문 **500줄 이하** 유지

### 자유도 설정 (3단계)

| 자유도 | 사용 시점 | 형식 |
|--------|---------|------|
| 높음 | 다양한 접근법이 유효, 맥락 의존 | 텍스트 지시문 |
| 중간 | 선호 패턴 있음, 일부 변형 허용 | 의사코드/파라미터화된 스크립트 |
| 낮음 | 취약 작업, 일관성 필수 | 정확한 스크립트, 수정 금지 |

---

## 2. Description 작성 규칙

- **3인칭 작성** (시스템 프롬프트 주입되므로 "I can..."이나 "You can..." 금지)
- what + when 모두 포함
- 구체적 키워드 포함 (Claude가 100+ Skills 중 선택 시 기준)

```yaml
# 좋은 예
description: Extract text and tables from PDF files, fill forms, merge documents. 
             Use when working with PDF files or when the user mentions PDFs, forms.

# 나쁜 예
description: Helps with documents
```

---

## 3. Progressive Disclosure 패턴

```text
my-skill/
├── SKILL.md          # 진입점 (500줄 이하)
├── FORMS.md          # 필요 시만 로딩
├── REFERENCE.md      # 필요 시만 로딩
└── scripts/
    └── process.py    # 실행만, 컨텍스트 미소비
```

**핵심 규칙**:
- 참조 깊이 최대 1단계 (SKILL.md → file.md, file.md → another.md 금지)
- 100줄 이상 참조 파일에는 목차(ToC) 포함

---

## 4. 워크플로우 패턴

복잡한 작업에는 체크리스트 제공:

```markdown
- [ ] Step 1: 분석 (run analyze.py)
- [ ] Step 2: 계획 생성 (fields.json 편집)
- [ ] Step 3: 검증 (run validate.py)
- [ ] Step 4: 실행 (run fill.py)
- [ ] Step 5: 확인 (run verify.py)
```

**plan-validate-execute 패턴**: 중간 산출물(JSON 플랜) 생성 → 스크립트로 검증 → 실행. 배치 작업·파괴적 변경에 필수.

---

## 5. 스크립트 작성 원칙

- Claude에게 떠넘기지 말고 에러를 직접 처리
- "magic number" 금지 → 모든 상수에 이유 주석
- 명시적 구분: "실행" vs "참조용으로 읽기"
- 플랫폼: Claude API는 네트워크 없음, 런타임 설치 불가 → 사전 설치 패키지만

---

## 6. MCP 툴 참조

```markdown
# 완전 한정 이름 사용
Use the BigQuery:bigquery_schema tool to retrieve schemas.
```

서버 이름 없이 사용하면 "tool not found" 에러 발생.

---

## 7. 반복 개선 방법

**Claude A (설계)** → **Claude B (실사용 테스트)** 사이클:
1. Skill 없이 Claude A와 작업 → 반복 제공 컨텍스트 파악
2. Claude A에게 Skill 작성 요청
3. Claude B (신선한 인스턴스)로 실제 작업 테스트
4. 문제 관찰 → Claude A에게 개선 요청
5. 반복

**평가 우선 원칙**: Skill 작성 전에 평가 시나리오 3개 먼저 정의.

---

## 8. 안티패턴

- Windows 경로(`\`) 사용 → 유닉스 경로(`/`)로
- 너무 많은 선택지 제공 → 기본값 + 예외 사항 구조로
- 시간 민감 정보 메인에 배치 → "old patterns" 섹션으로
- 일관성 없는 용어 (field/box/element 혼용) 금지

---

> [insight] "Claude는 이미 똑똑하다"는 원칙은 하네스 플러그인 작성에서 가장 중요한 가이드라인이다. Skills의 가장 흔한 실수는 과도한 설명으로 컨텍스트를 낭비하는 것이다. 하네스에서 플러그인 마켓플레이스의 Skills를 작성할 때, "이 정보 없이 Claude가 이 작업을 못 할까?" 라는 질문을 모든 단락에 적용해 토큰 비용을 최소화해야 한다.

> [insight] plan-validate-execute 패턴은 하네스의 에이전트 루프에서 신뢰성의 핵심이다. 배치 작업이나 파일 수정 같은 파괴적 연산에서 중간 JSON 플랜을 생성하고 스크립트로 검증한 후 실행하면, 에러를 조기 포착하고 롤백 지점을 확보할 수 있다. 이 패턴은 Skills뿐 아니라 하네스의 에이전트 전반에 적용 가능한 설계 원칙이다.

> [insight] Claude A/B 반복 개선 방법은 하네스의 플러그인 품질 관리 프로세스로 그대로 채택할 수 있다. 플러그인 개발자가 하나의 Claude 인스턴스로 Skill을 설계하고, 별도의 신선한 인스턴스로 실사용 테스트를 반복하는 것은 가장 효과적인 Skill 품질 보증 방법이다. "평가 먼저" 원칙도 하네스 플러그인 CI/CD 파이프라인에 통합해야 한다.
