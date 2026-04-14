# API 문서 큐레이션: 에이전트 아키텍트 설계용

---

> **목적**: `review/api/` 105개 문서 중 Claude API를 직접 사용하지 않는 하네스 엔지니어링 관점에서 에이전트 설계에 유효한 27개 문서의 핵심 내용을 추출·정리한다.
>
> **제외 기준**: 순수 API 구현 상세(SDK 코드, 엔드포인트, 파라미터 형식), 플랫폼별 설정(Bedrock/Vertex/Azure), 관리자 API, 개별 툴 구현 상세는 제외.

---

## 0. 하네스 빌딩 블록과 조합 패턴

> API 문서의 툴 조합(web_search + code_execution 등)은 API 레벨 패턴. 하네스에서 실제로 조합하는 단위는 아래와 같다.

### 빌딩 블록

| 블록 | 역할 | 컨텍스트 비용 |
|------|------|-------------|
| **Built-in Tools** | Read/Edit/Bash/Grep/Glob/Agent 등 (이미 제공됨) | 항상 포함 |
| **Skills** | 워크플로우 + 검증 스크립트 | L1: ~100t, L2: 트리거 시 5k, L3: 0 |
| **Hooks** | 라이프사이클 콜백 (컨텍스트 미소비) | 0 |
| **Subagent 정의** | 툴 제한 + 전용 프롬프트 + 모델 선택 | 별도 컨텍스트 |
| **MCP Servers** | 외부 도구 연결 | 서버별 툴 스키마 추가 |
| **Slash Commands** | 사용자 진입점 | 트리거 시에만 |

### 조합 패턴

#### A. Skill + Hook (검증 파이프라인)
```
Skill: plan-validate-execute 워크플로우 스크립트
Hook(PostToolUse): Edit/Write 후 스크립트로 출력 검증
```
구조화된 출력이 필요한 작업. SDK 없이 format 안전성 확보.

#### B. Subagent + 툴 제한 (역할 분리)
```
Subagent "explore": Read, Grep, Glob만 (읽기 전용, haiku)
Subagent "implement": Read, Edit, Write, Bash (수정 가능)
```
탐색과 실행을 분리. explore는 haiku로 비용 절감.

#### C. Skill + MCP (외부 연동)
```
Skill: 워크플로우 지시문 + 데이터 처리 스크립트
MCP: 외부 서비스 접근 (DB, Slack, Telegram 등)
```
외부 데이터 수집 → Skill 스크립트로 가공.

#### D. Hook + Hook (가드레일 체인)
```
Hook(PreToolUse): 위험 명령 차단 (rm -rf, force push 등)
Hook(PostToolUse): 감사 로그 기록
Hook(Stop): 최종 결과 검증
```
플랫폼 레벨 안전장치. 모든 작업에 투명하게 적용.

#### E. Slash Command → Skill → Subagent (전체 파이프라인)
```
/review → Skill 트리거 → Subagent(explore, read-only)로 분석 → 결과 검증 스크립트
```
사용자 진입점부터 검증까지 일관된 흐름.

### API 문서 툴 조합 → 하네스 대응

| API 문서 패턴 | 하네스 대응 |
|-------------|-----------|
| web_search + code_execution | MCP(외부) + Skill(스크립트) |
| text_editor + bash | Built-in (이미 있음) + Hook(검증) |
| memory + 기타 | CLAUDE.md + Skill(상태 파일 관리) |
| tool_search (20개+ 관리) | Skill의 progressive disclosure (L1 메타데이터만 상주) |

> **핵심 조합 단위는 Skill + Hook**. 규모가 커지면 **Subagent로 컨텍스트 격리**, 외부 연동은 **MCP**를 붙이는 구조.

---

## I. 프롬프트 설계 원칙

### 출처: `03-build-with-claude/04-prompting-best-practices.md`

#### 일반 원칙
- Claude = "맥락 없는 신입 천재". 구체적으로 설명할수록 결과 향상
- **동기/맥락 제공**: Claude가 이유를 알면 일반화 가능. "NEVER use ellipses" → "TTS can't pronounce them" 이런 식으로 why 포함
- **예시(Few-shot)**: 3-5개 권장. `<example>` 태그로 감싸기
- **XML 태그 구조화**: `<instructions>`, `<context>`, `<input>` 등으로 혼합 콘텐츠 분리
- **역할 부여**: 시스템 프롬프트 한 문장으로도 효과적
- **Long context (20K+)**: 긴 데이터를 상단에 배치, 쿼리를 끝에 → 응답 품질 최대 30% 향상

#### Claude 4.6 스타일 특성
- 이전 모델 대비 더 간결, 더 직접적, 덜 장황
- tool_result 후 요약 없이 다음 행동으로 직행 (기본 동작)
- 요약 원하면 명시: `"After completing a task with tool use, provide a quick summary."`

#### 도구 사용 프롬프트
- 시스템 프롬프트에 `<default_to_action>` 블록으로 기본 행동 모드 설정
- **과다 트리거 주의**: Opus 4.6는 시스템 프롬프트에 민감. "CRITICAL: You MUST use this tool" → "Use this tool when..."으로 완화
- `<use_parallel_tool_calls>` 블록으로 병렬 호출 ~100% 달성. 의존성 있는 호출은 순차 실행 명시

#### 사고(Thinking) 제어
- Opus 4.6는 이전 모델보다 탐색이 과도함. 제어 방법:
  - "Default to using [tool]" → "Use [tool] when it would enhance understanding"
  - effort 낮추기
  - "Choose an approach and commit to it. Avoid revisiting decisions."
- 일반 지시 > 처방적 단계: "think thoroughly" > 수작업 step-by-step
- 자기 검증: "Before you finish, verify your answer against [test criteria]"

#### 에이전틱 시스템 설계
- **컨텍스트 인식**: 하네스에서 compact/저장 가능하면 프롬프트에 명시
  ```
  Your context window will be automatically compacted.
  Do not stop tasks early due to token budget concerns.
  Save progress to memory before context refresh.
  ```
- **다중 컨텍스트 윈도우 워크플로**:
  1. 첫 윈도우 = 프레임워크 설정 (테스트, 셋업). 이후 = todo-list 반복
  2. 구조화된 테스트 파일 (`tests.json`) — 테스트 제거/수정 금지 강조
  3. QoL 도구 (`init.sh`) — 서버, 테스트, 린터 자동 시작
  4. **Fresh start > compaction**: 파일시스템에서 상태 재발견이 compaction보다 나을 수 있음
  5. 검증 도구 제공 (Playwright, computer use)
- **자율성 vs 안전성 균형**:
  ```
  Consider reversibility and impact. Take local, reversible actions freely.
  For hard-to-reverse or shared-system actions, ask before proceeding.
  ```
- **서브에이전트 오케스트레이션**: Opus 4.6는 서브에이전트를 과다 생성하는 경향
  ```
  Use subagents for parallel tasks, isolated context, independent workstreams.
  For simple tasks, single-file edits, work directly.
  ```
- **할루시네이션 최소화**:
  ```xml
  <investigate_before_answering>
  Never speculate about code you have not opened.
  Read relevant files BEFORE answering questions about the codebase.
  </investigate_before_answering>
  ```
- **과잉 엔지니어링 방지**:
  ```
  Avoid over-engineering. Only make changes directly requested.
  Don't add features, refactor, or add abstractions beyond what was asked.
  ```

---

### 출처: `13-prompt-engineering/01-overview.md`, `02-prompting-tools.md`

#### 프롬프트 엔지니어링 프로세스
- **선행 조건 3가지**: 성공 기준 정의 → 평가 방법 확보 → 첫 번째 초안 프롬프트
- 레이턴시/비용 최적화는 프롬프트가 아닌 모델 선택 문제일 수 있음

#### 프롬프트 템플릿
- **고정 콘텐츠** (시스템 프롬프트) + **변수 콘텐츠** (사용자 입력, RAG 결과)
- `{{double brackets}}` 변수 표기 → XML 태그로 감싸면 구조 명확
- 이점: 일관성, 효율성, 테스트 가능성, 버전 관리

---

## II. 모델 역량 — 하네스 설계에 유효한 부분만

### 출처: `04-model-capabilities/01-extended-thinking.md`, `02-adaptive-thinking.md`, `03-effort.md`

> Thinking 모드(adaptive/manual/disabled), thinking 블록 관리(signature, interleaved, display), 과금 구조 등은 Claude Code가 내부에서 자동 처리. 하네스에서 직접 제어하는 옵션이 아니므로 상세 생략.

#### 하네스에서 알아야 할 것: 비용 인식
- thinking 토큰은 요약/생략 여부와 무관하게 **전량 과금** — 응답에 보이는 토큰 ≠ 과금 토큰
- 복잡한 태스크일수록 thinking 토큰이 급증 → 비용 예측 시 고려
- Claude Code `/fast` 모드는 effort를 낮춰 thinking을 줄이는 효과

#### 하네스에서 알아야 할 것: Effort와 서브에이전트 모델 선택
- effort(`low`/`medium`/`high`/`max`)는 텍스트·툴 호출·thinking 모두에 적용
- **낮은 effort = 툴 호출 수 자체도 감소** → 서브에이전트에 `model: "haiku"` 또는 낮은 effort 지정 시 자연스러운 비용 제어
- Claude Code에서 서브에이전트 모델을 `sonnet`/`haiku`로 지정하는 것이 effort 제어의 실질적 수단

---

### 출처: `04-model-capabilities/05-structured-outputs.md`

#### 에이전트 출력 스키마 설계 원칙

> API constrained decoding(`output_config.format`)은 SDK 코드 필수. Claude Code 하네스에서는 Skills의 스크립트 검증 + Hooks 후처리로 동등한 안전성 확보 가능.

- **Optional 파라미터 최소화**: optional 1개 = 복잡도 2배. 필요한 것만 optional, 나머지 required
- **복잡한 출력은 분리**: 한 에이전트에 복잡한 스키마 전부 → 여러 단계/서브에이전트로 분할
- **Recursive 스키마 불가**: 자기 참조 구조는 평탄화 필요
- **Prefill 미지원** (Opus 4.6, Sonnet 4.6): 출력 포맷 강제는 명시적 지시 + 검증 스크립트 조합으로 대체

---

## III. 도구 아키텍처

### 출처: `05-tools/01-overview.md`, `02-how-tool-use-works.md`

#### 도구 실행 3 버킷
| 구분 | 실행 주체 | 예시 |
|------|---------|------|
| User-defined (클라이언트) | 개발자 코드 | 사용자 정의 함수 |
| Anthropic-schema (클라이언트) | 개발자 코드 | `bash`, `text_editor`, `computer`, `memory` |
| Server-executed (서버) | Anthropic 인프라 | `web_search`, `code_execution`, `web_fetch` |

- **Anthropic-schema 우선**: 수천 번의 성공 궤적으로 훈련됨 → 더 안정적 호출, 더 나은 에러 복구
- **핵심 원칙**: "regex로 모델 출력을 파싱하고 있다면 그 결정은 tool call이었어야 한다"

#### 에이전틱 루프 stop_reason 전체 처리
| stop_reason | 의미 | 처리 |
|-------------|------|------|
| `end_turn` | 정상 완료 | 결과 반환 |
| `tool_use` | 툴 호출 필요 | 실행 후 tool_result 전달 |
| `max_tokens` | 토큰 초과 | max_tokens 증가 또는 종료 |
| `stop_sequence` | 정지 시퀀스 | 상황별 처리 |
| `refusal` | 거절 | 프롬프트 조정 |
| `pause_turn` | 서버 툴 일시중단 | 대화 재전송으로 이어서 계속 |
| `compaction` | 요약 완료 | 추가 콘텐츠 주입 후 계속 |

#### 비용 구조
- 툴 1개 이상 제공 시 자동 시스템 프롬프트 **346 토큰** 추가
- 툴 정의(이름·설명·스키마) + tool_use/tool_result 블록이 복합적으로 쌓임

---

### 출처: `05-tools/03-tutorial-agent.md`

#### 에이전트 구현 5단계 (5 Rings)
1. **단일 툴, 단일 턴**: tool_use block 찾기 → 실행 → tool_result 반환
2. **에이전틱 루프**: `while stop_reason == "tool_use"` 대화 히스토리 누적
3. **멀티 툴 + 병렬 호출**: 모든 tool_use를 **하나의 user 메시지로 일괄 반환**
4. **에러 처리**: `is_error: true` 플래그 → Claude가 에러 이해 후 재시도/우회/안내 선택
5. **SDK 추상화**: `@beta_tool` 데코레이터 + 타입힌트·docstring → 스키마 자동 생성

- **`is_error: true` 패턴**: 툴 실패 시 즉시 예외 대신 Claude에게 에러 위임 → 더 강인한 에이전트

---

### 출처: `06-tool-infrastructure/01-manage-tool-context.md`

#### 컨텍스트 관리 4가지 접근법
| 접근법 | 줄이는 대상 | 적합한 상황 |
|--------|-----------|-----------|
| Tool search | 업프론트 툴 정의 토큰 | 툴 20개 이상 |
| Programmatic tool calling | tool_result 라운드트립 | 연속 호출을 단일 스크립트로 |
| Prompt caching | 반복 툴 정의 비용 | 안정적 툴셋 대량 요청 |
| Context editing | 오래된 tool_result | 긴 대화 초반 결과 불필요 |

#### 적용 순서 (장기 에이전트)
1. **즉시**: 프롬프트 캐싱 (캐시 쓰기 25% 추가, 두 번째 요청부터 회수)
2. **툴 20개 초과 시**: Tool search 추가
3. **대화 길어질 때**: Context editing 추가
4. **반복 소형 호출 체인**: Programmatic tool calling

---

### 출처: `06-tool-infrastructure/02-tool-combinations.md`

#### 에이전트 유형별 표준 툴 조합
| 에이전트 유형 | 툴 구성 |
|-------------|---------|
| 리서치 | web_search + code_execution |
| 코딩 | text_editor + bash |
| 인용 리서치 | web_search + web_fetch |
| 장기 실행 | memory + 기타 (memory는 직교적, 어떤 조합에도 추가 가능) |
| 데스크탑 자동화 | computer_use (가장 범용, 가장 느림) |

---

## IV. 컨텍스트 관리

### 출처: `07-context-management/01-context-windows.md`

#### 컨텍스트 윈도우 핵심
- Opus 4.6, Sonnet 4.6 = **1M 토큰**
- **Context rot**: 컨텍스트를 최대한 채우는 것이 목표가 아님 — 현재 태스크 관련 정보만 유지
- **Sonnet 3.7+**: 컨텍스트 초과 시 자동 절단 대신 **검증 에러 반환** → 토큰 카운팅 필수화

#### Context Awareness (Sonnet 4.6, 4.5, Haiku 4.5)
- 모델이 남은 토큰 예산을 실시간 인식
- `<budget:token_budget>1000000</budget:token_budget>` → 매 툴 호출 후 자동 업데이트
- "컨텍스트 부족 시 작업 중단하라" 시스템 프롬프트 없이도 자연스러운 효율적 사용

#### Extended Thinking + Tool Use 제약
- tool_choice: `auto` 또는 `none`만 (thinking 활성화 시)
- tool use 루프 전체 = 하나의 assistant 턴
- thinking 블록 보존 필수 (턴 내 tool_result 반환 시)

---

### 출처: `07-context-management/02-compaction.md`

#### Compaction (서버 사이드 자동 요약)
- 입력 토큰이 트리거 임계값 초과 시 자동 요약 생성
- **최소 통합 코드**: 응답을 messages에 그대로 append만 하면 됨
- compaction 블록 이전 메시지는 API가 자동 무시

#### 커스텀 요약 지시문
- `instructions` 파라미터로 기본 프롬프트 완전 대체
- 코딩 에이전트: "코드 스니펫과 변수명 보존"
- 리서치 에이전트: "핵심 발견 사항과 출처 보존"

#### 비용 제어 패턴
```python
if n_compactions * TRIGGER_THRESHOLD >= TOTAL_TOKEN_BUDGET:
    messages.append({"role": "user", "content": "Please wrap up and summarize the final state."})
```

---

### 출처: `07-context-management/03-context-editing.md`

#### 세밀한 컨텍스트 편집
| 전략 | 용도 |
|------|------|
| Tool result clearing | 오래된 tool_result 자동 제거, placeholder 삽입 |
| Thinking block clearing | Extended Thinking 블록 관리 |

#### 핵심 파라미터
- `keep`: 최근 N개 tool_use 보존
- `clear_at_least`: 최소 제거 토큰 (캐시 무효화 비용 대비 가치 확보)
- `exclude_tools`: 항상 보존해야 하는 인용 정보 (web_search 등) 보호

---

## V. Skills 아키텍처

### 출처: `09-agent-skills/01-overview.md`, `03-best-practices.md`

#### Progressive Disclosure 3단계
| 레벨 | 토큰 비용 | 내용 |
|------|---------|------|
| L1: 메타데이터 | ~100 tokens/Skill | YAML frontmatter (항상 로딩) |
| L2: 지시문 | 5k 이하 | SKILL.md 본문 (트리거 시) |
| L3: 리소스/코드 | 컨텍스트 미소비 | 실행만, 출력만 컨텍스트에 |

- **핵심**: 100개 Skills 설치해도 메타데이터 10,000 토큰. 툴 정의와 달리 대규모 생태계 유지 가능

#### Skills 설계 원칙
- **"Claude는 이미 똑똑하다"**: Claude가 모르는 것만 추가, 각 정보가 토큰 비용 정당화하는지 검토
- SKILL.md 본문 **500줄 이하** 유지
- **자유도 3단계**: 높음(텍스트 지시) → 중간(의사코드) → 낮음(정확한 스크립트, 수정 금지)
- **plan-validate-execute 패턴**: 중간 JSON 플랜 생성 → 스크립트 검증 → 실행 (배치·파괴적 작업 필수)

#### Description 작성
- 3인칭 작성 (시스템 프롬프트 주입되므로)
- what + when 모두 포함
- 구체적 키워드 포함 (100+ Skills 중 선택 기준)

#### 반복 개선 방법
- Claude A (설계) → Claude B (신선한 인스턴스 실사용 테스트) 사이클
- **평가 먼저**: Skill 작성 전 평가 시나리오 3개 정의

---

## VI. Agent SDK 아키텍처

### 출처: `10-agent-sdk/01-overview.md`, `03-agent-loop.md`

#### Agent SDK vs Client SDK
| 항목 | Client SDK | Agent SDK |
|------|-----------|-----------|
| 툴 루프 | 직접 구현 | 자동 처리 |
| 내장 툴 | 없음 | Read/Write/Edit/Bash/Glob/Grep/WebSearch 등 |
| 인터페이스 | `client.messages.create()` | `query()` 스트리밍 |

#### 에이전트 루프 사이클
1. 프롬프트 수신 → `SystemMessage(init)` (session_id 포함)
2. Claude 평가 → `AssistantMessage` (텍스트 + 툴 호출)
3. 툴 실행 → `UserMessage` (결과)
4. 2-3 반복
5. 최종 응답 → `ResultMessage` (cost, usage, session_id)

#### 툴 실행 병렬/순차
- **병렬**: 읽기 전용 (Read, Glob, Grep, 읽기 전용 MCP)
- **순차**: 상태 변경 (Edit, Write, Bash)

#### 루프 제어
| 옵션 | 설명 |
|------|------|
| `max_turns` | 툴 사용 턴 최대 수 |
| `max_budget_usd` | 비용 상한 |
| `effort` | low/medium/high/max |

#### 컨텍스트 효율화
- 서브에이전트: fresh 컨텍스트, 결과만 부모에 반환
- MCP 서버 최소화: 각 서버의 모든 툴 스키마가 매 요청에 포함
- ToolSearch 온디맨드 로딩
- CLAUDE.md에 `# Summary instructions` → compaction 후에도 핵심 지시 보존

#### 핵심 Hooks
| 훅 | 용도 |
|----|------|
| `PreToolUse` | 입력 검증, 위험 명령 차단 |
| `PostToolUse` | 감사 로그, 사이드 이펙트 |
| `UserPromptSubmit` | 추가 컨텍스트 주입 |
| `Stop` | 결과 검증, 세션 저장 |
| `PreCompact` | 전체 트랜스크립트 아카이브 |

---

### 출처: `10-agent-sdk/18-system-prompts.md`

#### 시스템 프롬프트 설정 4가지
| 방법 | 기본 툴 유지 | 커스터마이징 |
|------|-----------|-----------|
| CLAUDE.md | ✅ | 추가만 가능 |
| Output Styles | ✅ | 기본값 대체 |
| preset + append | ✅ | 추가만 가능 |
| Custom 문자열 | ❌ (직접 포함) | 완전 제어 |

- **권장**: `preset: "claude_code"` + `append` — 기본 툴/안전 지침 상속 + 도메인 특화 추가
- **함정**: `setting_sources=["project"]` 없이는 CLAUDE.md가 로딩되지 않음

---

### 출처: `10-agent-sdk/19-subagents.md`

#### 서브에이전트 설계
- 컨텍스트 격리: 부모 대화 히스토리/툴 결과 미상속, 최종 메시지만 부모에 전달
- 자체 서브에이전트 스폰 불가 (`Agent` 툴 미포함)
- 동적 `AgentDefinition` 팩토리 — 런타임 설정(모델, 툴 제한, 프롬프트)을 중앙 관리

#### 컨텍스트 상속 규칙
| 받는 것 | 받지 못하는 것 |
|---------|-------------|
| 자체 시스템 프롬프트 | 부모 대화 히스토리 |
| CLAUDE.md (settingSources 시) | 부모 시스템 프롬프트 |
| 상속된 툴 정의 (또는 서브셋) | 스킬 (명시 지정 시 제외) |

#### 용도별 툴 제한
| 용도 | 툴 |
|------|-----|
| 읽기 전용 분석 | Read, Grep, Glob |
| 테스트 실행 | Bash, Read, Grep |
| 코드 수정 | Read, Edit, Write, Grep, Glob |

---

## VII. 품질 보증 & 가드레일

### 출처: `14-test-evaluate/01-develop-tests.md`

#### 평가 프레임워크
- **성공 기준 SMART**: Specific, Measurable, Achievable, Relevant
- **평가 유형**: 정확 일치, 코사인 유사도, ROUGE-L, LLM 기반 Likert, LLM 이진 분류
- **핵심**: 평가 모델 ≠ 생성 모델 (독립성 확보)
- 양(자동화) > 질(수동 소수) — 자동화된 eval 파이프라인 우선

---

### 출처: `14-test-evaluate/03-reduce-latency.md`

#### 레이턴시 최적화 전략
- **원칙**: 먼저 성능 좋은 프롬프트 → 그 다음 레이턴시 최적화. 조기 최적화 금지
- 모델 선택: 속도 우선 → Haiku 4.5
- 짧은 응답: 단어 수 제한보다 문단/문장 수 제한이 더 효과적
- 스트리밍: TTFT 개선으로 체감 반응성 향상

---

### 출처: `15-strengthen-guardrails/01-reduce-hallucinations.md`

#### 할루시네이션 방지 패턴
1. **"모른다" 허용**: "If unsure, say 'I don't have enough information'"
2. **직접 인용 → 인용 기반 분석** (2단계): 먼저 인용 추출 → 추출된 인용에만 근거해 분석
3. **출처 인용 검증**: 응답 후 각 주장의 지지 인용 검색 → 없으면 제거
4. **외부 지식 제한**: 제공된 문서 이외의 일반 지식 사용 금지

#### 고급 기법
- Chain-of-Thought 검증, Best-of-N 검증, 반복 정제

---

### 출처: `15-strengthen-guardrails/02-increase-consistency.md`

#### 출력 일관성 확보
- **출력 형식 명시**: JSON/XML/커스텀 템플릿으로 구조 정밀 정의
- **Prefill 미지원** (Opus 4.6, Sonnet 4.6) → Structured Outputs + 명시적 포맷 지시로 대체
- **RAG 패턴**: 지식베이스를 고정 소스로 제공 + `<kb_entry>` 응답 형식 → 근거 추적 가능
- **프롬프트 체이닝**: 복잡한 태스크를 일관된 소형 서브태스크로 분해

---

### 출처: `15-strengthen-guardrails/03-mitigate-jailbreaks.md`

#### 다층 보호 패턴
1. **무해성 스크린**: Haiku 같은 경량 모델로 입력 사전 검사 (Structured Outputs boolean 분류)
2. **프롬프트에 윤리/법적 경계 강조**: `<values>` + `<directives>` 블록
3. **반복 남용자 대응**: 경고 → 스로틀링 → 차단
4. **지속적 모니터링**: 출력 정기 분석

---

### 출처: `15-strengthen-guardrails/05-reduce-prompt-leak.md`

#### 프롬프트 유출 방지
- 완벽한 방법은 없음 — 리스크 줄이기가 목표
- 시스템 프롬프트에 핵심 정보 격리
- 후처리 필터링 (정규식, 키워드, LLM 스크리닝)
- Prefill 미지원이므로 `[Never mention X]` 형태 강조 지시를 시스템 프롬프트에 명시

---

## 부록: 전체 문서 채택 현황 (27/105)

> `[x]` = 채택 (본문에 포함), `[ ]` = 제외. 각 항목에 사유와 포함된 목차 섹션을 명시.

### 01~02. 진입점

- [ ] `01-intro.md` — API 소개 페이지. 하네스 설계와 무관한 제품 개요
- [ ] `02-quickstart.md` — API 키 발급, SDK 설치 등 시작 가이드

### 03. Build with Claude

- [ ] `03-build-with-claude/01-overview.md` — API 빌드 개요. 개념 수준이며 구체적 설계 지침 없음
- [ ] `03-build-with-claude/02-messages-api.md` — Messages API 엔드포인트 파라미터 상세
- [ ] `03-build-with-claude/03-stop-reasons.md` — stop_reason 열거 및 API 응답 구조. 필요한 내용은 05-tools/02에서 에이전틱 루프 맥락으로 이미 포함
- [x] `03-build-with-claude/04-prompting-best-practices.md` — **I. 프롬프트 설계 원칙** / 시스템 프롬프트 패턴, XML 블록, 에이전틱 시스템 설계의 레시피북. 하네스 시스템 프롬프트 설계의 핵심 참조

### 04. Model Capabilities

- [x] `04-model-capabilities/01-extended-thinking.md` — **II. 모델 역량** / thinking 과금 구조만 채택. thinking 블록 관리(signature, interleaved, display)는 Claude Code 내부 처리이므로 상세 생략
- [x] `04-model-capabilities/02-adaptive-thinking.md` — **II. 모델 역량** / 비용 인식 부분만 채택. adaptive/manual 설정은 하네스에서 직접 제어 불가
- [x] `04-model-capabilities/03-effort.md` — **II. 모델 역량** / 서브에이전트 모델 선택(haiku/sonnet)이 effort 제어의 실질적 수단이라는 점만 채택
- [ ] `04-model-capabilities/04-fast-mode.md` — API fast mode 설정. Claude Code에서 /fast로 이미 제공되는 기능의 API 구현 상세
- [x] `04-model-capabilities/05-structured-outputs.md` — **II. 모델 역량 활용** / 스키마 설계 원칙(optional 최소화, 복잡도 분리). SDK 코드 예시 제외, 설계 원칙만 채택
- [ ] `04-model-capabilities/06-citations.md` — 인용 기능 API. 특정 RAG 파이프라인 구현에 한정
- [ ] `04-model-capabilities/07-streaming.md` — SSE 스트리밍 이벤트 구조. Agent SDK가 추상화하므로 직접 구현 불필요
- [ ] `04-model-capabilities/08-batch-processing.md` — Batch API 엔드포인트. 비동기 대량 처리 API 상세
- [ ] `04-model-capabilities/09-pdf-support.md` — PDF 입력 처리 API 파라미터
- [ ] `04-model-capabilities/10-search-results.md` — 검색 결과 형식 API 상세
- [ ] `04-model-capabilities/11-multilingual.md` — 다국어 지원 API 가이드
- [ ] `04-model-capabilities/12-embeddings.md` — 임베딩 API (Voyage). 별도 서비스이며 에이전트 설계와 무관

### 05. Tools

- [x] `05-tools/01-overview.md` — **III. 도구 아키텍처** / Client/Server/Anthropic-schema 3 버킷 구분, 비용 구조, strict 옵션
- [x] `05-tools/02-how-tool-use-works.md` — **III. 도구 아키텍처** / 에이전틱 루프 패턴, stop_reason 전체 처리, 적합/부적합 케이스 판별
- [x] `05-tools/03-tutorial-agent.md` — **III. 도구 아키텍처** / 5 Rings 패턴 (단일→루프→병렬→에러→SDK). 에이전트 실행 엔진 구현 청사진
- [ ] `05-tools/04-define-tools.md` — 툴 JSON Schema 작성법. API 구현 상세
- [ ] `05-tools/05-handle-tool-calls.md` — tool_use/tool_result 메시지 구성 API 코드. 03-tutorial-agent에서 루프 패턴으로 이미 포함
- [ ] `05-tools/06-parallel-tool-use.md` — 병렬 툴 호출 API 파라미터. 개념은 prompting-best-practices에서 이미 다룸
- [ ] `05-tools/07-tool-runner.md` — SDK Tool Runner 헬퍼 API 상세
- [ ] `05-tools/08-strict-tool-use.md` — strict: true 구현 상세. 개념은 structured-outputs에서 이미 포함
- [ ] `05-tools/09-tool-use-caching.md` — 툴 정의 캐싱 API 파라미터
- [ ] `05-tools/10-server-tools.md` — 서버 사이드 툴 활성화 API 상세
- [ ] `05-tools/11-troubleshooting.md` — 툴 호출 디버깅 API 에러 코드
- [ ] `05-tools/12-tool-reference.md` — 전체 툴 파라미터 레퍼런스
- [ ] `05-tools/13-web-search.md` — web_search 툴 API 파라미터
- [ ] `05-tools/14-web-fetch.md` — web_fetch 툴 API 파라미터
- [ ] `05-tools/15-code-execution.md` — code_execution 샌드박스 API 상세
- [ ] `05-tools/16-memory-tool.md` — memory 툴 API 파라미터
- [ ] `05-tools/17-bash-tool.md` — bash 툴 API 스키마 상세
- [ ] `05-tools/18-computer-use.md` — computer use API 설정. 스크린샷 해상도 등 구현 상세
- [ ] `05-tools/19-text-editor.md` — text_editor 툴 API 스키마

### 06. Tool Infrastructure

- [x] `06-tool-infrastructure/01-manage-tool-context.md` — **III. 도구 아키텍처** / 컨텍스트 관리 4가지 접근법과 적용 순서. 툴 20개 임계값 기준
- [x] `06-tool-infrastructure/02-tool-combinations.md` — **III. 도구 아키텍처** / 에이전트 유형별 표준 툴 조합 5가지 패턴 (리서치/코딩/인용/장기실행/데스크탑)
- [ ] `06-tool-infrastructure/03-tool-search.md` — tool_search 서버 툴 API 구현 상세. 개념은 01-manage-tool-context에서 이미 다룸
- [ ] `06-tool-infrastructure/04-programmatic-tool-calling.md` — code_execution 기반 프로그래매틱 호출 API 구현
- [ ] `06-tool-infrastructure/05-fine-grained-streaming.md` — 서버 툴 스트리밍 이벤트 구조 API 상세

### 07. Context Management

- [x] `07-context-management/01-context-windows.md` — **IV. 컨텍스트 관리** / context rot, context awareness, 1M 토큰 윈도우, thinking+tool 제약
- [x] `07-context-management/02-compaction.md` — **IV. 컨텍스트 관리** / 서버 사이드 자동 요약, 커스텀 지시문, 비용 제어 패턴
- [x] `07-context-management/03-context-editing.md` — **IV. 컨텍스트 관리** / tool result clearing, thinking clearing, exclude_tools 세밀 제어
- [ ] `07-context-management/04-prompt-caching.md` — 프롬프트 캐싱 API 파라미터 (cache_control 설정). 개념은 01-manage-tool-context에서 이미 다룸
- [ ] `07-context-management/05-token-counting.md` — 토큰 카운팅 API 엔드포인트 상세

### 08. Files & Assets

- [ ] `08-files-assets/01-files-api.md` — Files API 엔드포인트 (업로드/다운로드). 파일 관리 API 구현 상세

### 09. Agent Skills

- [x] `09-agent-skills/01-overview.md` — **V. Skills 아키텍처** / Progressive Disclosure 3단계, ~100 tokens/Skill 메타데이터 비용, 보안 모델
- [ ] `09-agent-skills/02-quickstart.md` — Skills API 등록/업로드 코드. API 구현 상세
- [x] `09-agent-skills/03-best-practices.md` — **V. Skills 아키텍처** / "Claude는 이미 똑똑하다" 원칙, plan-validate-execute 패턴, 반복 개선 방법
- [ ] `09-agent-skills/04-enterprise.md` — 엔터프라이즈 Skills 배포/관리. 조직 관리 상세
- [ ] `09-agent-skills/05-claude-api-skill.md` — Claude API 사전 제작 Skill 사용법. 특정 Skill 가이드
- [ ] `09-agent-skills/06-skills-guide.md` — Skills YAML 작성 상세 가이드. API 구현 레퍼런스

### 10. Agent SDK

- [x] `10-agent-sdk/01-overview.md` — **VI. Agent SDK 아키텍처** / Client SDK vs Agent SDK 차별점, 내장 툴, Hooks, 세션 관리
- [ ] `10-agent-sdk/02-quickstart.md` — SDK 설치 및 첫 쿼리 코드. 구현 시작 가이드
- [x] `10-agent-sdk/03-agent-loop.md` — **VI. Agent SDK 아키텍처** / 루프 사이클, 메시지 타입, ResultMessage subtype, 컨텍스트 효율화
- [ ] `10-agent-sdk/04-claude-code-features.md` — SDK에서 Claude Code 기능 활성화 방법. 구현 상세
- [ ] `10-agent-sdk/05-sessions.md` — 세션 재개/관리 API 코드. 구현 상세
- [ ] `10-agent-sdk/06-streaming-input.md` — 스트리밍 입력 처리 API. 구현 상세
- [ ] `10-agent-sdk/07-streaming-output.md` — 스트리밍 출력 이벤트 처리. 구현 상세
- [ ] `10-agent-sdk/08-mcp.md` — SDK에서 MCP 서버 연결 설정. 구현 상세
- [ ] `10-agent-sdk/09-custom-tools.md` — 커스텀 툴 등록 SDK 코드. 구현 상세
- [ ] `10-agent-sdk/10-tool-search.md` — ToolSearch 온디맨드 로딩 SDK 설정. 구현 상세
- [ ] `10-agent-sdk/11-permissions.md` — SDK 권한 모드 설정. 구현 상세
- [ ] `10-agent-sdk/12-user-input.md` — AskUserQuestion 툴 SDK 구현. 구현 상세
- [ ] `10-agent-sdk/13-hooks.md` — Hooks 콜백 SDK 구현 코드. 개념은 03-agent-loop에서 이미 다룸
- [ ] `10-agent-sdk/14-file-checkpointing.md` — 파일 체크포인팅 SDK 설정. 구현 상세
- [ ] `10-agent-sdk/15-structured-outputs.md` — SDK에서 structured outputs 사용. 구현 상세
- [ ] `10-agent-sdk/16-hosting.md` — SDK 호스팅 배포 가이드. 인프라 운영 상세
- [ ] `10-agent-sdk/17-secure-deployment.md` — 보안 배포 체크리스트. 인프라 운영 상세
- [x] `10-agent-sdk/18-system-prompts.md` — **VI. Agent SDK 아키텍처** / 시스템 프롬프트 4가지 설정법, preset+append 패턴, setting_sources 함정
- [x] `10-agent-sdk/19-subagents.md` — **VI. Agent SDK 아키텍처** / 서브에이전트 컨텍스트 격리, 동적 AgentDefinition, 툴 제한 조합
- [ ] `10-agent-sdk/20-slash-commands.md` — Slash Command 정의 SDK 상세. 구현 상세
- [ ] `10-agent-sdk/21-skills.md` — SDK에서 Skills 등록/사용. 구현 상세
- [ ] `10-agent-sdk/22-cost-tracking.md` — 비용 추적 SDK 콜백. 구현 상세
- [ ] `10-agent-sdk/23-todo-tracking.md` — Todo 추적 SDK 기능. 구현 상세
- [ ] `10-agent-sdk/24-plugins.md` — 플러그인 SDK 연결. 구현 상세
- [ ] `10-agent-sdk/25-typescript.md` — TypeScript SDK 가이드. 언어별 구현
- [ ] `10-agent-sdk/26-typescript-v2.md` — TypeScript SDK v2 마이그레이션. 언어별 구현
- [ ] `10-agent-sdk/27-python.md` — Python SDK 가이드. 언어별 구현
- [ ] `10-agent-sdk/28-migration-guide.md` — SDK 마이그레이션 가이드. 버전 전환 상세

### 11. MCP

- [ ] `11-mcp/01-mcp-connector.md` — MCP Connector API 설정. API 구현 상세
- [ ] `11-mcp/02-remote-mcp-servers.md` — 원격 MCP 서버 연결 API. 구현 상세

### 12. Platforms

- [ ] `12-platforms/01-amazon-bedrock.md` — Amazon Bedrock 연동. 플랫폼별 설정
- [ ] `12-platforms/02-bedrock-legacy.md` — Bedrock 레거시 호환. 플랫폼별 설정
- [ ] `12-platforms/03-microsoft-foundry.md` — Microsoft Foundry 연동. 플랫폼별 설정
- [ ] `12-platforms/04-vertex-ai.md` — Vertex AI 연동. 플랫폼별 설정

### 13. Prompt Engineering

- [x] `13-prompt-engineering/01-overview.md` — **I. 프롬프트 설계 원칙** / 프롬프트 엔지니어링 프로세스 (성공 기준→평가→초안→개선)
- [x] `13-prompt-engineering/02-prompting-tools.md` — **I. 프롬프트 설계 원칙** / 프롬프트 템플릿 `{{변수}}` 패턴, Prompt Improver 4단계

### 14. Test & Evaluate

- [x] `14-test-evaluate/01-develop-tests.md` — **VII. 품질 보증 & 가드레일** / 평가 프레임워크 SMART, 채점 방법 비교, "평가 모델 ≠ 생성 모델"
- [ ] `14-test-evaluate/02-eval-tool.md` — Console 평가 도구 UI 사용법. 도구 UI 가이드
- [x] `14-test-evaluate/03-reduce-latency.md` — **VII. 품질 보증 & 가드레일** / 레이턴시 최적화 전략, 모델 선택, 스트리밍 활용

### 15. Strengthen Guardrails

- [x] `15-strengthen-guardrails/01-reduce-hallucinations.md` — **VII. 품질 보증 & 가드레일** / 할루시네이션 방지 4가지 패턴, 인용 기반 분석 2단계
- [x] `15-strengthen-guardrails/02-increase-consistency.md` — **VII. 품질 보증 & 가드레일** / 출력 일관성, Prefill 대안, RAG 패턴, 프롬프트 체이닝
- [x] `15-strengthen-guardrails/03-mitigate-jailbreaks.md` — **VII. 품질 보증 & 가드레일** / 다층 보호, 무해성 스크린, 컴플라이언스 가드레일
- [ ] `15-strengthen-guardrails/04-streaming-refusals.md` — 스트리밍 중 거부 감지 API 이벤트. API 구현 상세
- [x] `15-strengthen-guardrails/05-reduce-prompt-leak.md` — **VII. 품질 보증 & 가드레일** / 프롬프트 유출 방지, 후처리 필터링, 시스템 프롬프트 격리

### 16. Admin

- [ ] `16-admin/01-admin-api.md` — 관리자 API 엔드포인트. 조직 관리 상세
- [ ] `16-admin/02-data-residency.md` — 데이터 거주지 설정. 인프라 운영
- [ ] `16-admin/03-workspaces.md` — 워크스페이스 관리 API. 조직 관리
- [ ] `16-admin/04-usage-cost-api.md` — 사용량/비용 API. 조직 관리
- [ ] `16-admin/05-analytics-api.md` — 분석 API. 조직 관리
- [ ] `16-admin/06-data-retention.md` — 데이터 보존 정책. 조직 관리
