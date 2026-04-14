# Files API

---

파일을 한번 업로드 후 `file_id`로 반복 참조. 매 요청마다 재업로드 불필요.

- 베타 헤더: `files-api-2025-04-14`
- ZDR: ❌ 미지원
- Amazon Bedrock / Google Vertex AI: ❌ 미지원

---

## 1. 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/v1/files` | 파일 업로드 |
| GET | `/v1/files` | 파일 목록 |
| GET | `/v1/files/{id}` | 메타데이터 조회 |
| DELETE | `/v1/files/{id}` | 파일 삭제 |
| GET | `/v1/files/{id}/content` | 파일 다운로드 |

---

## 2. 지원 파일 타입

| 파일 타입 | MIME | 콘텐츠 블록 타입 |
|----------|------|----------------|
| PDF | `application/pdf` | `document` |
| 텍스트 | `text/plain` | `document` |
| 이미지 | `image/jpeg`, `image/png`, `image/gif`, `image/webp` | `image` |
| 데이터셋 등 | 다양 | `container_upload` (코드 실행 툴) |

**지원 모델**: 이미지 → Claude 3+, PDF → Claude 3.5+, 데이터셋 → Haiku 4.5 + Claude 3.7+

---

## 3. 업로드 / 참조

```python
# 업로드
uploaded = client.beta.files.upload(
    file=("document.pdf", open("document.pdf", "rb"), "application/pdf"),
)

# 메시지에서 참조
response = client.beta.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "요약해줘."},
            {"type": "document", "source": {"type": "file", "file_id": uploaded.id}}
        ]
    }],
    betas=["files-api-2025-04-14"],
)
```

**document 블록 옵션**: `title`, `context`, `citations: {"enabled": true}` (선택)

---

## 4. 다운로드

스킬 또는 코드 실행 툴이 생성한 파일만 다운로드 가능. **직접 업로드한 파일은 다운로드 불가**.

```python
file_content = client.beta.files.download(file_id)
file_content.write_to_file("output.txt")
```

---

## 5. 저장 및 생명주기

| 항목 | 값 |
|------|-----|
| 최대 파일 크기 | 500 MB |
| 조직 전체 스토리지 | 500 GB |
| TTL | 명시적 삭제 전까지 영구 보존 |
| 스코프 | 워크스페이스 (동일 워크스페이스 내 API 키 공유 가능) |

삭제된 파일은 복구 불가. 삭제 직후 API 접근 불가 (진행 중인 Messages 호출에는 일시적으로 유지).

---

## 6. 요금

- 파일 관리 작업(업로드/다운로드/목록/삭제) → **무료**
- Messages 요청에서 파일 내용 사용 → 입력 토큰으로 과금
- Rate Limit: 베타 기간 중 약 **100 RPM**

---

## 7. 주요 에러

| 에러 | 원인 |
|------|------|
| 404 | file_id 없음 또는 접근 권한 없음 |
| 400 (invalid file type) | 파일 타입 ≠ 콘텐츠 블록 타입 |
| 400 (context window) | 파일이 컨텍스트 윈도우 초과 |
| 413 | 500 MB 초과 |
| 403 | 조직 스토리지 500 GB 초과 |

---

> [insight] Files API의 ZDR 미지원은 하네스 설계에서 중요한 제약이다. 민감한 데이터(PII, 기업 기밀)를 포함한 파일은 Files API 대신 매 요청에 직접 인라인으로 포함하거나, ZDR이 필요한 엔터프라이즈 워크플레이스에서는 Files API를 배제하는 티어별 스토리지 전략이 필요하다.

> [insight] "업로드한 파일은 다운로드 불가"라는 제약은 하네스의 파일 라이프사이클 설계에 영향을 준다. Files API는 입력 전달 채널이지 파일 저장소가 아니다. 코드 실행 툴의 출력물(차트, 처리된 데이터)만 다운로드 가능하므로, 하네스에서 파일 입출력 파이프라인을 설계할 때 이 단방향성을 명확히 구분해야 한다.

> [insight] 워크스페이스 스코프의 파일 공유는 하네스의 다중 에이전트 아키텍처에서 활용 가능하다. 같은 워크스페이스의 서로 다른 에이전트(연구 에이전트, 코딩 에이전트)가 공통 참조 문서를 한번만 업로드하고 file_id로 공유하면, 반복 업로드 비용과 지연 없이 협업 컨텍스트를 구성할 수 있다.

> [insight] 500 MB 파일 크기 한도와 "컨텍스트 윈도우 초과" 에러는 별개다. 500 MB 텍스트 파일은 업로드는 되지만 Messages 요청에서 컨텍스트 초과로 400 에러가 발생한다. 하네스에서 대형 문서 처리 시 업로드 전 토큰 카운팅으로 사전 검증하거나, 청킹 전략을 적용해야 한다.
