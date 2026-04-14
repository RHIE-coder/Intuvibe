# Plugins in the Agent SDK

---

SDK에서 로컬 파일시스템 경로로 플러그인을 로딩해 슬래시 커맨드, 에이전트, 스킬, 훅, MCP 서버 확장.

---

## 1. 플러그인 로딩

```python
options = ClaudeAgentOptions(
    plugins=[
        {"type": "local", "path": "./my-plugin"},
        {"type": "local", "path": "/absolute/path/to/another-plugin"},
    ],
    max_turns=3,
)
```

- 상대 경로: 현재 작업 디렉토리 기준
- 경로는 `.claude-plugin/plugin.json`이 포함된 **플러그인 루트** 디렉토리 지정

---

## 2. 로딩 확인

```python
async for message in query(prompt="Hello", options=options):
    if message.type == "system" and message.subtype == "init":
        print(message.data.get("plugins"))        # 로딩된 플러그인 목록
        print(message.data.get("slash_commands")) # 사용 가능한 커맨드 목록
```

---

## 3. 플러그인 스킬 호출

스킬은 플러그인명으로 네임스페이스 자동 적용:

```python
async for message in query(
    prompt="/my-plugin:greet",  # plugin-name:skill-name 형식
    options={"plugins": [{"type": "local", "path": "./my-plugin"}]},
):
    ...
```

CLI 설치 플러그인은 `~/.claude/plugins/`에서 경로 확인 후 동일 방식으로 로딩 가능.

---

## 4. 플러그인 디렉토리 구조

```
my-plugin/
├── .claude-plugin/
│   └── plugin.json          # 필수: 플러그인 매니페스트
├── skills/                   # 스킬 (자율 호출 + /skill-name)
│   └── my-skill/SKILL.md
├── commands/                 # 레거시 (→ skills/ 권장)
├── agents/                   # 커스텀 에이전트
├── hooks/
│   └── hooks.json           # 이벤트 핸들러
└── .mcp.json                # MCP 서버 정의
```

---

## 5. 트러블슈팅

| 문제 | 원인 | 해결 |
|------|------|------|
| 플러그인 미로딩 | 경로가 루트 디렉토리 아님 | `.claude-plugin/` 포함 디렉토리로 지정 |
| 스킬 미동작 | 네임스페이스 누락 | `plugin-name:skill-name` 형식 사용 |
| 상대 경로 오류 | 작업 디렉토리 불일치 | 절대 경로 사용 권장 |

---

> [insight] SDK의 `plugins` 옵션은 하네스의 플러그인 마켓플레이스 런타임 구현에서 핵심 메커니즘이다. 사용자가 플러그인을 설치하면 → 파일을 특정 위치에 배포하고 → 에이전트 실행 시 `plugins` 배열에 경로를 동적으로 추가하는 방식으로 플러그인 생태계를 구축할 수 있다. `SystemMessage.init`의 `plugins`/`slash_commands` 필드로 실제 로딩 상태를 검증하는 패턴도 하네스의 플러그인 상태 모니터링에 활용 가능하다.

> [insight] 플러그인 네임스페이스(`plugin-name:skill-name`)는 하네스의 다중 플러그인 환경에서 커맨드 충돌을 자동으로 해결한다. 두 플러그인이 동일한 스킬명(`greet`)을 가져도 `plugin-a:greet`과 `plugin-b:greet`으로 구분된다. 하네스 UI에서 플러그인 목록을 표시할 때 이 네임스페이스 구조를 사용자에게 명확히 노출하면 플러그인 선택 UX가 개선된다.
