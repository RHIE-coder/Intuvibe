# Tool Use — Overview

---

Claude가 외부 툴/API를 호출할 수 있게 하는 기능. Claude가 툴 호출 여부를 판단하고, 실제 실행은 클라이언트(개발자 코드) 또는 서버(Anthropic 인프라)가 담당.

---

## 1. 툴 실행 위치: Client vs Server

| 구분 | Client Tools | Server Tools |
|------|-------------|-------------|
| 실행 주체 | 개발자 애플리케이션 | Anthropic 인프라 |
| Claude 응답 | `stop_reason: "tool_use"` + `tool_use` block | 결과 직접 반환 |
| 예시 | 사용자 정의 함수, bash, text_editor | web_search, code_execution, web_fetch, tool_search |
| 추가 비용 | 없음 | 사용량 기반 (예: web_search는 검색당 과금) |

---

## 2. 기본 흐름 (Client Tools)

```
1. 개발자가 tools 파라미터로 툴 정의 전달
2. Claude가 필요 시 tool_use block 반환 (stop_reason: "tool_use")
3. 개발자 코드가 툴 실행
4. 결과를 tool_result로 Claude에 전달
5. Claude가 최종 응답 생성
```

서버 툴은 2~4단계가 Anthropic 인프라에서 자동 처리됨.

---

## 3. 비용 구조

툴 사용 시 추가 토큰 발생 원인:
- `tools` 파라미터 (툴 이름·설명·스키마)
- `tool_use` content block
- `tool_result` content block
- **자동 시스템 프롬프트** (툴 1개 이상 제공 시)

| 모델 | tool_choice: auto/none | tool_choice: any/tool |
|------|----------------------|----------------------|
| Opus 4.6 / Sonnet 4.6 등 최신 | **346 토큰** | **313 토큰** |
| Haiku 3.5 | 264 토큰 | 340 토큰 |

> `tools` 없이 `tool_choice: "none"` → 추가 시스템 프롬프트 토큰 0

---

## 4. strict: true 옵션

툴 정의에 `strict: true` 추가 시 Claude의 툴 호출이 스키마를 **정확히** 따르도록 강제. → 구조화된 출력이 필요한 에이전트에서 안정성 확보.

---

## 5. MCP 연결

MCP 서버 연결은 MCP connector 사용. 자체 MCP 클라이언트 구현은 modelcontextprotocol.io 참조.

---

> [insight] Client/Server 툴 구분은 하네스 아키텍처에서 중요하다. 하네스가 직접 실행·제어해야 하는 툴은 client tool로, 외부 서비스(웹 검색 등)는 server tool로 분리하면 실행 흐름이 명확해진다. 특히 server tool은 결과가 자동 반환되므로 에이전틱 루프 구현 복잡도가 줄어든다.

> [insight] 자동 시스템 프롬프트가 툴 1개 이상 제공 시 346토큰 추가된다. 하네스에서 툴 목록을 동적으로 관리할 때, 불필요한 툴을 제거하는 것이 단순히 토큰 절약 이상의 의미를 가진다 — 툴 설명·스키마 토큰 + 시스템 프롬프트 토큰이 복합적으로 쌓이기 때문이다.

> [insight] `strict: true` 툴 정의는 하네스의 툴 호출 결과 처리 레이어를 단순화한다. 스키마 위반 가능성을 제거하면 tool_result 파싱 시 예외 처리 로직을 줄일 수 있다. 단, structured outputs와의 복잡도 제한(최대 20개 strict 툴)을 함께 고려해야 한다.

> [insight] LAB-Bench, SWE-bench 기준으로 툴 추가가 "인간 전문가 수준 초과"의 능력 향상을 가져온다는 공식 언급이 있다. 하네스 설계에서 에이전트 기능 확장 시 파인튜닝보다 툴 추가가 더 효율적인 접근임을 시사한다.
