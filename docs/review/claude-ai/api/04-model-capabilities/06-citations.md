# Citations

---

문서 기반 답변 시 Claude가 근거를 특정 문서의 특정 위치로 자동 인용하는 기능. 응답 내 텍스트 블록에 citation 위치 정보가 포함됨.

- 지원: Haiku 3 제외 모든 active 모델
- 텍스트 인용만 지원 (이미지 인용 미지원)
- **Structured Outputs와 함께 사용 불가** (400 에러)

---

## 1. 동작 원리

1. **문서 제공** + `citations: {enabled: true}` 설정
2. **청킹 처리**: 문서 유형별 최소 인용 단위로 분할
3. **응답 생성**: 주장 텍스트 + 해당 위치의 citation 목록 반환

> `citations.enabled`는 요청 내 모든 문서에 동일하게 설정 필요 (전부 활성 또는 전부 비활성)

---

## 2. 문서 유형

| 유형 | 청킹 | Citation 형식 |
|------|------|--------------|
| Plain text | 문장 단위 자동 | 문자 인덱스 (0-indexed, exclusive end) |
| PDF | 문장 단위 자동 | 페이지 번호 (1-indexed, exclusive end) |
| Custom content | 없음 (제공한 content block 그대로) | 블록 인덱스 (0-indexed, exclusive end) |

> CSV, XLSX, DOCX, MD, TXT → document block 미지원. plain text로 변환 후 메시지 content에 직접 포함.

### Plain text

```python
{
    "type": "document",
    "source": {"type": "text", "media_type": "text/plain", "data": "..."},
    "title": "제목",         # optional, 인용 불가
    "context": "문서 메타",   # optional, 인용 불가
    "citations": {"enabled": True},
}
```

Citation 예시:
```python
{
    "type": "char_location",
    "cited_text": "The grass is green.",  # 출력 토큰 미집계
    "document_index": 0,
    "document_title": "제목",
    "start_char_index": 0,
    "end_char_index": 20,  # exclusive
}
```

### PDF

```python
{
    "type": "document",
    "source": {"type": "base64", "media_type": "application/pdf", "data": base64_data},
    "citations": {"enabled": True},
}
# 또는 file_id 참조
```

Citation 예시:
```python
{
    "type": "page_location",
    "cited_text": "...",
    "document_index": 0,
    "start_page_number": 5,  # 1-indexed
    "end_page_number": 6,    # exclusive
}
```

### Custom content

청킹 없이 제공한 content block 단위로 인용. 세밀한 제어가 필요한 경우 사용.

```python
{
    "type": "document",
    "source": {
        "type": "content",
        "content": [
            {"type": "text", "text": "첫 번째 청크"},
            {"type": "text", "text": "두 번째 청크"},
        ],
    },
    "citations": {"enabled": True},
}
```

Citation 예시:
```python
{
    "type": "content_block_location",
    "cited_text": "...",
    "document_index": 0,
    "start_block_index": 0,
    "end_block_index": 1,  # exclusive
}
```

---

## 3. 인덱스 규칙

- **document_index**: 요청 전체의 document content block 목록 기준 0-indexed (메시지 전체 걸쳐)
- **char_index**: 0-indexed, exclusive end
- **page_number**: 1-indexed, exclusive end
- **block_index**: 0-indexed, exclusive end

---

## 4. 응답 구조

```python
{
    "content": [
        {"type": "text", "text": "According to the document, "},
        {
            "type": "text",
            "text": "the grass is green",
            "citations": [
                {
                    "type": "char_location",
                    "cited_text": "The grass is green.",
                    "document_index": 0,
                    "start_char_index": 0,
                    "end_char_index": 20,
                }
            ],
        },
        ...
    ]
}
```

응답이 여러 텍스트 블록으로 쪼개지며 각 블록에 `citations` 리스트가 포함.

---

## 5. 스트리밍

`citations_delta` 이벤트로 citation 전달:
```
delta: {"type": "citations_delta", "citation": {"type": "char_location", ...}}
```

---

## 6. 토큰 비용

- 입력 토큰: 시스템 프롬프트 추가 + 청킹으로 약간 증가
- **`cited_text` 필드: 출력 토큰/이후 입력 토큰 미집계** (편의용 필드)
- 프롬프트 기반 인용 대비 비용 절감 가능

---

## 7. Prompt Caching 연동

citation 블록은 캐시 불가, **소스 문서**는 캐시 가능:

```python
{
    "type": "document",
    "source": {...},
    "citations": {"enabled": True},
    "cache_control": {"type": "ephemeral"},  # 문서 캐시
}
```

---

## 8. 호환성

| 동작 | 미동작 |
|------|--------|
| Prompt caching | Structured Outputs (`output_config.format`) |
| Token counting | |
| Batch processing | |
| Streaming | |
| Files API (`file_id`) | |

---

> [insight] Citations의 document 유형 설계는 하네스의 RAG 파이프라인 아키텍처와 직결된다. plain text는 청킹이 자동이지만 제어 불가, custom content는 직접 청킹을 정의할 수 있다. 하네스에서 RAG 청크를 에이전트에 제공할 때, 청크 경계를 직접 제어하려면 custom content 방식이 유리하다.

> [insight] `cited_text`가 출력/입력 토큰에 미집계된다는 점은 비용 설계에서 중요하다. 인용 기반 응답이 많은 에이전트(리서치, 문서 QA)에서는 prompt 기반 인용 출력 대비 실질 비용이 낮을 수 있다.

> [insight] Citations + Structured Outputs 조합이 불가하다. 하네스에서 문서 기반 에이전트와 JSON 출력이 동시에 필요한 경우, 두 단계로 분리(1. Citations로 근거 수집 → 2. Structured Outputs로 포맷 변환)하는 아키텍처를 채택해야 한다.

> [insight] `title`과 `context` 필드는 인용 대상이 아니라 메타데이터 전달용. `context`는 길이 제한이 없어 문서 메타(출처 URL, 날짜, 카테고리 등)를 JSON 문자열로 담을 수 있다. 하네스의 문서 에이전트에서 source 추적에 활용 가능.
