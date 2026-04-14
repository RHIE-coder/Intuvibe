# MCP in Agent SDK

---

`mcpServers` 옵션으로 외부 툴·데이터 소스에 연결. MCP 툴 명명: `mcp__<서버명>__<툴명>`.

---

## 1. 설정 방법

### 코드에서 직접
```python
options = ClaudeAgentOptions(
    mcp_servers={
        "github": {
            "command": "npx",
            "args": ["-y", "@modelcontextprotocol/server-github"],
            "env": {"GITHUB_TOKEN": os.environ["GITHUB_TOKEN"]},
        }
    },
    allowed_tools=["mcp__github__*"],
)
```

### `.mcp.json` 파일 (+ `setting_sources=["project"]`)
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {"GITHUB_TOKEN": "${GITHUB_TOKEN}"}
    }
  }
}
```

---

## 2. 트랜스포트 타입

| 타입 | 설정 | 사용 시 |
|------|------|---------|
| `stdio` (기본) | `command` + `args` + `env` | 로컬 프로세스 |
| `http` | `type: "http"`, `url` | 클라우드 API (비스트리밍) |
| `sse` | `type: "sse"`, `url` | 클라우드 API (스트리밍) |
| SDK MCP | 코드 내 정의 | 인프로세스 커스텀 툴 |

---

## 3. 인증

```python
# stdio: env 필드
"env": {"GITHUB_TOKEN": os.environ["GITHUB_TOKEN"]}

# HTTP/SSE: headers 필드
"headers": {"Authorization": f"Bearer {token}"}

# OAuth: 외부에서 토큰 취득 후 headers에 전달
# (SDK가 OAuth 플로우 자동 처리 안 함)
```

---

## 4. allowedTools 필수

```python
# 특정 툴만
allowed_tools=["mcp__github__list_issues", "mcp__db__query"]

# 서버 전체
allowed_tools=["mcp__github__*"]
```

**주의**: `permissionMode="acceptEdits"`는 MCP 툴 자동 승인 안 함. `bypassPermissions`는 모든 안전장치 해제. → `allowedTools` 와일드카드 사용 권장.

---

## 5. MCP Tool Search

MCP 서버가 많을 때 툴 정의가 컨텍스트 윈도우 점유. Tool Search(기본 활성화)로 필요한 툴만 온디맨드 로딩.

---

## 6. 연결 상태 확인

```python
if isinstance(message, SystemMessage) and message.subtype == "init":
    failed = [s for s in message.data.get("mcp_servers", [])
              if s.get("status") != "connected"]
    if failed:
        print(f"연결 실패: {failed}")
```

**연결 타임아웃**: 기본 60초. 느린 서버는 사전 워밍업 필요.

---

> [insight] MCP는 하네스의 플러그인 마켓플레이스에서 외부 서비스 연동의 표준 레이어다. GitHub, 데이터베이스, Slack 등 외부 시스템을 플러그인으로 등록할 때 커스텀 툴 구현 대신 기존 MCP 서버를 재사용하면 개발 비용이 대폭 줄어든다. 하네스의 플러그인은 "MCP 서버 래퍼" 형태로 표준화하고, 플러그인별 인증 자격증명은 `env` 또는 `headers`로 격리 관리하는 아키텍처가 효율적이다.

> [insight] `allowedTools` 와일드카드(`mcp__서버명__*`)는 하네스의 MCP 플러그인 권한 모델에서 핵심이다. 플러그인별로 허용된 툴 셋을 명시적으로 제한하면, 악의적 플러그인이 다른 서버의 툴을 호출하는 cross-plugin 공격을 차단할 수 있다. 플러그인 샌드박스에서 `allowedTools`를 해당 플러그인의 MCP 서버 툴만으로 제한하는 것이 보안의 기본이다.
