# Agent Loop

---

SDK 에이전트 루프의 메시지 생명주기, 툴 실행, 컨텍스트 관리 상세.

---

## 1. 루프 사이클

1. 프롬프트 수신 → `SystemMessage(subtype="init")` 방출
2. Claude 평가 → `AssistantMessage` (텍스트 + 툴 호출 블록) 방출
3. 툴 실행 → `UserMessage` (툴 결과) 방출
4. 2-3 반복 (턴)
5. 툴 호출 없는 최종 응답 → `ResultMessage` 방출

---

## 2. 메시지 타입

| 타입 | 내용 |
|------|------|
| `SystemMessage` | `init` (세션 메타, session_id 포함), `compact_boundary` |
| `AssistantMessage` | Claude 응답 (텍스트 + 툴 호출 블록) |
| `UserMessage` | 툴 실행 결과 |
| `StreamEvent` | partial messages 활성화 시 스트리밍 델타 |
| `ResultMessage` | 최종 결과 + cost + usage + session_id |

**TypeScript**: `message.message.content`로 접근 (`.content` 직접 아님). `compact_boundary`는 별도 `SDKCompactBoundaryMessage` 타입.

---

## 3. ResultMessage subtype

| subtype | 의미 | `result` 필드 |
|---------|------|:---:|
| `success` | 정상 완료 | ✅ |
| `error_max_turns` | maxTurns 한도 초과 | ❌ |
| `error_max_budget_usd` | 비용 한도 초과 | ❌ |
| `error_during_execution` | API 실패 등 중단 | ❌ |
| `error_max_structured_output_retries` | 구조화 출력 검증 실패 | ❌ |

`stop_reason`: `end_turn`, `max_tokens`, `refusal` 등. 모든 subtype에 `total_cost_usd`, `usage`, `num_turns`, `session_id` 포함.

---

## 4. 루프 제어 옵션

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `max_turns` | 무제한 | 툴 사용 턴 최대 수 |
| `max_budget_usd` | 무제한 | 비용 상한 |
| `effort` | 모델 기본 | `low`/`medium`/`high`/`max` |
| `model` | SDK 기본 | 명시적 모델 ID |

**effort vs Extended Thinking**: 독립적. `effort="low"` + Extended Thinking 동시 사용 가능.

---

## 5. 툴 실행

- **병렬 실행**: 읽기 전용 툴(`Read`, `Glob`, `Grep`, 읽기 전용 MCP) → 병렬
- **순차 실행**: 상태 변경 툴(`Edit`, `Write`, `Bash`) → 순차
- 커스텀 툴 기본: 순차. `readOnly`/`readOnlyHint` 설정 시 병렬 가능

---

## 6. 컨텍스트 관리

| 소스 | 로딩 시점 | 영향 |
|------|---------|------|
| 시스템 프롬프트 | 매 요청 | 소규모 고정 비용 |
| CLAUDE.md | 세션 시작 (settingSources 활성화 시) | 전체 내용, prompt cache됨 |
| 툴 정의 | 매 요청 | 툴마다 스키마 추가 |
| 대화 히스토리 | 턴마다 누적 | 가장 큰 증가 요인 |
| Skill 설명 | 세션 시작 | 짧은 요약만, 호출 시 본문 로딩 |

### 자동 Compaction
컨텍스트 한도 근접 시 자동 요약. `compact_boundary` 메시지 방출. 초기 프롬프트 지시문은 CLAUDE.md에 넣어야 compaction 후에도 유지.

**커스텀**: CLAUDE.md에 `# Summary instructions` 섹션 추가, `PreCompact` 훅, `/compact` 수동 트리거.

---

## 7. 컨텍스트 효율화 전략

- 서브에이전트: 별도 fresh 컨텍스트로 실행, 최종 결과만 부모에 반환
- MCP 서버 최소화: 각 서버의 모든 툴 스키마가 매 요청에 포함
- `ToolSearch` 온디맨드 로딩으로 사전 로딩 툴 최소화
- 단순 작업에 `effort="low"` 설정

---

## 8. 주요 훅

| 훅 | 발화 시점 | 용도 |
|----|---------|------|
| `PreToolUse` | 툴 실행 전 | 입력 검증, 위험 명령 차단 |
| `PostToolUse` | 툴 반환 후 | 감사 로그, 사이드 이펙트 |
| `UserPromptSubmit` | 프롬프트 전송 시 | 추가 컨텍스트 주입 |
| `Stop` | 에이전트 완료 시 | 결과 검증, 세션 저장 |
| `PreCompact` | Compaction 전 | 전체 트랜스크립트 아카이브 |

훅은 애플리케이션 프로세스에서 실행 → 컨텍스트 소비 없음. `PreToolUse`가 거부 반환 시 툴 실행 차단.

---

> [insight] `ResultMessage.subtype`의 `error_max_turns` 처리 패턴은 하네스의 비용 제어에서 핵심이다. 턴 한도에 도달했을 때 `session_id`를 저장해 사용자에게 "계속할까요?" 옵션을 제공하거나, 자동으로 `max_turns`를 높여 재개하는 패턴은 무한 실행을 방지하면서 작업 완료를 보장하는 균형 설계다.

> [insight] CLAUDE.md에 `# Summary instructions` 섹션을 추가하는 패턴은 하네스의 장기 에이전트에서 중요하다. Compaction 후에도 특정 정보(현재 태스크 목표, 수정된 파일 경로, 핵심 결정)를 보존하려면 초기 프롬프트가 아닌 CLAUDE.md에 지시문을 넣어야 한다. 하네스에서 에이전트별 CLAUDE.md 템플릿을 설계할 때 이 섹션을 표준으로 포함해야 한다.

> [insight] 서브에이전트의 "fresh 컨텍스트 + 결과만 부모에 반환" 구조는 하네스의 멀티에이전트 파이프라인 설계의 핵심 원칙이다. 큰 작업을 서브에이전트로 분리하면 부모 에이전트의 컨텍스트는 서브에이전트의 전체 트랜스크립트가 아닌 최종 요약만 받는다. 이는 긴 병렬 작업을 수행하는 하네스 플러그인들이 컨텍스트 윈도우를 폭발시키지 않고 협력할 수 있는 구조적 기반이다.
