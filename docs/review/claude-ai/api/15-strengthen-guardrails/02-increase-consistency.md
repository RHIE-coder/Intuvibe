# Increase Output Consistency

---

> **JSON 스키마 준수가 목표라면**: 아래 기법 대신 [Structured Outputs](/docs/en/build-with-claude/structured-outputs) 사용.  
> 아래 기법은 일반적 출력 일관성 또는 엄격한 JSON 스키마 이상의 유연성이 필요할 때 유용.

---

## 1. 출력 형식 명시

JSON, XML 또는 커스텀 템플릿으로 원하는 출력 구조를 정밀하게 정의.

```
Analyze this feedback and output in JSON format with keys:
"sentiment" (positive/negative/neutral),
"key_issues" (list),
"action_items" (list of dicts with "team" and "task").
```

---

## 2. Assistant 턴 프리필 (Prefill)

> **주의**: Claude Opus 4.6, Sonnet 4.6, Mythos Preview에서는 **미지원**.  
> 대신 Structured Outputs 또는 시스템 프롬프트 지시 사용.

`assistant` 턴 시작 부분을 원하는 형식으로 미리 채워 Claude의 친절한 전문(preamble)을 건너뛰고 구조를 강제.

```python
messages = [
    {"role": "user", "content": "Generate today's sales report..."},
    {"role": "assistant", "content": "<report>\n    <summary>\n        <metric name="},  # 프리필
]
```

---

## 3. 예제로 제약 (Few-shot)

원하는 출력 예제 제공 → 추상적 지시보다 Claude의 이해도를 높임.

```xml
Output following this example format:
<competitor>
  <name>Rival Inc</name>
  <overview>A 50-word summary.</overview>
  <swot>
    <strengths>- Bullet points</strengths>
    ...
  </swot>
  <strategy>A 30-word strategic response.</strategy>
</competitor>

Now, analyze AcmeGiant and AcmeDataCo using this format.
```

---

## 4. 검색으로 컨텍스트 일관성 확보 (RAG)

지식베이스를 고정 정보 소스로 제공 → Claude 응답이 항상 동일 기반에서 출발.

```xml
<kb>
  <entry><id>1</id><title>Reset AD password</title><content>...</content></entry>
  <entry><id>2</id><title>Connect to VPN</title><content>...</content></entry>
</kb>

When helping users, check the knowledge base first.
Respond in format:
<response>
  <kb_entry>Knowledge base entry used</kb_entry>
  <answer>Your response</answer>
</response>
```

---

## 5. 복잡한 태스크 → 프롬프트 체이닝

복잡한 태스크를 일관된 소형 서브태스크로 분해 → 각 단계에서 Claude의 집중도 유지.

---

## 6. 역할 유지 (Character Consistency)

| 기법 | 설명 |
|------|------|
| 시스템 프롬프트로 역할 설정 | 페르소나, 배경, 성격 특성 상세 정의 |
| 시나리오별 예상 응답 제공 | 다양한 상황에서 캐릭터를 벗어나지 않도록 사전 "훈련" |

```
System: You are AcmeBot, enterprise AI assistant for AcmeTechCo.
Rules:
  - If asked about IP: "I cannot disclose proprietary information."
  - If unclear on a doc: "To ensure accuracy, please clarify section X..."
```

---

> [insight] Prefill이 Opus 4.6, Sonnet 4.6에서 미지원이라는 점은 하네스 플러그인이 최신 모델을 사용할 때 출력 일관성 전략을 바꿔야 함을 의미한다. 신모델에서는 Structured Outputs + 명시적 포맷 지시 조합이 유일한 대안이다. 하네스의 플러그인 개발 가이드에서 "프리필 사용 지양, Structured Outputs 우선" 정책을 명시해야 한다.

> [insight] RAG 패턴의 `<kb_entry>` 응답 형식은 하네스 플러그인의 투명성 요구사항과 일치한다. 플러그인이 어떤 지식 소스를 근거로 응답했는지를 구조화된 형식으로 반환하면, 하네스 대시보드에서 플러그인 응답의 근거 추적(audit trail)이 가능해진다.
