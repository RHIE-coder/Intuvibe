# Search Results (search_result Content Block)

---

RAG 파이프라인에서 검색 결과를 구조화된 방식으로 Claude에 제공하고, 자연스러운 인용(citation)을 생성하도록 하는 `search_result` content block 타입.

- 지원 모델: Opus 4.6/4.5/4.1/4, Sonnet 4.6/4.5/4, Haiku 4.5
- Prompt caching, Batch processing, Streaming 호환
- Structured Outputs과 **비호환** (Citations와 동일)

---

## 1. search_result 블록 구조

```python
{
    "type": "search_result",
    "source": "https://example.com/page",   # 인용 출처 URL
    "title": "페이지 제목",                   # 선택적
    "content": [
        {"type": "text", "text": "검색 결과 텍스트 내용..."}
    ],
    "citations": {"enabled": True}           # 인용 활성화
}
```

---

## 2. 제공 방식 2가지

### 방법 1: 툴 호출 결과로 반환
```python
# tool_result content block 안에 search_result 포함
{
    "role": "user",
    "content": [
        {
            "type": "tool_result",
            "tool_use_id": "...",
            "content": [
                {
                    "type": "search_result",
                    "source": "https://...",
                    "title": "문서 제목",
                    "content": [{"type": "text", "text": "..."}],
                    "citations": {"enabled": True}
                }
            ]
        }
    ]
}
```

### 방법 2: 사용자 메시지의 최상위 content로 직접 포함
```python
{
    "role": "user",
    "content": [
        {
            "type": "search_result",
            "source": "https://...",
            "title": "문서 제목",
            "content": [{"type": "text", "text": "..."}],
            "citations": {"enabled": True}
        },
        {
            "type": "text",
            "text": "위 검색 결과를 바탕으로 질문에 답해주세요: ..."
        }
    ]
}
```

---

## 3. Citations와의 관계

- `search_result` 블록은 Citations 기능의 확장
- `citations: {enabled: true}` 설정 시 Claude가 응답에서 출처를 자동 인용
- 인용된 텍스트(`cited_text`)는 토큰 비용에 미포함
- 응답 내 citation 객체에 `source`, `title`, `cited_text` 포함

---

## 4. 호환성

| 기능 | 호환 여부 |
|------|----------|
| Prompt Caching | ✅ |
| Batch Processing | ✅ |
| Streaming | ✅ |
| Structured Outputs | ❌ |
| Extended Thinking | ✅ |

---

## 5. 베스트 프랙티스

- 여러 search_result 블록을 하나의 메시지에 포함 가능 → 멀티소스 RAG 구현
- 검색 결과가 긴 경우 Prompt Caching의 `cache_control` 적용 권장
- 툴 호출 기반 방식(방법 1)이 에이전틱 워크플로우에서 더 자연스러운 패턴

---

> [insight] `search_result` 블록은 하네스의 RAG 에이전트 설계에서 핵심이다. 기존의 단순 텍스트 삽입 방식 대신 구조화된 블록으로 검색 결과를 제공하면 Claude가 자동으로 출처를 인용하므로, 하네스에서 검색→분석→인용 파이프라인을 구현할 때 별도 citation 파싱 로직 없이 신뢰성 있는 출처 추적이 가능하다.

> [insight] 툴 호출 결과(tool_result)와 직접 삽입(user content) 두 방식이 모두 지원된다는 점은 하네스 아키텍처 설계에 유연성을 준다. 에이전트가 search 툴을 직접 호출하는 패턴(방법 1)과 외부에서 검색 결과를 주입하는 패턴(방법 2) 모두 지원 가능하므로, 플러그인 마켓플레이스에서 search 플러그인과 RAG 파이프라인을 분리 설계할 수 있다.

> [insight] Structured Outputs와 비호환이라는 점은 중요한 아키텍처 제약이다. 검색 결과 기반 분석 + 구조화된 JSON 출력이 동시에 필요한 태스크는 두 단계로 분리해야 한다: 1단계 search_result로 분석 → 2단계 structured output으로 구조화.

> [insight] `cited_text`가 토큰 비용에 포함되지 않는다는 점은 Citations와 동일하다. RAG에서 검색 결과가 길더라도 인용 텍스트 자체의 반복 비용은 없으므로, 넓은 컨텍스트 커버리지를 위해 많은 search_result를 포함하는 전략이 비용 효율적이다.
