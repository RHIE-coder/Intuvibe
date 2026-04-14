# Text Editor Tool

---

파일 보기·생성·수정 기능을 제공하는 클라이언트 툴. 코드 디버깅, 리팩토링, 문서 생성에 활용.

- 버전: `text_editor_20250728` (Claude 4, `max_characters` 지원) / `text_editor_20250124` (Sonnet 3.7, deprecated)
- 이름: `str_replace_based_edit_tool` (고정)
- ZDR: ✅ 지원
- 스키마리스 툴
- 추가 비용: **700 입력 토큰**

---

## 1. 툴 정의

```json
{
  "type": "text_editor_20250728",
  "name": "str_replace_based_edit_tool",
  "max_characters": 10000
}
```

`max_characters`: 대형 파일 뷰 시 절단 (토큰 제어). `_20250728` 이상만 지원.

---

## 2. 커맨드

### view
```json
{"command": "view", "path": "src/", "view_range": [1, 50]}
```
- 디렉토리: 2레벨 깊이 파일 목록
- 파일: 줄 번호 포함 내용 (`view_range`로 범위 지정 가능)
- `view_range` 미지정 시 전체 파일 반환

### str_replace
```json
{
  "command": "str_replace",
  "path": "primes.py",
  "old_str": "for num in range(2, limit + 1)",
  "new_str": "for num in range(2, limit + 1):"
}
```
- `old_str` 정확히 1개 매치 필수 (공백·들여쓰기 포함)
- 0개 → 에러, 2개 이상 → 에러

### create
```json
{"command": "create", "path": "test.py", "file_text": "content..."}
```

### insert
```json
{"command": "insert", "path": "file.py", "insert_line": 0, "insert_text": "# header\n"}
```
- `insert_line: 0` = 파일 맨 앞
- 줄 번호는 1-indexed

> `undo_edit` 커맨드: `_20250429`+에서 제거됨

---

## 3. 에러 처리

| 상황 | `is_error` | 반환 내용 |
|------|-----------|---------|
| 파일 없음 | `true` | `"Error: File not found"` |
| 복수 매치 | `true` | `"Error: Found N matches..."` |
| 매치 없음 | `true` | `"Error: No match found..."` |
| 권한 없음 | `true` | `"Error: Permission denied"` |

---

## 4. 구현 핵심

```python
# str_replace 안전 구현
count = content.count(old_text)
if count == 0: return "Error: No match found"
if count > 1:  return f"Error: Found {count} matches"
new_content = content.replace(old_text, new_text, 1)
```

**보안 체크리스트**:
- 경로 탐색 공격 방지 (상위 디렉토리 접근 차단)
- 중요 파일 수정 전 백업 생성
- 변경 후 구문 검증 실행 (Python: `ast.parse()`)

---

## 5. 버전 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|---------|
| 2025-07-28 | `_20250728` | `max_characters` 파라미터 추가 |
| 2025-04-29 | `_20250429` | Claude 4용, `undo_edit` 제거 |
| 2025-03-13 | `_20250124` | Sonnet 3.7 최적화 |
| 2024-10-22 | `_20241022` | 최초 릴리즈 (Sonnet 3.5, retired) |

---

## 6. view 결과 + 줄 번호 팁

`view` 결과에 줄 번호 포함 시 (`1: def is_prime(n):`):
- `view_range`로 특정 섹션 조회 가능
- `insert_line`으로 정확한 위치에 삽입 가능

줄 번호 형식은 필수가 아니지만 `view_range`, `insert` 정확도 향상에 필수적.

---

> [insight] `str_replace`의 유일 매치 요구사항은 하네스의 코드 편집 에이전트에서 핵심 안전장치다. Claude가 충분한 컨텍스트를 포함한 `old_str`을 제공하도록 시스템 프롬프트에서 유도해야 한다. 짧은 `old_str`은 파일 내 중복 코드에서 잘못된 위치를 수정할 위험이 있다.

> [insight] `max_characters` 파라미터(`_20250728`)는 하네스의 대형 코드베이스 분석에서 토큰 예산 관리의 핵심이다. 10만 줄짜리 파일을 통째로 로드하면 컨텍스트 윈도우를 초과할 수 있으므로, 파일 크기에 따라 동적으로 `max_characters`를 설정하고 Claude가 `view_range`로 필요한 부분만 조회하도록 유도해야 한다.

> [insight] `undo_edit` 커맨드가 `_20250429`+에서 제거된 점 주목. 하네스에서 편집 실수에 대한 복구 메커니즘은 툴 내장 undo가 아니라, 애플리케이션 레벨의 백업 파일 생성 또는 git 체크포인팅으로 구현해야 한다.

> [insight] Text editor + bash + computer use 조합은 하네스의 완전한 데스크탑 자동화 스택이다. 파일 편집(text editor) → 실행·검증(bash) → GUI 조작(computer use)을 하나의 에이전트 루프에서 처리할 수 있다. 각 툴의 토큰 오버헤드(700 + 245 + 735 = ~1,680 토큰)를 합산해 요청 예산 계획에 포함해야 한다.
