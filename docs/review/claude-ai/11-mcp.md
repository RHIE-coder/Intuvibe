# MCP — Model Context Protocol 통합

---

MCP는 Claude Code를 외부 도구, 데이터베이스, API에 연결하는 **오픈 소스 프로토콜**이다.
MCP 서버를 연결하면 이슈 트래커에서 기능 구현, 모니터링 데이터 분석, DB 쿼리, 디자인 통합, 워크플로우 자동화가 가능해진다.

---

## 1. 전송 방식 3가지

| 전송 | 설명 | 명령 예시 |
|------|------|----------|
| **HTTP** (권장) | 원격 클라우드 서비스 | `claude mcp add --transport http notion https://mcp.notion.com/mcp` |
| **SSE** (deprecated) | 원격 이벤트 스트림 | `claude mcp add --transport sse asana https://mcp.asana.com/sse` |
| **stdio** | 로컬 프로세스 | `claude mcp add --transport stdio db -- npx -y @bytebase/dbhub --dsn "..."` |

- 옵션(`--transport`, `--env`, `--scope`, `--header`)은 서버 이름 **앞**에, `--` 뒤에 명령과 인자
- 헤더: `--header "Authorization: Bearer token"`

### 관리 명령

```bash
claude mcp list              # 전체 목록
claude mcp get github        # 상세
claude mcp remove github     # 삭제
/mcp                         # 세션 내 상태 확인 + 인증
```

---

## 2. 설치 스코프

| 스코프 | 저장 위치 | 공유 | 용도 |
|--------|----------|------|------|
| **local** (기본) | `~/.claude.json` (프로젝트 경로 하위) | 본인, 현재 프로젝트 | 개인 개발 서버, 민감 크레덴셜 |
| **project** | `.mcp.json` (프로젝트 루트, VCS) | 팀 | 팀 공유 도구 |
| **user** | `~/.claude.json` | 본인, 전 프로젝트 | 개인 유틸리티 |

### 우선순위

```
local > project > user
```

같은 이름의 서버가 여러 스코프에 있으면 local이 이김. claude.ai connector보다도 local이 우선.

### 환경변수 확장 (`.mcp.json`)

```json
{
  "mcpServers": {
    "api-server": {
      "type": "http",
      "url": "${API_BASE_URL:-https://api.example.com}/mcp",
      "headers": { "Authorization": "Bearer ${API_KEY}" }
    }
  }
}
```

- `${VAR}` 또는 `${VAR:-default}` 문법
- `command`, `args`, `env`, `url`, `headers`에서 사용 가능
- 필수 변수가 미설정이고 기본값 없으면 파싱 실패

---

## 3. 인증

### OAuth 2.0

```bash
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
/mcp  # 브라우저 로그인
```

- 토큰 자동 갱신, `/mcp`에서 "Clear authentication"으로 해제
- 고정 콜백 포트: `--callback-port 8080`
- 사전 등록 OAuth: `--client-id ID --client-secret`
- CI용: `MCP_CLIENT_SECRET=secret` 환경변수
- 시크릿은 시스템 키체인에 저장 (설정 파일 아님)

### OAuth 메타데이터 오버라이드

```json
"oauth": { "authServerMetadataUrl": "https://auth.example.com/.well-known/openid-configuration" }
```

### Dynamic Headers (`headersHelper`)

OAuth 외 인증(Kerberos, 단기 토큰, 내부 SSO)용:

```json
{
  "mcpServers": {
    "internal-api": {
      "type": "http",
      "url": "https://mcp.internal.example.com",
      "headersHelper": "/opt/bin/get-mcp-auth-headers.sh"
    }
  }
}
```

- stdout으로 JSON 객체 출력, 10초 타임아웃
- 정적 headers와 같은 이름이면 dynamic이 오버라이드
- 매 연결마다 실행 (캐싱 없음)
- 환경변수: `CLAUDE_CODE_MCP_SERVER_NAME`, `CLAUDE_CODE_MCP_SERVER_URL`
- 프로젝트/로컬 스코프에서는 workspace trust 다이얼로그 승인 후에만 실행

---

## 4. Tool Search — 컨텍스트 비용 관리

도구 이름만 세션 시작 시 로드, 전체 스키마는 Claude가 필요할 때 온디맨드 로드.

| `ENABLE_TOOL_SEARCH` | 동작 |
|----------------------|------|
| (미설정, 기본) | 전체 deferred, 온디맨드 |
| `true` | 비1차 호스트에서도 강제 deferred |
| `auto` | 10% 이내면 선로드, 초과 시 deferred |
| `auto:<N>` | N% 임계값 커스텀 |
| `false` | 전부 즉시 로드 |

- `ANTHROPIC_BASE_URL`이 비1차 호스트면 기본 비활성화 (프록시가 `tool_reference` 미지원)
- Sonnet 4+ / Opus 4+ 필요. Haiku 미지원
- 서버 instructions 2KB, 도구 description 2KB에서 잘림 → 핵심을 앞쪽에 배치

> [insight] MCP 서버 저자에게 중요한 점: Tool Search 활성화 시 **서버 instructions가 도구 발견의 핵심 키**가 된다. Claude가 도구 이름만 보고 검색하므로, instructions에 "어떤 카테고리의 작업을 처리하는지", "언제 검색해야 하는지"를 명확히 기술해야 한다. 2KB에서 잘리므로 핵심을 앞쪽에 배치.

---

## 5. 출력 제한

| 설정 | 기본값 | 설명 |
|------|--------|------|
| 경고 임계값 | 10,000 토큰 | 초과 시 경고 표시 |
| `MAX_MCP_OUTPUT_TOKENS` | 25,000 토큰 | 최대 허용 출력 |
| `anthropic/maxResultSizeChars` | - | 도구별 persist 임계값 오버라이드 (최대 500K 문자) |

- 임계값 초과 출력은 디스크에 저장 후 파일 참조로 대체
- `anthropic/maxResultSizeChars`는 persist 임계값만 올림, `MAX_MCP_OUTPUT_TOKENS`는 별도 상한

---

## 6. 리소스 & 프롬프트

### MCP 리소스 (`@` 참조)

```
@github:issue://123           # 이슈 참조
@postgres:schema://users      # DB 스키마 참조
@docs:file://api/auth         # 문서 참조
```

- `@` 자동완성에서 MCP 리소스도 표시
- 참조 시 자동 fetch → 첨부

### MCP 프롬프트 (명령)

```
/mcp__github__list_prs
/mcp__github__pr_review 456
/mcp__jira__create_issue "Bug in login flow" high
```

서버가 노출한 프롬프트가 `/mcp__서버__프롬프트` 형태로 사용 가능.

---

## 7. Elicitation (서버 → 사용자 입력 요청)

서버가 작업 중 사용자 입력이 필요하면 대화형 다이얼로그 표시:
- **Form mode** — 서버 정의 필드 입력
- **URL mode** — 브라우저에서 인증/승인 후 확인

`Elicitation` 훅으로 자동 응답 가능.

---

## 8. Channels (푸시 메시지)

MCP 서버가 `claude/channel` capability를 선언하면, 세션에 **푸시 메시지**를 보낼 수 있다.
CI 결과, 모니터링 알림, 채팅 메시지 등에 반응. `--channels` 플래그로 옵트인.

---

## 9. 추가 기능

### Dynamic Tool Updates

서버가 `list_changed` 알림 → 재연결 없이 도구/프롬프트/리소스 갱신.

### Claude Desktop에서 임포트

```bash
claude mcp add-from-claude-desktop  # macOS/WSL만 지원
```

### Claude.ai 서버 자동 연결

claude.ai에서 설정한 MCP 서버가 Claude Code에서 자동 사용 가능. `ENABLE_CLAUDEAI_MCP_SERVERS=false`로 비활성화.

### Claude Code를 MCP 서버로 사용

```bash
claude mcp serve  # Claude Code 자체를 stdio MCP 서버로 실행
```

Claude Desktop이나 다른 MCP 클라이언트에서 연결 가능. View, Edit, LS 등 도구 노출.

### Plugin MCP 서버

- `plugin.json` 또는 `.mcp.json`에 정의
- 플러그인 활성화 시 자동 연결
- `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}` 환경변수 사용

---

## 10. 조직 관리 (Managed MCP)

### Option 1: 배타적 제어 (`managed-mcp.json`)

시스템 디렉토리에 배포 → 사용자가 서버 추가/수정 불가:
- macOS: `/Library/Application Support/ClaudeCode/managed-mcp.json`
- Linux: `/etc/claude-code/managed-mcp.json`

### Option 2: 정책 기반 (`allowedMcpServers` / `deniedMcpServers`)

사용자가 서버 추가 가능하되, 허용/차단 목록으로 제한:

```json
{
  "allowedMcpServers": [
    { "serverName": "github" },
    { "serverCommand": ["npx", "-y", "approved-package"] },
    { "serverUrl": "https://mcp.company.com/*" }
  ],
  "deniedMcpServers": [
    { "serverUrl": "https://*.untrusted.com/*" }
  ]
}
```

- 3가지 매칭: `serverName`, `serverCommand` (정확 매칭), `serverUrl` (와일드카드)
- **denylist가 절대 우선** — allowlist에 있어도 denylist에 걸리면 차단
- `allowedMcpServers: []` (빈 배열) = 완전 잠금
- Option 1 + Option 2 조합 가능: managed-mcp.json의 서버도 allow/deny 필터 적용

> [insight] MCP 서버의 컨텍스트 비용은 Tool Search 덕분에 idle 상태에서 최소화되지만, 서버 연결이 세션 중 **무경고로 끊어질 수 있다** (features-overview 문서에서 확인). `/mcp`로 상태를 주기적으로 확인하는 습관이 필요하다. 하네스에서 MCP 의존도가 높다면 연결 상태 모니터링을 Hook으로 자동화하는 것을 고려.

> [insight] `headersHelper`는 임의 셸 명령을 실행한다. 하네스에서 MCP 서버를 프로젝트에 배포할 때, headersHelper가 포함된 설정은 workspace trust 다이얼로그를 거쳐야 실행된다는 보안 제약을 감안해야 한다. 조직 배포 시에는 managed-mcp.json으로 사전 구성하는 것이 안전.

> [insight] `claude mcp serve`로 Claude Code 자체를 MCP 서버로 노출할 수 있다. 이는 Claude Desktop이나 다른 에이전트에서 Claude Code의 도구(파일 읽기/편집, 검색 등)를 사용할 수 있게 한다는 의미로, 하네스 간 연결이나 에이전트 체이닝에 활용 가능한 패턴이다.
