# Code Execution Tool

---

Python/Bash 코드를 보안 샌드박스 컨테이너에서 실행. 데이터 분석, 시각화, 파일 생성, 시스템 명령 실행 가능.

- 버전: `code_execution_20250825` (현재) / `code_execution_20260120` (프로그래매틱 툴 호출 지원)
- **ZDR 미지원** (표준 데이터 보존 정책 적용)
- 플랫폼: Claude API, Microsoft Azure AI Foundry (Bedrock/Vertex 미지원)

---

## 1. 비용

| 조건 | 비용 |
|------|------|
| `web_search_20260209` 또는 `web_fetch_20260209`와 함께 사용 | **무료** |
| 단독 사용 | 최소 5분 단위 실행 시간 과금 |
| 월간 무료 | **1,550 시간/조직** |
| 초과분 | **$0.05/시간/컨테이너** |

> 파일 포함 요청은 툴 미호출 시에도 파일 사전 로드로 인해 과금됨.

---

## 2. 컨테이너 환경

| 항목 | 사양 |
|------|------|
| Python | 3.11.12 |
| OS | Linux (x86_64) |
| 메모리 | 5GiB RAM |
| 디스크 | 5GiB |
| CPU | 1 CPU |
| 네트워크 | **완전 차단** (아웃바운드 없음) |
| 만료 | 생성 후 30일 |
| 스코프 | API 키의 워크스페이스 단위 |

**사전 설치 라이브러리:** pandas, numpy, scipy, scikit-learn, matplotlib, seaborn, sympy, pillow, pypdf, pdfplumber, openpyxl, ripgrep, sqlite 등

---

## 3. 서브 툴 (자동 제공)

```json
{"type": "code_execution_20250825", "name": "code_execution"}
```

툴 등록 시 2개 서브 툴 자동 활성화:
- `bash_code_execution`: 셸 명령 실행
- `text_editor_code_execution`: 파일 보기·생성·편집 (코드 작성 포함)

---

## 4. Files API 연동

```python
# 파일 업로드 후 컨테이너에 주입
file = client.beta.files.upload(file=open("data.csv", "rb"))

response = client.beta.messages.create(
    model="claude-opus-4-6",
    betas=["files-api-2025-04-14"],
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "Analyze this CSV"},
            {"type": "container_upload", "file_id": file.id}  # ← 파일 주입
        ]
    }],
    tools=[{"type": "code_execution_20250825", "name": "code_execution"}],
)

# 생성된 파일 다운로드
for item in response.content:
    if item.type == "bash_code_execution_tool_result":
        for file in item.content.content:
            client.beta.files.download(file.file_id)
```

---

## 5. 컨테이너 재사용

```python
# 첫 요청
response1 = client.messages.create(...)
container_id = response1.container.id

# 두 번째 요청: 동일 컨테이너 재사용 (파일 상태 유지)
response2 = client.messages.create(
    container=container_id,
    ...
)
```

컨테이너 ID를 전달하면 이전 요청에서 생성된 파일·변수를 그대로 사용 가능.

---

## 6. 에러 코드

| 코드 | 설명 |
|------|------|
| `execution_time_exceeded` | 최대 실행 시간 초과 |
| `container_expired` | 컨테이너 만료 (30일) |
| `output_file_too_large` | 명령 출력 크기 초과 |
| `file_not_found` | 파일 없음 (view/edit) |
| `string_not_found` | str_replace에서 old_str 미발견 |

---

## 7. 멀티 환경 주의사항

클라이언트 bash 툴과 코드 실행 툴을 동시 사용 시 Claude가 환경을 혼동할 수 있음. 시스템 프롬프트에 명시:

```text
- code_execution 툴: Anthropic 샌드박스 환경 (인터넷 없음)
- 클라이언트 bash 툴: 사용자 로컬 환경
- 두 환경 간 변수/파일 상태는 공유되지 않음
```

---

> [insight] `web_search_20260209` 또는 `web_fetch_20260209`와 함께 사용 시 코드 실행이 무료라는 점은 하네스의 연구·분석 에이전트 설계에서 핵심 비용 최적화 포인트다. 웹 검색 + 동적 필터링(코드 실행)을 항상 함께 제공하면 코드 실행 비용 없이 훨씬 정확한 결과를 얻을 수 있다.

> [insight] 컨테이너 재사용(`container_id` 전달)은 멀티스텝 데이터 분석 에이전트에서 핵심 패턴이다. 하네스에서 긴 분석 워크플로우(데이터 로드 → 전처리 → 분석 → 시각화)를 여러 API 호출로 나눠 처리할 때, 동일 컨테이너를 재사용하면 데이터를 매 요청마다 다시 로드할 필요가 없다.

> [insight] 컨테이너가 인터넷에 완전히 차단되어 있다는 보안 특성은 중요하다. 코드 실행 환경에서 외부 API 호출이 필요한 경우, 에이전트가 직접 외부 API를 호출하게 하려면 클라이언트 툴을 사용해야 한다. 코드 실행 컨테이너는 순수 컴퓨팅(수식, 데이터 변환, 시각화 등)에 적합하다.

> [insight] Files API + code_execution의 `container_upload` 패턴은 하네스의 문서 처리 파이프라인 설계에서 핵심이다. 사용자가 업로드한 CSV, Excel, PDF를 Files API로 먼저 저장하고, 이후 여러 분석 요청에서 동일 파일 ID를 재사용하면 파일 전송 오버헤드를 최소화할 수 있다.

> [insight] Agent Skills를 코드 실행 툴이 활성화한다는 점 주목. 하네스의 플러그인 마켓플레이스에서 "스킬" 개념을 구현할 때, 코드 실행 툴을 기반으로 한 Agent Skills 시스템이 공식 확장 메커니즘으로 활용 가능하다.
