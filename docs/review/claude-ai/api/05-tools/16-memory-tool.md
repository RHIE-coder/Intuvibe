# Memory Tool

---

대화 간 정보를 파일로 저장·검색하는 클라이언트 툴. `/memories` 디렉토리를 통해 세션 간 지식을 축적.

- 타입: `memory_20250818` (클라이언트 툴)
- ZDR: ✅ 지원
- 저장소 제어: 개발자가 직접 구현 (파일, DB, 클라우드 스토리지 등)

---

## 1. 핵심 개념

**저스트-인-타임 컨텍스트 검색**: 관련 정보를 시작 시 모두 로드하지 않고, 필요 시점에만 꺼내 읽는 패턴. 장기 실행 워크플로우에서 컨텍스트 윈도우를 효율적으로 관리.

**동작 방식**:
1. 태스크 시작 전 자동으로 `/memories` 디렉토리 확인
2. 작업 중 학습한 내용을 파일로 저장
3. 다음 세션에서 메모리를 읽어 이전 상태 복원

**클라이언트 사이드**: Claude가 tool_use 블록으로 호출 → 개발자 앱이 실제 파일 I/O 실행.

---

## 2. 툴 정의

```json
{"type": "memory_20250818", "name": "memory"}
```

SDK 헬퍼:
- Python: `BetaAbstractMemoryTool` 서브클래스
- TypeScript: `betaMemoryTool`

---

## 3. 툴 커맨드

| 커맨드 | 설명 | 필수 파라미터 |
|--------|------|-------------|
| `view` | 디렉토리 목록 또는 파일 내용 | `path` (+`view_range` 선택) |
| `create` | 새 파일 생성 | `path`, `file_text` |
| `str_replace` | 텍스트 교체 | `path`, `old_str`, `new_str` |
| `insert` | 특정 줄에 텍스트 삽입 | `path`, `insert_line`, `insert_text` |
| `delete` | 파일/디렉토리 삭제 (재귀) | `path` |
| `rename` | 파일/디렉토리 이동·이름 변경 | `old_path`, `new_path` |

### view 응답 형식

디렉토리:
```text
Here're the files and directories up to 2 levels deep in {path}, excluding hidden items and node_modules:
{size}    {path}
```

파일 (줄 번호 포함, 6자리 오른쪽 정렬):
```text
Here's the content of {path} with line numbers:
     1	Hello World
```

---

## 4. 자동 시스템 프롬프트

메모리 툴 활성화 시 자동 주입:

```text
IMPORTANT: ALWAYS VIEW YOUR MEMORY DIRECTORY BEFORE DOING ANYTHING ELSE.
MEMORY PROTOCOL:
1. Use the `view` command of your `memory` tool to check for earlier progress.
2. ... (work on the task) ...
   - As you make progress, record status / progress / thoughts etc in your memory.
ASSUME INTERRUPTION: Your context window might be reset at any moment...
```

---

## 5. 보안 주의사항

| 위협 | 대응 |
|------|------|
| 경로 탐색 공격 (`../`) | 모든 경로가 `/memories`로 시작하는지 검증 |
| URL 인코딩 우회 (`%2e%2e%2f`) | 정규화 후 검증 (`pathlib.Path.resolve()`) |
| 민감 정보 저장 | Claude가 거부하나 추가 검증 레이어 권장 |
| 파일 크기 폭주 | 최대 크기 제한 + 페이지네이션 구현 |
| 오래된 메모리 | 주기적 만료 정책 적용 |

---

## 6. 멀티세션 소프트웨어 개발 패턴

1. **초기화 세션**: 진행 로그 + 기능 체크리스트 + 시작 스크립트 설정
2. **후속 세션**: 메모리 읽어 전체 프로젝트 상태 수 초 안에 복원
3. **세션 종료 전**: 진행 로그 업데이트 (완료/잔여 항목)

**핵심 원칙**: 한 번에 하나의 기능. 코드 작성 후가 아니라 E2E 검증 후 완료 표시.

---

## 7. Compaction 연계

- **Context Editing**: 특정 tool_result를 클라이언트에서 수동 제거
- **Compaction**: 서버 측 자동 요약 (컨텍스트 윈도우 임박 시)
- **조합 패턴**: Compaction이 활성 컨텍스트를 관리 + 메모리가 compaction 경계를 넘어 정보 지속

---

> [insight] 메모리 툴의 "저스트-인-타임 컨텍스트 검색" 패턴은 하네스 설계의 핵심이다. 플러그인 마켓플레이스에서 각 에이전트가 이전 실행 컨텍스트(사용자 선호도, 진행 상황, 설정)를 `/memories`에 저장하고 재사용하면, 매 실행마다 사용자에게 동일한 질문을 반복하지 않아도 된다.

> [insight] 클라이언트 사이드 구현이라는 특성은 하네스에서 스토리지 백엔드를 자유롭게 선택할 수 있음을 의미한다. 단순 파일 시스템 외에도 SQLite, Redis, 암호화 파일 스토리지 등 사용 사례에 맞는 백엔드를 `BetaAbstractMemoryTool` 서브클래스로 구현 가능하다.

> [insight] 경로 탐색 공격 방어는 하네스 보안 체크리스트에서 필수 항목이다. 사용자 입력이 메모리 경로에 포함될 수 있는 경우, Python `pathlib.Path.resolve().relative_to('/memories')` 패턴으로 모든 경로를 검증해야 한다.

> [insight] 메모리 툴 + Compaction 조합은 하네스의 장기 에이전트 실행 아키텍처다. Compaction이 대화 컨텍스트를 서버에서 자동 요약하는 동안, 메모리 파일이 요약으로도 잃어선 안 될 정보(사용자 선호, 완료된 태스크 목록, 중간 결과물)를 보존한다.

> [insight] 자동 주입되는 시스템 프롬프트(`ALWAYS VIEW YOUR MEMORY DIRECTORY`)는 하네스가 별도 프롬프트 엔지니어링 없이도 에이전트가 일관되게 메모리를 확인하도록 강제한다는 점에서 중요하다. 단, 이 시스템 프롬프트가 개발자 시스템 프롬프트와 합산되어 토큰을 소모하므로 컨텍스트 예산 계획 시 포함해야 한다.
