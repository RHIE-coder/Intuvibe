# Embeddings

---

Anthropic는 자체 임베딩 모델을 제공하지 않음. 공식 파트너는 **Voyage AI**. Claude와의 RAG/검색 파이프라인 구현 시 Voyage AI 사용 권장.

---

## 1. Voyage AI 추천 모델

### 텍스트 임베딩
| 모델 | 컨텍스트 | 차원 | 특징 |
|------|----------|------|------|
| `voyage-3-large` | 32,000 | 1024 (기본), 256/512/2048 | 최고 품질·다국어 |
| `voyage-3.5` | 32,000 | 1024 (기본), 256/512/2048 | 균형형 |
| `voyage-3.5-lite` | 32,000 | 1024 (기본), 256/512/2048 | 저지연·저비용 |
| `voyage-code-3` | 32,000 | 1024 (기본), 256/512/2048 | 코드 특화 |
| `voyage-finance-2` | 32,000 | 1024 | 금융 특화 |
| `voyage-law-2` | 16,000 | 1024 | 법률·장문 특화 |

### 멀티모달 임베딩
| 모델 | 컨텍스트 | 차원 | 특징 |
|------|----------|------|------|
| `voyage-multimodal-3` | 32,000 | 1024 | 텍스트+이미지(스크린샷, 슬라이드, 표 등) 벡터화 |

---

## 2. 기본 사용

```python
import voyageai

vo = voyageai.Client()  # VOYAGE_API_KEY 환경변수 사용

# 문서 임베딩
doc_embds = vo.embed(documents, model="voyage-3.5", input_type="document").embeddings

# 쿼리 임베딩
query_embd = vo.embed([query], model="voyage-3.5", input_type="query").embeddings[0]
```

> `input_type` 파라미터 필수: `"document"` / `"query"` 구분. 내부적으로 다른 프롬프트가 prepend됨.
> - query: "Represent the query for retrieving supporting documents: ..."
> - document: "Represent the document for retrieval: ..."

---

## 3. 유사도 계산

Voyage 임베딩은 길이 1로 정규화 → **dot-product = cosine similarity** (계산 더 빠름)

```python
import numpy as np
similarities = np.dot(doc_embds, query_embd)
retrieved_id = np.argmax(similarities)
```

---

## 4. 양자화 옵션 (output_dtype)

| 타입 | 정밀도 | 저장 절감 |
|------|--------|----------|
| `float` (기본) | 32-bit | - |
| `int8` / `uint8` | 8-bit | 4x |
| `binary` / `ubinary` | 1-bit (packed) | 32x |

---

## 5. Matryoshka 임베딩 (차원 축소)

다차원 지원 모델(예: `voyage-code-3`)은 앞부분 차원만 잘라내도 유효:

```python
short_dim = 256
resized_embd = embd_normalize(np.array(embd)[:, :short_dim]).tolist()
```

---

## 6. 접근 방법

- Python: `pip install -U voyageai`
- HTTP API: `POST https://api.voyageai.com/v1/embeddings`
- AWS Marketplace: Voyage AI 마켓플레이스 패키지로 접근 가능

---

> [insight] Anthropic이 자체 임베딩 모델을 제공하지 않으므로 하네스의 RAG 파이프라인은 외부 임베딩 서비스에 의존해야 한다. Voyage AI를 기본으로 하되, 플러그인 아키텍처로 OpenAI/Cohere 등 다른 임베딩 프로바이더도 교체 가능하게 설계하는 것이 중요하다.

> [insight] `voyage-code-3`는 코드 검색 특화 모델이다. 하네스에서 코드 검색/코드 리뷰 에이전트를 구현할 때 일반 임베딩 대신 이 모델을 사용하면 검색 품질이 유의미하게 향상된다.

> [insight] `voyage-multimodal-3`는 PDF 스크린샷, 슬라이드, 표 이미지를 텍스트와 동일한 벡터 공간에 임베딩할 수 있다. PDF support와 조합하면 텍스트+시각 자료를 통합 검색하는 멀티모달 RAG 파이프라인이 가능하다.

> [insight] 양자화 옵션(binary: 32x 절감)은 대규모 문서 인덱스에서 벡터 저장 비용을 크게 줄인다. 하네스에서 임베딩 저장 레이어를 설계할 때 `output_dtype` 파라미터 지원을 포함해두면 스케일업 시 비용 최적화가 용이하다.
