# Agent Skills Quickstart

---

사전 제작 Skills를 API에서 사용하는 최소 패턴.

---

## 1. 필수 베타 헤더

```python
betas=["code-execution-2025-08-25", "skills-2025-10-02"]
# 파일 다운로드 시 추가
betas=["code-execution-2025-08-25", "skills-2025-10-02", "files-api-2025-04-14"]
```

---

## 2. Skills 목록 조회

```python
skills = client.beta.skills.list(source="anthropic", betas=["skills-2025-10-02"])
# 반환: pptx, xlsx, docx, pdf
```

---

## 3. Skill 사용 패턴

```python
response = client.beta.messages.create(
    model="claude-opus-4-6",
    max_tokens=4096,
    betas=["code-execution-2025-08-25", "skills-2025-10-02"],
    container={
        "skills": [{"type": "anthropic", "skill_id": "pptx", "version": "latest"}]
    },
    messages=[{"role": "user", "content": "재생에너지 5슬라이드 프레젠테이션 만들어줘"}],
    tools=[{"type": "code_execution_20250825", "name": "code_execution"}],
)
```

**`container.skills` 파라미터**:
- `type`: `"anthropic"` (Anthropic 제공) 또는 `"workspace"` (커스텀)
- `skill_id`: `pptx` / `xlsx` / `docx` / `pdf`
- `version`: `"latest"` 권장

---

## 4. 생성 파일 다운로드

코드 실행 툴 응답에서 `file_id` 추출 후 Files API로 다운로드:

```python
file_id = None
for block in response.content:
    if block.type == "tool_use" and block.name == "code_execution":
        for result_block in block.content:
            if hasattr(result_block, "file_id"):
                file_id = result_block.file_id
                break

if file_id:
    file_content = client.beta.files.download(
        file_id=file_id, betas=["files-api-2025-04-14"]
    )
    file_content.write_to_file("output.pptx")
```

---

> [insight] `container.skills` 파라미터 구조는 하네스의 플러그인 마켓플레이스에서 핵심 통합 포인트다. `type: "anthropic"` vs `type: "workspace"` 구분이 사전 제작 Skills와 커스텀 Skills의 경계다. 하네스에서 마켓플레이스 플러그인을 워크스페이스 Skills로 등록하면 동일한 `container.skills` 패턴으로 사용자 정의 플러그인을 제공할 수 있다.

> [insight] `tools: [{"type": "code_execution_20250825"}]` 필수 요건은 Skills가 코드 실행 컨테이너에서 동작한다는 설계 원칙의 반영이다. 하네스에서 Skills를 사용할 때는 항상 code_execution 툴을 활성화해야 하며, 이는 Skills와 일반 tool_use를 동시에 사용하는 하이브리드 에이전트 구성 시 tool 목록 관리에 주의가 필요하다는 의미다.
