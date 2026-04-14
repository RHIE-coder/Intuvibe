# Define Success Criteria and Build Evaluations

---

LLM 앱 개발의 핵심 사이클: **성공 기준 정의 → 평가 설계 → 프롬프트 엔지니어링 반복**.

---

## 1. 성공 기준 정의 원칙 (SMART)

| 원칙 | 설명 | 나쁜 예 | 좋은 예 |
|------|------|--------|--------|
| **Specific** | 무엇을 달성할지 명확히 | "good performance" | "accurate sentiment classification" |
| **Measurable** | 정량 지표 또는 일관된 정성 척도 | "safe outputs" | "<0.1% of outputs out of 10,000 trials flagged for toxicity" |
| **Achievable** | 벤치마크/선행 연구 기반 현실적 목표 | | F1 ≥ 0.85 (기존 대비 5% 향상) |
| **Relevant** | 앱 목적과 사용자 요구에 부합 | | 의료 앱: 인용 정확도 중시 |

### 측정 방법 분류

**정량 지표 (Quantitative Metrics)**:
- Task-specific: F1 score, BLEU score (Bilingual Evaluation Understudy), perplexity
- Generic: Accuracy, Precision, Recall
- Operational: Response time (ms), uptime (%)

**정량 방법 (Quantitative Methods)**:
- A/B testing: 베이스라인 모델 또는 이전 버전과 비교
- User feedback: 태스크 완료율 등 암묵적 측정
- Edge case analysis: 에러 없이 처리되는 엣지 케이스 비율

**정성 척도 (Qualitative Scales)**:
- Likert 척도: "Rate coherence from 1 (nonsensical) to 5 (perfectly logical)"
- Expert rubrics: 전문가(언어학자 등)가 정의된 기준으로 평가

---

## 2. 주요 성공 기준 유형

- **Task Fidelity** (태스크 충실도): 태스크 수행 정확도 (F1, BLEU, 정확도). 엣지 케이스 처리 포함
- **Consistency** (일관성): 유사 입력에 대한 응답 일관성. 같은 질문을 두 번 하면 의미적으로 유사한 답을 하는지
- **Relevance & Coherence** (관련성 & 일관성): 질문 직접 답변 및 논리적 흐름
- **Tone & Style** (톤 & 스타일): 출력 스타일이 기대에 부합하는지. 대상 청중에 적합한 언어인지
- **Privacy Preservation** (개인정보 보존): PHI 등 민감 정보 처리
- **Context Utilization** (컨텍스트 활용): 제공된 컨텍스트/대화 이력 활용도
- **Latency** (지연 시간): 허용 응답 시간
- **Cost** (비용): 예산 범위 내 운영 (API 호출 비용, 모델 크기, 사용 빈도)

> 대부분의 사용 사례는 여러 기준의 **다차원 평가** 필요.

### 다차원 평가 예시 (감정 분석)

| | 기준 |
|---|------|
| **나쁜 예** | "The model should classify sentiments well" |
| **좋은 예** | 10,000개 Twitter 테스트셋에서:<br/>- F1 score ≥ 0.85<br/>- 99.5% 비독성 출력<br/>- 90%의 에러가 심각하지 않은 수준<br/>- 95% 응답 시간 < 200ms |

---

## 3. 평가(Eval) 설계 원칙

1. **태스크 특화**: 실제 배포 환경의 데이터 분포 반영 (엣지 케이스 포함)
2. **자동화 우선**: 문자열 매칭, LLM 채점 등 자동 평가 구조 선호
3. **양 > 질**: 소수의 고품질 수동 평가보다 다수의 자동화 평가가 더 가치 있음

### 고려할 엣지 케이스

- 무관하거나 존재하지 않는 입력 데이터
- 과도하게 긴 입력 데이터 또는 사용자 입력
- [채팅] 저품질, 유해, 또는 무관한 사용자 입력
- 인간 평가자조차 합의하기 어려운 모호한 테스트 케이스

---

## 4. 평가 유형별 코드 패턴

### ① 정확 일치 (Exact Match) — Task Fidelity (감정 분석)

정확 일치는 모델 출력이 사전 정의된 정답과 **정확히 일치**하는지 측정. 감정 분석(positive, negative, neutral) 같은 명확한 범주형 태스크에 적합.

```python
import anthropic

tweets = [
    {"text": "This movie was a total waste of time. 👎", "sentiment": "negative"},
    {"text": "The new album is 🔥! Been on repeat all day.", "sentiment": "positive"},
    # 엣지 케이스: 풍자
    {"text": "I just love it when my flight gets delayed for 5 hours. #bestdayever", "sentiment": "negative"},
    # 엣지 케이스: 혼합 감정
    {"text": "The movie's plot was terrible, but the acting was phenomenal.", "sentiment": "mixed"},
    # ... 996개 더
]

client = anthropic.Anthropic()

def get_completion(prompt: str):
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=50,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text

def evaluate_exact_match(model_output, correct_answer):
    return model_output.strip().lower() == correct_answer.lower()

outputs = [
    get_completion(
        f"Classify this as 'positive', 'negative', 'neutral', or 'mixed': {tweet['text']}"
    )
    for tweet in tweets
]
accuracy = sum(
    evaluate_exact_match(output, tweet["sentiment"])
    for output, tweet in zip(outputs, tweets)
) / len(tweets)
print(f"Sentiment Analysis Accuracy: {accuracy * 100}%")
```

---

### ② 코사인 유사도 (Cosine Similarity) — Consistency (FAQ 봇)

코사인 유사도는 두 벡터(여기서는 SBERT 문장 임베딩) 사이의 **코사인 각도**를 계산. 값이 1에 가까울수록 유사. 유사한 질문에 의미적으로 유사한 답변을 하는지 **일관성** 평가에 적합.

```python
from sentence_transformers import SentenceTransformer
import numpy as np
import anthropic

faq_variations = [
    {
        "questions": [
            "What's your return policy?",
            "How can I return an item?",
            "Wut's yur retrn polcy?",           # 엣지 케이스: 오타
        ],
        "answer": "Our return policy allows...",
    },
    {
        "questions": [
            # 엣지 케이스: 길고 장황한 질문
            "I bought something last week, and it's not really what I expected, so I was wondering if maybe I could possibly return it?",
            "I read online that your policy is 30 days but that seems like it might be out of date because the website was updated six months ago, so I'm wondering what exactly is your current policy?",
        ],
        "answer": "Our return policy allows...",
    },
    {
        "questions": [
            # 엣지 케이스: 무관한 정보 포함
            "I'm Jane's cousin, and she said you guys have great customer service. Can I return this?",
            "Reddit told me that contacting customer service this way was the fastest way to get an answer. I hope they're right! What is the return window for a jacket?",
        ],
        "answer": "Our return policy allows...",
    },
    # ... 47개 더
]

client = anthropic.Anthropic()

def get_completion(prompt: str):
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text

def evaluate_cosine_similarity(outputs):
    model = SentenceTransformer("all-MiniLM-L6-v2")
    embeddings = [model.encode(output) for output in outputs]
    cosine_similarities = np.dot(embeddings, embeddings.T) / (
        np.linalg.norm(embeddings, axis=1) * np.linalg.norm(embeddings, axis=1).T
    )
    return np.mean(cosine_similarities)

for faq in faq_variations:
    outputs = [get_completion(question) for question in faq["questions"]]
    similarity_score = evaluate_cosine_similarity(outputs)
    print(f"FAQ Consistency Score: {similarity_score * 100}%")
```

---

### ③ ROUGE-L — Relevance & Coherence (요약)

ROUGE-L (Recall-Oriented Understudy for Gisting Evaluation - Longest Common Subsequence)은 생성된 요약의 품질 측정. 후보 요약과 참조 요약 사이의 **가장 긴 공통 부분 수열(LCS)** 길이를 측정. 높은 ROUGE-L 점수는 핵심 정보를 논리적 순서로 잘 포착했음을 의미.

```python
from rouge import Rouge
import anthropic

articles = [
    {
        "text": "In a groundbreaking study, researchers at MIT...",
        "summary": "MIT scientists discover a new antibiotic...",
    },
    # 엣지 케이스: 다중 주제
    {
        "text": "Jane Doe, a local hero, made headlines last week for saving... In city hall news, the budget... Meteorologists predict...",
        "summary": "Community celebrates local hero Jane Doe while city grapples with budget issues.",
    },
    # 엣지 케이스: 오해의 소지 있는 제목
    {
        "text": "You won't believe what this celebrity did! ... extensive charity work ...",
        "summary": "Celebrity's extensive charity work surprises fans",
    },
    # ... 197개 더
]

client = anthropic.Anthropic()

def get_completion(prompt: str):
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text

def evaluate_rouge_l(model_output, true_summary):
    rouge = Rouge()
    scores = rouge.get_scores(model_output, true_summary)
    return scores[0]["rouge-l"]["f"]  # ROUGE-L F1 score

outputs = [
    get_completion(f"Summarize this article in 1-2 sentences:\n\n{article['text']}")
    for article in articles
]
relevance_scores = [
    evaluate_rouge_l(output, article["summary"])
    for output, article in zip(outputs, articles)
]
print(f"Average ROUGE-L F1 Score: {sum(relevance_scores) / len(relevance_scores)}")
```

---

### ④ LLM 기반 Likert 척도 — Tone & Style (고객 서비스)

LLM 기반 Likert 척도는 LLM을 사용하여 주관적 태도나 인식을 판단하는 심리측정 척도. 응답의 톤을 1~5로 평가. 전통적 지표로 정량화하기 어려운 공감, 전문성, 인내심 같은 뉘앙스 평가에 적합.

```python
import anthropic

inquiries = [
    # 엣지 케이스: 화난 고객
    {"text": "This is the third time you've messed up my order. I want a refund NOW!", "tone": "empathetic"},
    # 엣지 케이스: 복잡한 문제
    {"text": "I tried resetting my password but then my account got locked...", "tone": "patient"},
    # 엣지 케이스: 칭찬 형태의 불만
    {"text": "I can't believe how good your product is. It's ruined all others for me!", "tone": "professional"},
    # ... 97개 더
]

client = anthropic.Anthropic()

def get_completion(prompt: str):
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text

def evaluate_likert(model_output, target_tone):
    tone_prompt = f"""Rate this customer service response on a scale of 1-5 for being {target_tone}:
    <response>{model_output}</response>
    1: Not at all {target_tone}
    5: Perfectly {target_tone}
    Output only the number."""

    # 평가 모델은 생성 모델과 다른 모델 사용 권장
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=50,
        messages=[{"role": "user", "content": tone_prompt}],
    )
    return int(response.content[0].text.strip())

outputs = [
    get_completion(f"Respond to this customer inquiry: {inquiry['text']}")
    for inquiry in inquiries
]
tone_scores = [
    evaluate_likert(output, inquiry["tone"])
    for output, inquiry in zip(outputs, inquiries)
]
print(f"Average Tone Score: {sum(tone_scores) / len(tone_scores)}")
```

---

### ⑤ LLM 기반 이진 분류 (Binary Classification) — Privacy Preservation (의료 챗봇)

이진 분류는 입력이 두 클래스 중 하나에 속하는지 판정. 응답에 PHI가 포함되었는지 yes/no로 분류. 규칙 기반 시스템이 놓칠 수 있는 미묘하거나 암묵적인 PHI도 문맥을 이해하여 식별 가능.

```python
import anthropic

patient_queries = [
    {"query": "What are the side effects of Lisinopril?", "contains_phi": False},
    # 엣지 케이스: 명시적 PHI
    {"query": "Can you tell me why John Doe, DOB 5/12/1980, was prescribed Metformin?", "contains_phi": True},
    # 엣지 케이스: 가정형 PHI
    {"query": "If my friend Alice, who was born on July 4, 1985, had diabetes, what...", "contains_phi": True},
    # 엣지 케이스: 암묵적 PHI
    {"query": "I'm worried about my son. He's been prescribed the same medication as his father last year.", "contains_phi": True},
    # ... 496개 더
]

client = anthropic.Anthropic()

def get_completion(prompt: str):
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text

def evaluate_binary(model_output, query_contains_phi):
    if not query_contains_phi:
        return True

    binary_prompt = """Does this response contain or reference any Personal Health Information (PHI)?
    PHI refers to any individually identifiable health data that is created, used, or disclosed in the course of providing healthcare services. This includes information related to an individual's physical or mental health condition, the provision of healthcare to that individual, or payment for such care.
    Key aspects of PHI include:
    - Identifiers: Names, addresses, birthdates, Social Security numbers, medical record numbers, etc.
    - Health data: Diagnoses, treatment plans, test results, medication records, etc.
    - Financial information: Insurance details, payment records, etc.
    - Communication: Notes from healthcare providers, emails or messages about health.

    <response>{model_output}</response>
    Output only 'yes' or 'no'."""

    # 평가 모델은 생성 모델과 다른 모델 사용 권장
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=50,
        messages=[{"role": "user", "content": binary_prompt}],
    )
    return response.content[0].text.strip().lower() == "no"

outputs = [
    get_completion(
        f"You are a medical assistant. Never reveal any PHI in your responses. PHI refers to any individually identifiable health data that is created, used, or disclosed in the course of providing healthcare services. This includes information related to an individual's physical or mental health condition, the provision of healthcare to that individual, or payment for such care. Here is the question: {query['query']}"
    )
    for query in patient_queries
]
privacy_scores = [
    evaluate_binary(output, query["contains_phi"])
    for output, query in zip(outputs, patient_queries)
]
print(f"Privacy Preservation Score: {sum(privacy_scores) / len(privacy_scores) * 100}%")
```

---

### ⑥ LLM 기반 서수 척도 (Ordinal Scale) — Context Utilization (대화 어시스턴트)

Likert 척도와 유사하게 고정된 순서 척도(1-5)로 측정. 모델이 대화 이력을 얼마나 잘 참조하고 활용하는지 **컨텍스트 활용도** 평가에 적합. 일관되고 개인화된 상호작용의 핵심.

```python
import anthropic

conversations = [
    [
        {"role": "user", "content": "I just got a new pomeranian!"},
        {"role": "assistant", "content": "Congratulations on your new furry friend! Is this your first dog?"},
        {"role": "user", "content": "Yes, it is. I named her Luna."},
        {"role": "assistant", "content": "Luna is a lovely name! As a first-time dog owner, you might have some questions. What would you like to know about caring for Luna?"},
        # ...
        # 엣지 케이스: 훨씬 이전 컨텍스트에 의존
        {"role": "user", "content": "What should I know about caring for a dog of this specific breed?"},
    ],
    [
        {"role": "user", "content": "I'm reading 'To Kill a Mockingbird' for my book club."},
        {"role": "assistant", "content": "Great choice! 'To Kill a Mockingbird' by Harper Lee is a classic that explores themes of racial injustice and moral growth. How are you finding it so far?"},
        # 엣지 케이스: 갑작스러운 주제 전환
        {"role": "user", "content": "It's powerful. Hey, when was Scout's birthday again?"},
        {"role": "assistant", "content": "I apologize, but I don't recall the exact date of Scout's birthday being mentioned in 'To Kill a Mockingbird'. The novel doesn't focus on such specific details. Instead, it centers on Scout's growth and experiences over several years. Is there a particular part of the book or Scout's development that you're interested in discussing?"},
        # 엣지 케이스: 또 다른 주제 전환
        {"role": "user", "content": "Oh, right. Well, can you suggest a recipe for a classic Southern cake?"},
    ],
    # ... 98개 더
]

client = anthropic.Anthropic()

def get_completion(prompt: str):
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text

def evaluate_ordinal(model_output, conversation):
    ordinal_prompt = f"""Rate how well this response utilizes the conversation context on a scale of 1-5:
    <conversation>
    {"".join(f"{turn['role']}: {turn['content']}\\n" for turn in conversation[:-1])}
    </conversation>
    <response>{model_output}</response>
    1: Completely ignores context
    5: Perfectly utilizes context
    Output only the number and nothing else."""

    # 평가 모델은 생성 모델과 다른 모델 사용 권장
    response = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=50,
        messages=[{"role": "user", "content": ordinal_prompt}],
    )
    return int(response.content[0].text.strip())

outputs = [get_completion(conversation) for conversation in conversations]
context_scores = [
    evaluate_ordinal(output, conversation)
    for output, conversation in zip(outputs, conversations)
]
print(f"Average Context Utilization Score: {sum(context_scores) / len(context_scores)}")
```

---

## 5. 채점 방법 비교 (Grading Methods)

| 방법 | 속도 | 신뢰도 | 확장성 | 뉘앙스 |
|------|------|--------|--------|--------|
| **코드 기반** (exact/string match) | 최고 | 최고 | 높음 | 낮음 |
| **인간 채점** | 최저 | 최고 | 낮음 | 최고 |
| **LLM 기반** | 높음 | 중간 | 높음 | 높음 |

가장 빠르고 신뢰할 수 있고 확장 가능한 방법 순으로 선택:

1. **코드 기반 채점**: 가장 빠르고 신뢰도 높고 확장성 높음. 단, 복잡한 판단에는 유연성 부족
   - Exact match: `output == golden_answer`
   - String match: `key_phrase in output`
2. **인간 채점**: 가장 유연하고 품질 높음. 단, 느리고 비쌈. 가능하면 회피
3. **LLM 기반 채점**: 빠르고 유연하고 확장 가능. 복잡한 판단에 적합. 신뢰도 먼저 테스트 후 확장

### LLM 채점 팁

- **상세하고 명확한 루브릭 제공**: "답변은 첫 문장에 반드시 'Acme Inc.'를 언급해야 한다. 없으면 자동으로 'incorrect'"
  - 하나의 사용 사례 또는 성공 기준에도 **여러 루브릭**이 필요할 수 있음
- **경험적/구체적 출력**: `'correct'`/`'incorrect'` 또는 1-5 숫자로 한정. 순수 정성적 평가는 빠른 대규모 평가가 어려움
- **추론 유도 (Encourage reasoning)**: 채점 전 `<thinking>` 태그로 추론하게 한 뒤 추론 부분은 버림. 복잡한 판단에서 성능 향상
- **생성 모델과 다른 모델로 채점** (독립성 확보)

### LLM 기반 채점 코드 예시

```python
import anthropic

client = anthropic.Anthropic()

def build_grader_prompt(answer, rubric):
    return f"""Grade this answer based on the rubric:
    <rubric>{rubric}</rubric>
    <answer>{answer}</answer>
    Think through your reasoning in <thinking> tags, then output 'correct' or 'incorrect' in <result> tags."""

def grade_completion(output, golden_answer):
    grader_response = (
        client.messages.create(
            model="claude-opus-4-6",
            max_tokens=2048,
            messages=[
                {"role": "user", "content": build_grader_prompt(output, golden_answer)}
            ],
        )
        .content[0]
        .text
    )
    return "correct" if "correct" in grader_response.lower() else "incorrect"

# 사용 예시
eval_data = [
    {
        "question": "Is 42 the answer to life, the universe, and everything?",
        "golden_answer": "Yes, according to 'The Hitchhiker's Guide to the Galaxy'.",
    },
    {
        "question": "What is the capital of France?",
        "golden_answer": "The capital of France is Paris.",
    },
]

def get_completion(prompt: str):
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text

outputs = [get_completion(q["question"]) for q in eval_data]
grades = [
    grade_completion(output, a["golden_answer"])
    for output, a in zip(outputs, eval_data)
]
print(f"Score: {grades.count('correct') / len(grades) * 100}%")
```

---

## 6. 평가 유형 전체 요약

| # | 평가 방법 | 측정 대상 | 성공 기준 | 결과 형태 | 채점 주체 |
|---|----------|----------|----------|----------|----------|
| ① | Exact Match (정확 일치) | 범주형 정답 일치 | Task Fidelity | boolean | 코드 |
| ② | Cosine Similarity (코사인 유사도) | 의미적 유사성 | Consistency | 0~1 실수 | 코드 (임베딩 모델) |
| ③ | ROUGE-L | 요약 내용 포함도 (LCS) | Relevance & Coherence | 0~1 실수 | 코드 (문자열 알고리즘) |
| ④ | Likert Scale (리커트 척도) | 주관적 품질 (톤/스타일) | Tone & Style | 1~5 정수 | LLM (채점자) |
| ⑤ | Binary Classification (이진 분류) | 존재 여부 판정 (PHI 등) | Privacy Preservation | yes/no | LLM (채점자) |
| ⑥ | Ordinal Scale (서수 척도) | 컨텍스트 활용도 | Context Utilization | 1~5 정수 | LLM (채점자) |

---

> [insight] 하네스의 플러그인 품질 보증 프로세스에 이 평가 프레임워크를 직접 적용할 수 있다. 플러그인 등록 시 개발자에게 "이 플러그인의 성공 기준"을 명시하도록 요구하고, 하네스가 자동화된 eval 파이프라인을 제공하면 마켓플레이스의 품질 신뢰도를 높일 수 있다. 특히 LLM 기반 채점은 플러그인의 응답 품질을 자동으로 모니터링하는 데 활용 가능하다.

> [insight] "평가 모델 ≠ 생성 모델" 원칙은 하네스의 플러그인 자동 평가 설계에서 중요하다. 플러그인이 Sonnet으로 출력을 생성하더라도, 품질 평가는 Haiku(비용 절감)나 별도 Opus 인스턴스로 수행하는 이중 모델 아키텍처가 필요하다.

> [insight] 6가지 평가 유형은 코드 기반(①②③)과 LLM 기반(④⑤⑥)으로 나뉜다. 코드 기반은 빠르고 결정적이지만 뉘앙스가 부족하고, LLM 기반은 느리지만 복잡한 판단이 가능하다. 하네스의 평가 파이프라인은 태스크 특성에 따라 이 두 계열을 조합하는 전략이 필요하다.
