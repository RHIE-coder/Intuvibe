# Channels Reference — 채널 MCP 서버 구축 레퍼런스

---

리서치 프리뷰. claude.ai 로그인 필수. Console/API 키 미지원. Team/Enterprise는 명시 활성화 필요.
채널 개념은 `16-channels.md`, 여기는 **구축 레퍼런스**.

채널 = 외부 이벤트를 Claude Code 세션에 주입하는 MCP 서버.

---

## 1. 아키텍처

```
외부 시스템 → [채널 MCP 서버 (로컬)] → stdio → Claude Code 세션
                    ↑                              ↓ (선택)
              reply tool ← ────────────── Claude 응답
```

| 패턴 | 외부 연결 방식 | 예시 |
|------|-------------|------|
| **채팅 플랫폼** | 플랫폼 API 폴링 (로컬 실행) | Telegram, Discord |
| **웹훅** | 로컬 HTTP 포트 리스닝 | CI, 모니터링 |
| **단방향** | 이벤트 전달만 | 알림, 알림 |
| **양방향** | 이벤트 + reply tool | 채팅 브릿지 |

---

## 2. 필수 요건

- `@modelcontextprotocol/sdk` 패키지
- Node.js 호환 런타임 (Bun, Node, Deno)
- `claude/channel` capability 선언
- `notifications/claude/channel` 이벤트 발행
- stdio 트랜스포트 (Claude Code가 서브프로세스로 스폰)

---

## 3. Server 생성자 옵션

| 필드 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| `capabilities.experimental['claude/channel']` | `{}` | O | 알림 리스너 등록 |
| `capabilities.experimental['claude/channel/permission']` | `{}` | X | 권한 릴레이 옵트인 |
| `capabilities.tools` | `{}` | X | 양방향 전용. 도구 탐색 활성화 |
| `instructions` | string | 권장 | 시스템 프롬프트에 추가. 이벤트 형식, 응답 방법, 도구 사용법 안내 |

```ts
const mcp = new Server(
  { name: 'my-channel', version: '0.0.1' },
  {
    capabilities: {
      experimental: { 'claude/channel': {} },
      tools: {},  // 단방향이면 생략
    },
    instructions: 'Events arrive as <channel source="my-channel">. Reply with reply tool.',
  },
)
```

---

## 4. Notification 형식

```ts
await mcp.notification({
  method: 'notifications/claude/channel',
  params: {
    content: 'build failed on main',  // <channel> 태그 body
    meta: { severity: 'high', run_id: '1234' },  // 태그 속성
  },
})
```

Claude 컨텍스트에 도달하는 형태:
```xml
<channel source="my-channel" severity="high" run_id="1234">
build failed on main
</channel>
```

| 필드 | 타입 | 설명 |
|------|------|------|
| `content` | string | `<channel>` 태그 body |
| `meta` | `Record<string, string>` | 선택. 각 엔트리가 태그 속성. 키는 식별자만 (문자/숫자/_). 하이픈 포함 키는 **조용히 탈락** |

---

## 5. Reply Tool (양방향)

표준 MCP 도구로 구현. 채널 전용 API 아님.

### 3가지 구성 요소

1. `tools: {}` capability 선언
2. `ListToolsRequestSchema` + `CallToolRequestSchema` 핸들러
3. `instructions`에 도구 사용 안내

```ts
// 도구 목록
mcp.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: 'reply',
    description: 'Send a message back',
    inputSchema: {
      type: 'object',
      properties: {
        chat_id: { type: 'string' },
        text: { type: 'string' },
      },
      required: ['chat_id', 'text'],
    },
  }],
}))

// 도구 실행
mcp.setRequestHandler(CallToolRequestSchema, async req => {
  if (req.params.name === 'reply') {
    const { chat_id, text } = req.params.arguments as { chat_id: string; text: string }
    // 플랫폼 API로 전송
    await sendToPlatform(chat_id, text)
    return { content: [{ type: 'text', text: 'sent' }] }
  }
  throw new Error(`unknown tool: ${req.params.name}`)
})
```

---

## 6. Sender Gating (프롬프트 인젝션 방지)

**게이팅 없는 채널 = 프롬프트 인젝션 벡터.**

```ts
const allowed = new Set(loadAllowlist())

// 메시지 핸들러에서 발행 전:
if (!allowed.has(message.from.id)) return  // 조용히 드롭
await mcp.notification({ ... })
```

**핵심**: **sender ID**로 게이트. room/chat ID가 아님. 그룹 채팅에서 허용된 방에 있는 누구나 인젝션 가능하기 때문.

### 플랫폼별 페어링 방식

| 플랫폼 | 방식 |
|--------|------|
| Telegram / Discord | 봇에 DM → 페어링 코드 → 세션에서 승인 → ID 추가 |
| iMessage | Messages DB에서 자기 주소 자동 감지 + 핸들 추가 |

---

## 7. Permission Relay (원격 권한 승인)

v2.1.81+. 양방향 채널이 로컬 터미널 권한 다이얼로그를 원격으로 **병렬 수신**. 먼저 도착한 응답 적용.

### 동작 흐름

1. Claude Code → `notifications/claude/channel/permission_request` 발행
2. 서버 → 플랫폼으로 프롬프트 전달 (request_id 포함)
3. 원격 사용자 → `yes <id>` 또는 `no <id>` 응답
4. 서버 → `notifications/claude/channel/permission` verdict 발행

로컬 터미널 다이얼로그도 열려 있음. **어느 쪽이든 먼저 응답하면 적용**, 다른 쪽은 드롭.

### Permission Request 필드

| 필드 | 설명 |
|------|------|
| `request_id` | 5글자 소문자 (`l` 제외). 폰 입력 시 `1`/`I` 혼동 방지 |
| `tool_name` | 도구명 (`Bash`, `Write` 등) |
| `description` | 도구 호출 설명 (터미널 다이얼로그와 동일) |
| `input_preview` | 도구 인자 JSON (200자 제한) |

### Verdict 형식

```ts
await mcp.notification({
  method: 'notifications/claude/channel/permission',
  params: {
    request_id: id.toLowerCase(),
    behavior: 'allow',  // 또는 'deny'
  },
})
```

### Verdict 매칭 실패 시

| 상황 | 결과 |
|------|------|
| 형식 불일치 (`approve it`) | 정규식 매칭 실패 → 일반 메시지로 전달 |
| 올바른 형식, 틀린 ID | verdict 발행되지만 열린 요청 없어 조용히 드롭 |

두 경우 모두 **로컬 다이얼로그 유지**.

### 릴레이 범위

| 릴레이됨 | 안 됨 |
|----------|-------|
| 도구 사용 승인 (Bash, Write, Edit 등) | 프로젝트 trust, MCP 서버 동의 다이얼로그 |

---

## 8. 리서치 프리뷰 테스트

커스텀 채널은 승인 목록에 없음. `--dangerously-load-development-channels`로 우회:

```bash
# 플러그인 형태
claude --dangerously-load-development-channels plugin:myplugin@mymarketplace

# bare MCP 서버
claude --dangerously-load-development-channels server:webhook
```

- 엔트리별 우회 (다른 `--channels` 엔트리에 확장 안 됨)
- `channelsEnabled` 조직 정책은 여전히 적용
- 공식 마켓플레이스 제출 시 보안 리뷰 후 승인

### 플러그인 패키징

채널을 플러그인으로 래핑 → 마켓플레이스 게시 → `/plugin install`로 설치.
Team/Enterprise admin은 `allowedChannelPlugins`로 자체 승인 목록 구성 가능.

---

## 9. 구축 요약: 단방향 → 양방향 → 권한 릴레이

| 단계 | 추가 사항 |
|------|----------|
| **단방향** | `claude/channel` capability + `notifications/claude/channel` 발행 |
| **양방향** | + `tools: {}` capability + reply tool 핸들러 + instructions |
| **sender gating** | + 허용 목록 + 발행 전 sender ID 확인 |
| **권한 릴레이** | + `claude/channel/permission` capability + request 핸들러 + verdict 파싱 |

> [insight] 채널의 `instructions` 문자열은 Claude 시스템 프롬프트에 추가된다. 이벤트 형식, 응답 여부, reply tool 사용법을 여기서 정의. MCP 도구의 description이 도구 탐색에 중요하듯, 채널의 instructions가 Claude의 이벤트 처리 방식을 결정한다.

> [insight] `meta` 키에 하이픈이 포함되면 **조용히 탈락**한다 (`kebab-case` 불가). 식별자 규칙(문자/숫자/_)만 허용. 웹훅 페이로드의 헤더명을 meta에 그대로 넣으면 빠질 수 있다.

> [insight] Permission relay의 `request_id`는 5글자 소문자에서 `l`을 제외한다 (폰에서 `1`/`I`/`l` 혼동 방지). 로컬 터미널 다이얼로그에는 이 ID가 표시되지 않으므로, 채널 서버의 outbound handler가 ID를 전달하는 유일한 경로. 하네스에서 모바일 승인 워크플로를 구현할 때 이 설계를 참조할 수 있다.
