# Hooks in Agent SDK

---

에이전트 실행 중 특정 이벤트(툴 호출 전후, 세션 시작/종료 등)에 콜백 함수를 삽입.

**주요 활용**: 위험 작업 차단, 감사 로그, 입력 변환, 인간 승인 요구, 세션 상태 관리

---

## 1. 실행 흐름

1. 이벤트 발생 (툴 호출, 세션 시작 등)
2. SDK가 해당 이벤트에 등록된 훅 수집 (`options.hooks` + `settingSources` 로딩 훅)
3. `matcher` 패턴으로 필터링 (매처 없으면 모든 이벤트 처리)
4. 콜백 실행 (툴명, 입력값, 세션ID 등 전달)
5. 콜백이 결정 반환: allow / deny / 입력 수정 / 컨텍스트 주입

---

## 2. 훅 이벤트 목록

| 이벤트 | Python | TS | 트리거 |
|--------|--------|-----|--------|
| `PreToolUse` | ✅ | ✅ | 툴 호출 직전 (차단/수정 가능) |
| `PostToolUse` | ✅ | ✅ | 툴 실행 완료 후 |
| `PostToolUseFailure` | ✅ | ✅ | 툴 실행 실패 |
| `UserPromptSubmit` | ✅ | ✅ | 사용자 프롬프트 제출 |
| `Stop` | ✅ | ✅ | 에이전트 실행 종료 |
| `SubagentStart` | ✅ | ✅ | 서브에이전트 시작 |
| `SubagentStop` | ✅ | ✅ | 서브에이전트 완료 |
| `PreCompact` | ✅ | ✅ | 컨텍스트 압축 직전 |
| `PermissionRequest` | ✅ | ✅ | 권한 다이얼로그 표시 전 |
| `Notification` | ✅ | ✅ | 에이전트 상태 알림 |
| `SessionStart` | ❌ | ✅ | 세션 초기화 |
| `SessionEnd` | ❌ | ✅ | 세션 종료 |
| `Setup` | ❌ | ✅ | 세션 설정/유지보수 |
| `TeammateIdle` | ❌ | ✅ | 팀메이트 유휴 상태 |
| `TaskCompleted` | ❌ | ✅ | 백그라운드 태스크 완료 |
| `ConfigChange` | ❌ | ✅ | 설정 파일 변경 |
| `WorktreeCreate/Remove` | ❌ | ✅ | Git worktree 생성/제거 |

---

## 3. 훅 설정

```python
options = ClaudeAgentOptions(
    hooks={
        "PreToolUse": [HookMatcher(matcher="Write|Edit", hooks=[protect_env_files])]
    }
)
```

### 매처 (Matcher)

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `matcher` | undefined | 툴명에 대한 regex (없으면 모든 이벤트 처리) |
| `hooks` | - | 콜백 함수 배열 (필수) |
| `timeout` | 60초 | 타임아웃 |

- 툴 기반 훅: 툴명으로만 필터링 (파일 경로 등은 콜백 내부에서 직접 검사)
- MCP 툴 패턴: `mcp__<서버명>__<액션명>`

---

## 4. 콜백 입력/출력

### 입력 (3개 인수)
1. **input_data**: 이벤트 상세 (`session_id`, `cwd`, `hook_event_name` 공통 포함)
2. **tool_use_id**: PreToolUse↔PostToolUse 매핑용 상관관계 ID
3. **context**: TS: `AbortSignal` 포함 / Python: 미래 확장용 예약

### 출력 구조
```python
return {
    # 상위 필드: 대화 제어
    "systemMessage": "에이전트에게 보여줄 컨텍스트",
    "continue_": True,  # 에이전트 계속 실행 여부

    # hookSpecificOutput: 현재 작업 제어
    "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "allow" | "deny" | "ask",
        "permissionDecisionReason": "이유",
        "updatedInput": {...},     # 수정된 입력 (PreToolUse)
        "additionalContext": "...", # 툴 결과에 추가 (PostToolUse)
    }
}
```

- 아무것도 반환 안 할 때: `{}` 반환 → 작업 허용
- **우선순위**: deny > ask > allow (여러 훅 중 하나라도 deny면 차단)

### 비동기 출력 (사이드 이펙트용)
```python
async def async_hook(input_data, tool_use_id, context):
    asyncio.create_task(send_to_logging_service(input_data))
    return {"async_": True, "asyncTimeout": 30000}
```
에이전트가 훅 완료를 기다리지 않고 즉시 진행. 차단/수정 불가 → 로깅/메트릭 전용.

---

## 5. 주요 패턴

### 툴 차단 (.env 보호)
```python
async def protect_env_files(input_data, tool_use_id, context):
    file_path = input_data["tool_input"].get("file_path", "")
    if file_path.split("/")[-1] == ".env":
        return {"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": "Cannot modify .env files",
        }}
    return {}
```

### 입력 수정 (경로 리다이렉트)
```python
# updatedInput 사용 시 permissionDecision: "allow" 필수
return {"hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "updatedInput": {**input_data["tool_input"], "file_path": f"/sandbox{original_path}"},
}}
```

### 다중 훅 체이닝 (순서대로 실행)
```python
hooks={"PreToolUse": [
    HookMatcher(hooks=[rate_limiter]),
    HookMatcher(hooks=[authorization_check]),
    HookMatcher(hooks=[input_sanitizer]),
    HookMatcher(hooks=[audit_logger]),
]}
```

### Notification 훅 (Slack 전달)
```python
hooks={"Notification": [HookMatcher(hooks=[notification_handler])]}
# notification types: permission_prompt, idle_prompt, auth_success, elicitation_dialog
```

---

## 6. 주의사항

- `SessionStart`/`SessionEnd`: Python SDK에서 콜백 미지원 → `setting_sources=["project"]`로 shell command 훅 로딩
- 서브에이전트: 부모 권한 자동 상속 안 함. 각 서브에이전트가 별도 권한 요청.
- `UserPromptSubmit`에서 서브에이전트 생성 시 무한 루프 주의 (서브에이전트 여부 체크 필요)
- 매처 없는 훅 → 모든 툴 호출에 실행됨 (의도치 않은 광범위 매칭 주의)

---

> [insight] `PreToolUse` + `permissionDecision: "deny"` 패턴은 하네스의 플러그인 샌드박스 보안 레이어 구현에서 핵심이다. 플러그인별 허용 경로, 금지 명령, API 호출 제한을 훅으로 선언적 정의하면, 플러그인 코드 자체를 수정하지 않고 보안 정책을 중앙 관리할 수 있다. 특히 `matcher: "^mcp__plugin_X__"` 패턴으로 특정 플러그인의 모든 툴에 적용되는 정책을 플러그인 ID 기반으로 관리하는 아키텍처가 효율적이다.

> [insight] `updatedInput`을 통한 입력 변환은 하네스에서 플러그인 실행 환경 격리의 핵심 메커니즘이다. 플러그인이 요청한 파일 경로를 샌드박스 디렉토리로 자동 리다이렉트하거나, 외부 API 호출에 인증 헤더를 자동 주입하는 등 플러그인 코드 변경 없이 실행 환경을 제어할 수 있다. 이 패턴으로 플러그인 개발자가 보안을 신경 쓰지 않아도 되는 "안전한 플러그인 기본값"을 하네스 레벨에서 보장할 수 있다.

> [insight] `Notification` 훅 + 외부 서비스 전달 패턴은 하네스의 실시간 모니터링 인프라에서 직접 활용 가능하다. `permission_prompt`, `idle_prompt` 이벤트를 Telegram/Slack으로 라우팅하면 사용자가 플러그인 실행 상태를 원격에서 실시간 파악하고, 권한 승인도 모바일에서 처리할 수 있다. 현재 이 프로젝트가 Telegram으로 운영되는 방식과 동일한 패턴이다.
