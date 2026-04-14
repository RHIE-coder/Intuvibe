# PDF Support

---

Claude는 PDF의 텍스트, 이미지, 차트, 표를 모두 이해. Vision 기능 기반이므로 Vision 제약사항 동일 적용.

- ZDR 적용 가능
- 모든 active 모델 지원
- API 직접 접근 + Google Vertex AI 지원
- Amazon Bedrock: Converse API는 citations 활성화 시에만 전체 시각 분석 가능 (미활성화 시 텍스트 추출만)

---

## 1. 요건

| 항목 | 제한 |
|------|------|
| 최대 요청 크기 | 32MB |
| 최대 페이지 수 | 600페이지 (200k 컨텍스트 모델: 100페이지) |
| 형식 | 표준 PDF (암호화/비밀번호 불가) |

> 밀도 높은 PDF(소폰트/복잡한 표/그래픽)는 페이지 제한 전에 컨텍스트 윈도우를 채울 수 있음. 큰 파일은 섹션 분할 또는 이미지 다운샘플링 권장.

---

## 2. PDF 제공 방식 3가지

### Option 1: URL 참조
```python
{
    "type": "document",
    "source": {
        "type": "url",
        "url": "https://example.com/document.pdf",
    },
}
```

### Option 2: Base64 인코딩
```python
import base64
pdf_data = base64.standard_b64encode(open("document.pdf", "rb").read()).decode("utf-8")

{
    "type": "document",
    "source": {
        "type": "base64",
        "media_type": "application/pdf",
        "data": pdf_data,
    },
}
```

### Option 3: Files API (beta)
반복 사용 시 권장. 인코딩 오버헤드 없이 `file_id`로 참조.

```python
# 업로드
file_upload = client.beta.files.upload(
    file=("document.pdf", open("document.pdf", "rb"), "application/pdf")
)

# 참조
{
    "type": "document",
    "source": {"type": "file", "file_id": file_upload.id},
}
```

> Files API 사용 시 `betas=["files-api-2025-04-14"]` 헤더 필요

---

## 3. 처리 방식

1. 각 페이지 → 이미지로 변환
2. 각 페이지 텍스트 추출
3. 텍스트 + 이미지를 동시에 Claude에 제공 → 시각 요소(차트, 다이어그램 등) 포함 분석

---

## 4. 토큰 비용 추정

- **텍스트**: 페이지당 약 1,500~3,000 토큰 (콘텐츠 밀도에 따라)
- **이미지**: 각 페이지가 이미지로 변환되므로 Vision 이미지 비용 계산 적용
- PDF 전용 추가 요금 없음

---

## 5. 성능 최적화

### Prompt Caching
반복 분석 시 문서에 `cache_control` 적용:
```python
{
    "type": "document",
    "source": {...},
    "cache_control": {"type": "ephemeral"},
}
```

### Batch Processing
대량 문서 처리: Message Batches API에 PDF document block 포함 가능.

### 베스트 프랙티스
- PDF를 텍스트보다 **앞에** 배치
- 표준 폰트 사용, 텍스트 선명도 확보
- 페이지 방향 올바르게 유지
- 프롬프트에서 PDF 뷰어 기준 페이지 번호 사용
- 큰 PDF는 청크로 분할

---

## 6. Amazon Bedrock 주의사항

| API | 모드 | 시각 분석 |
|-----|------|----------|
| Converse API (citations 비활성) | 텍스트 추출만 | 불가 |
| Converse API (citations 활성) | 전체 시각 분석 | 가능 |
| InvokeModel API | 전체 시각 분석 | 가능 (citations 불필요) |

> Converse API에서 차트/이미지가 보이지 않으면 citations 플래그 확인 필요.

---

> [insight] PDF support는 페이지당 이중 처리(텍스트 + 이미지)가 일어나므로 토큰 비용이 상당하다. 하네스에서 문서 처리 에이전트를 설계할 때, 비용 추정을 위해 token counting을 먼저 실행하고 페이지 범위를 제한하거나 필요한 섹션만 추출하는 전처리 단계를 포함하는 것이 중요하다.

> [insight] Files API + PDF 조합은 반복 참조 비용을 크게 줄인다. 동일 문서를 여러 에이전트가 다른 질문으로 분석하는 패턴(멀티패스 문서 분석)에서는 Files API로 한 번 업로드하고 `file_id`로 재사용하는 것이 효율적이다.

> [insight] Amazon Bedrock Converse API에서 시각 분석이 기본 비활성화되어 있다는 점은 플랫폼 추상화 레이어를 설계할 때 중요한 차이다. 하네스가 Bedrock도 지원한다면, PDF document 처리 시 플랫폼별 설정 차이를 에이전트 설정 레이어에서 처리해야 한다.

> [insight] PDF의 밀도에 따라 페이지 제한에 도달하기 전에 컨텍스트가 가득 찰 수 있다. 대용량 문서를 처리하는 에이전트는 단순히 페이지 수로 청크를 나누는 게 아니라 토큰 카운트를 기반으로 청크 크기를 조정하는 로직이 필요하다.
