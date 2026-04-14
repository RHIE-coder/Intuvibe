# Permissions in Agent SDK

---

## 1. 권한 평가 순서

1. **Hooks** → allow/deny/continue
2. **Deny 규칙** (`disallowed_tools`, settings.json) → 매칭 시 차단 (모든 모드 포함)
3. **Permission Mode** → 모드별 자동 처리
4. **Allow 규칙** (`allowed_tools`, settings.json) → 매칭 시 승인
5. **`canUseTool` 콜백** → `dontAsk` 모드에서는 건너뜀(→ 거부)

---

## 2. Allow / Deny 규칙

```python
options = ClaudeAgentOptions(
    allowed_tools=["Read", "Glob", "Grep"],    # 자동 승인
    disallowed_tools=["Bash"],                  # 항상 거부
)
```

**중요**: `allowed_tools`는 `bypassPermissions`를 제한하지 않음. `bypassPermissions` + 특정 툴 차단이 필요하면 `disallowed_tools` 사용.

---

## 3. Permission Mode

| 모드 | 동작 | 사용 시 |
|------|------|---------|
| `default` | 미승인 툴 → `canUseTool` 콜백 | 커스텀 승인 플로우 |
| `dontAsk` | 미승인 툴 → 즉시 거부 | 헤드리스 에이전트, 명시적 툴 세트 |
| `acceptEdits` | 파일 편집 + 파일시스템 명령 자동 승인 | 코드 수정 신뢰 워크플로우 |
| `bypassPermissions` | 모든 툴 자동 승인 | 격리된 CI/샌드박스 환경 |
| `plan` | 읽기 전용 툴만 실행, 수정 툴 차단 | 변경 전 계획 검토 |
| `auto` (TS only) | 모델 분류기가 개별 툴 호출 승인/거부 | 자율 에이전트 안전 가드레일 |

### acceptEdits 자동 승인 목록
파일 편집(Edit, Write), 파일시스템 명령(`mkdir`, `touch`, `rm`, `mv`, `cp`)

---

## 4. 동적 모드 변경

```python
q = query(prompt="...", options=ClaudeAgentOptions(permission_mode="default"))
await q.set_permission_mode("acceptEdits")  # 세션 중간에 변경
async for message in q:
    ...
```

---

## 5. 서브에이전트 상속

`bypassPermissions` 사용 시 서브에이전트도 동일 모드 상속 (재정의 불가). 서브에이전트에 전체 시스템 접근 권한 부여됨 → 주의.

---

> [insight] `default` + `canUseTool` 콜백 조합은 하네스의 인터랙티브 플러그인 실행 UI에서 핵심이다. 사용자가 직접 플러그인의 특정 툴 호출(예: 파일 삭제, 외부 API 호출)을 승인/거부할 수 있는 UI를 `canUseTool` 콜백으로 구현하면, 자동화와 사용자 통제 사이의 균형을 달성한다.

> [insight] `plan` 모드는 하네스에서 "제안 먼저, 실행 나중" 워크플로우를 구현하는 핵심 도구다. 사용자가 플러그인 실행 전에 Claude의 계획을 검토하고 승인할 수 있도록, 첫 번째 실행을 `plan` 모드로 계획 생성 → 사용자 승인 → `acceptEdits` 또는 `bypassPermissions` 모드로 실행하는 2단계 패턴을 표준화할 수 있다.

> [insight] 동적 permission mode 변경(`set_permission_mode`)은 하네스의 점진적 신뢰 모델에서 유용하다. 세션 초반에는 `default` 모드로 시작해 Claude의 접근 방식을 확인하고, 신뢰가 쌓이면 `acceptEdits`로 전환하는 패턴은 자동화 수준을 사용자가 실시간으로 제어할 수 있는 UX를 제공한다.
