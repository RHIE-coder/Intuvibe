# Skills API Guide (Using Skills with the Claude API)

---

커스텀 Skills를 API로 업로드하고 관리하는 기술 레퍼런스.

- 베타 헤더: `code-execution-2025-08-25`, `skills-2025-10-02`, `files-api-2025-04-14`
- ZDR: ❌ 미지원
- 요청당 최대 Skills: **8개**

---

## 1. 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/v1/skills` | Skill 생성 |
| GET | `/v1/skills` | 목록 조회 (`?source=anthropic\|custom`) |
| GET | `/v1/skills/{id}` | 단일 조회 |
| DELETE | `/v1/skills/{id}` | 삭제 (버전 전부 삭제 후 가능) |
| POST | `/v1/skills/{id}/versions` | 새 버전 생성 |
| GET | `/v1/skills/{id}/versions` | 버전 목록 |
| DELETE | `/v1/skills/{id}/versions/{v}` | 버전 삭제 |

---

## 2. 업로드 방법

**요구사항**: `SKILL.md` 파일 최상위 필수, 전체 크기 30 MB 미만

```bash
# Zip 파일로
curl -X POST "https://api.anthropic.com/v1/skills" \
  -H "anthropic-beta: skills-2025-10-02" \
  -F "display_title=Financial Analysis" \
  -F "files[]=@skill.zip"

# 개별 파일로
curl -X POST "https://api.anthropic.com/v1/skills" \
  -H "anthropic-beta: skills-2025-10-02" \
  -F "display_title=Financial Analysis" \
  -F "files[]=@financial_skill/SKILL.md;filename=financial_skill/SKILL.md"
```

---

## 3. Messages에서 Skills 사용

```python
response = client.beta.messages.create(
    model="claude-opus-4-6",
    max_tokens=4096,
    betas=["code-execution-2025-08-25", "skills-2025-10-02"],
    container={
        "skills": [
            {"type": "anthropic", "skill_id": "pptx", "version": "latest"},
            {"type": "custom", "skill_id": "skill_01AbCd...", "version": "latest"}
        ]
    },
    messages=[...],
    tools=[{"type": "code_execution_20250825", "name": "code_execution"}],
)
```

**Skill ID 형식**:
- Anthropic: `pptx`, `xlsx`, `docx`, `pdf`
- 커스텀: `skill_01AbCdEfGhIjKlMnOpQrStUv`

**Version 형식**:
- Anthropic: `20251013` 또는 `latest`
- 커스텀: epoch 타임스탬프(`1759178010641129`) 또는 `latest`

---

## 4. 컨테이너 재사용 (멀티턴)

```python
# 첫 요청에서 container.id 반환됨
container_id = response.container.id

# 후속 요청에서 재사용
response2 = client.beta.messages.create(
    container={"id": container_id, "skills": [...]},
    ...
)
```

---

## 5. 장시간 실행 (`pause_turn`)

```python
while response.stop_reason == "pause_turn":
    response = client.beta.messages.create(
        container={"id": response.container.id, "skills": [...]},
        messages=[...],  # 대화 히스토리 포함
        ...
    )
```

---

## 6. 파일 출력 다운로드

응답의 `bash_code_execution_tool_result`에서 `file_id` 추출 → Files API로 다운로드.

---

> [insight] `pause_turn` 처리 패턴은 하네스의 장시간 Skills 실행에서 핵심이다. Skill이 복잡한 문서를 생성하거나 다단계 처리를 수행할 때 단일 턴을 초과할 수 있다. `container.id`를 재사용해 같은 컨테이너에서 작업을 이어가는 패턴은 하네스 에이전트 루프에서 표준으로 구현해야 한다.

> [insight] 버전 관리 전략에서 "모든 버전 삭제 후 Skill 삭제 가능"이라는 제약은 하네스의 플러그인 생명주기 관리에서 중요하다. Skill 폐기 시 버전별 삭제 단계가 필요하고, 프로덕션 환경에서 활성 사용 중인 버전을 실수로 삭제하지 않도록 배포 상태와 버전 목록을 함께 추적해야 한다.
