# Mitigate Jailbreaks and Prompt Injections

---

Claude는 기본적으로 탈옥 공격에 강인하지만, 추가 가드레일로 보안 강화 가능.

---

## 1. 핵심 방어 기법

### ① 무해성 스크린 (Harmlessness Screen)

Haiku 4.5 같은 경량 모델로 사용자 입력을 사전 검사. Structured Outputs로 응답을 단순 분류로 제한.

```json
// 스크린 프롬프트의 output_config
{
  "output_config": {
    "format": {
      "type": "json_schema",
      "schema": {
        "type": "object",
        "properties": { "is_harmful": { "type": "boolean" } },
        "required": ["is_harmful"],
        "additionalProperties": false
      }
    }
  }
}
```

```
User: A user submitted this content:
<content>{{CONTENT}}</content>
Classify whether this content refers to harmful, illegal, or explicit activities.
```

### ② 입력 유효성 검사

탈옥 패턴 필터링. LLM을 사용한 일반화된 검증 스크린 구성 가능 (기지 탈옥 언어를 예제로 제공).

### ③ 프롬프트 엔지니어링으로 윤리/법적 경계 강조

```
System: You are AcmeCorp's ethical AI assistant.
<values>
- Integrity: Never deceive or aid in deception.
- Compliance: Refuse any request that violates laws or our policies.
- Privacy: Protect all personal and corporate data.
</values>
If a request conflicts with these values, respond:
"I cannot perform that action as it goes against AcmeCorp's values."
```

### ④ 반복 남용자 대응

동일 종류의 거부를 반복적으로 유발하는 사용자 → 경고 → 스로틀링 → 차단.

### ⑤ 지속적 모니터링

출력 정기 분석으로 탈옥 징후 감지 → 프롬프트 및 검증 전략 반복 개선.

---

## 2. 고급: 다층 보호 (체인 세이프가드)

금융 어드바이저 챗봇 예시 — 툴 호출 + 컴플라이언스 스크린 조합:

```
System: You are AcmeFinBot, financial advisor for AcmeTrade Inc.
<directives>
1. Validate all requests against SEC and FINRA guidelines.
2. Refuse any action that could be construed as insider trading.
3. Protect client privacy; never disclose personal/financial data.
</directives>

<instructions>
1. Screen user query for compliance (use 'harmlessness_screen' tool).
2. If compliant, process query.
3. If non-compliant, respond: "I cannot process this request as it violates
   financial regulations or client privacy."
</instructions>
```

`harmlessness_screen` 툴 내부에서도 Structured Outputs로 boolean 분류 → 결과로 메인 봇 분기.

---

> [insight] 하네스의 플러그인 실행 파이프라인에 이 다층 보호 패턴을 표준 레이어로 내장해야 한다. 구체적으로: (1) 사용자 입력 수신 시 Haiku 기반 harmlessness_screen 자동 실행, (2) `is_harmful: true` 반환 시 플러그인 실행 차단 + 사유 기록, (3) 반복 위반 사용자 자동 제한. 이 파이프라인은 플러그인 코드와 독립적으로 하네스 플랫폼 레벨에서 강제해야 한다.

> [insight] 도메인별 컴플라이언스 가이드라인(SEC/FINRA, GDPR, HIPAA 등)을 시스템 프롬프트 `<directives>`에 포함하는 패턴은 하네스의 플러그인 카테고리별 기본 시스템 프롬프트 템플릿으로 제공할 수 있다. 금융/의료/법률 카테고리 플러그인은 해당 규제 지시를 기본 포함하는 템플릿을 선택하도록 유도하면 플러그인 개발자의 컴플라이언스 부담을 줄일 수 있다.
