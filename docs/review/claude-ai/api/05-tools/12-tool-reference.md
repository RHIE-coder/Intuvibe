# Tool Reference

---

Anthropic 제공 툴 디렉토리 및 툴 정의의 선택적 속성 레퍼런스.

---

## 1. Anthropic 제공 툴 목록

### 서버 툴 (Anthropic 인프라 실행)

| 툴 | type | 상태 |
|----|------|------|
| Web Search | `web_search_20260209` / `web_search_20250305` | GA |
| Web Fetch | `web_fetch_20260209` / `web_fetch_20250910` | GA |
| Code Execution | `code_execution_20260120` / `code_execution_20250825` | GA |
| Tool Search | `tool_search_tool_regex_20251119` / `tool_search_tool_bm25_20251119` | GA |
| MCP Connector | `mcp_toolset` | Beta: `mcp-client-2025-11-20` |

### 클라이언트 툴 (개발자 코드 실행, Anthropic 스키마)

| 툴 | type | 상태 |
|----|------|------|
| Memory | `memory_20250818` | GA |
| Bash | `bash_20250124` | GA |
| Text Editor | `text_editor_20250728` (Claude 4) / `text_editor_20250124` (이전 모델) | GA |
| Computer Use | `computer_20251124` / `computer_20250124` | Beta |

---

## 2. 툴 버전 관계 유형

| 유형 | 설명 | 예시 |
|------|------|------|
| 기능 추가 | 신·구 버전 모두 현역, 필요 기능에 따라 선택 | `web_search_20260209` (동적 필터) vs `_20250305` |
| 모델 종속 | 타겟 모델에 따라 버전 선택 | `text_editor_20250728` (Claude 4) vs `_20250124` |
| 알고리즘 변형 | 둘 다 현역, 선호 알고리즘 선택 | regex vs bm25 tool search |
| 구버전 | 기능 제한된 레거시 | `code_execution_20250522` (Python만) |

> `tool_search_tool_regex` / `tool_search_tool_bm25` (날짜 없는 별칭) → 최신 dated 버전으로 자동 해석

---

## 3. 툴 정의 선택적 속성

모든 툴(사용자 정의 포함)에 조합 사용 가능:

| 속성 | 용도 | 사용 가능 대상 |
|------|------|--------------|
| `cache_control` | 이 툴 위치에 프롬프트 캐시 브레이크포인트 | 모든 툴 |
| `strict` | 툴 이름·입력의 스키마 검증 보장 | mcp_toolset 제외 모든 툴 |
| `defer_loading` | 초기 시스템 프롬프트에서 제외, tool_search 발견 시 로드 | 모든 툴 |
| `allowed_callers` | 호출 가능 주체 제한 | mcp_toolset 제외 모든 툴 |
| `input_examples` | 툴 사용 예시 제공 | 사용자 정의 + Anthropic 스키마 클라이언트 툴 (서버 툴 불가) |
| `eager_input_streaming` | 세밀한 입력 스트리밍 활성화 | 사용자 정의 툴만 |

---

## 4. allowed_callers 값

```json
{"allowed_callers": ["direct", "code_execution_20260120"]}
```

| 값 | 의미 |
|----|------|
| `"direct"` | 모델이 직접 `tool_use` block으로 호출 (기본값) |
| `"code_execution_20260120"` | 코드 실행 샌드박스 내부 코드에서만 호출 가능 |

`"direct"` 생략 시 → 코드 실행에서만 호출 가능한 툴 (프로그래매틱 툴 호출).

---

## 5. defer_loading과 캐시 보존

`defer_loading: true` 툴은:
- 캐시 키 계산 전 시스템 프롬프트 렌더링에서 제거
- tool_search 발견 시 `tool_reference` block으로 대화 본문에 인라인 삽입
- **기존 캐시 무효화 없이** 새 툴 추가 가능
- 발견 턴 + 호출 턴 모두 캐시 유효 유지

---

> [insight] 툴 버전 전략이 "기능 추가형", "모델 종속형", "알고리즘 변형형", "레거시"로 구분된다는 점은 하네스의 툴 버전 관리 정책 설계에 중요하다. 단순히 최신 버전을 항상 쓰는 것이 아니라, 각 사용 시나리오(ZDR 필요 여부, 대상 모델, 필요 기능)에 따라 적합한 버전을 선택하는 로직이 필요하다.

> [insight] `allowed_callers: ["code_execution_20260120"]`만 설정하면 Claude가 직접 호출 불가하고 샌드박스 코드에서만 호출 가능한 툴을 만들 수 있다. 하네스에서 위험한 작업(파일 삭제, DB 수정)을 수행하는 툴을 Claude가 직접 호출하지 못하게 하고, 사용자가 승인한 코드를 통해서만 실행되도록 강제하는 보안 아키텍처에 활용 가능하다.

> [insight] `eager_input_streaming`은 사용자 정의 툴에만 적용 가능하다. 장시간 실행 툴에서 입력 파라미터를 스트리밍으로 미리 받아 실행을 조기 시작할 수 있어 레이턴시를 줄인다. 하네스에서 대형 코드 생성, 검색 쿼리 생성 등 입력 파라미터가 길어질 수 있는 툴에 적용 가능하다.

> [insight] `mcp_toolset`은 `strict`, `allowed_callers`, `input_examples`를 지원하지 않는다. 하네스가 MCP 연결을 사용할 경우, MCP 툴의 검증은 클라이언트 레이어에서 별도로 처리해야 한다.
