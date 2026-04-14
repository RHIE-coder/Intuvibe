# Reduce Hallucinations

---

Claude도 사실과 다른 정보를 생성할 수 있음 → 환각(hallucination) 최소화 기법.

---

## 1. 기본 전략

### ① "모른다"고 말하도록 허용

```
...If you're unsure about any aspect or if the report lacks necessary information,
say "I don't have enough information to confidently assess this."
```

가장 단순하면서 효과적 — 허위 정보 대신 불확실성을 명시하도록 유도.

### ② 직접 인용으로 근거 확보

20k 토큰 이상 장문서 태스크에서 특히 유효:

```
1. Extract exact quotes from the policy most relevant to GDPR/CCPA compliance.
   If you can't find relevant quotes, state "No relevant quotes found."
2. Use the quotes to analyze compliance, referencing quotes by number.
   Only base your analysis on the extracted quotes.
```

먼저 인용 추출 → 추출된 인용에만 근거해 분석하는 2단계 구조.

### ③ 출처 인용 검증

```
After drafting, review each claim. For each claim, find a direct quote from the documents
that supports it. If you can't find a supporting quote, remove that claim and mark with [].
```

응답 생성 후 각 주장을 지지하는 인용을 찾도록 요구 → 없으면 제거.

---

## 2. 고급 기법

| 기법 | 설명 |
|------|------|
| **Chain-of-Thought 검증** | 최종 답 전에 추론 과정을 단계별 설명 요구 → 잘못된 논리/가정 발견 |
| **Best-of-N 검증** | 동일 프롬프트를 N회 실행 후 출력 비교 → 불일치 = 환각 가능성 |
| **반복 정제** | Claude 출력을 후속 프롬프트 입력으로 사용 → 이전 진술 검증/확장 |
| **외부 지식 제한** | 제공된 문서 이외의 일반 지식 사용 금지 명시 |

> **주의**: 이 기법들은 환각을 **크게 줄이지만 완전히 제거하지는 못함**. 고위험 의사결정에서는 항상 중요 정보를 별도 검증.

---

> [insight] 하네스의 RAG 플러그인에서 환각 방지는 핵심 신뢰성 요구사항이다. "인용 추출 → 인용 기반 분석" 2단계 패턴과 "지지 인용 없으면 주장 제거" 패턴을 하네스의 문서 분석 플러그인 기본 프롬프트 템플릿에 내장해야 한다. 특히 법률/의료/금융 도메인 플러그인에서는 외부 지식 제한(`only use provided documents`)을 필수 가드레일로 강제하는 것이 타당하다.
