# Channels — 외부 이벤트 푸시

---

**리서치 프리뷰**. Channel은 MCP 서버가 실행 중인 Claude Code 세션에 **이벤트를 푸시**하는 장치다.
Claude가 폴링하는 게 아니라 외부에서 메시지가 도착하면 Claude가 반응한다. 양방향 가능 — Claude가 같은 채널로 답장.

요구사항: Claude Code v2.1.80+, claude.ai 로그인 (API 키 미지원), Team/Enterprise는 관리자 활성화 필요.

---

## 1. 지원 채널

| 채널 | 방식 | 요구사항 |
|------|------|---------|
| **Telegram** | Bot API 폴링 | BotFather로 봇 생성 + 토큰 |
| **Discord** | Bot + Gateway | Developer Portal에서 봇 생성 + Message Content Intent 활성화 |
| **iMessage** | macOS Messages DB 직접 읽기 + AppleScript 답장 | macOS 전용, Full Disk Access 필요 |
| **fakechat** | localhost 웹 UI 데모 | Bun |

모든 채널은 **플러그인**으로 설치. [Bun](https://bun.sh) 필요.

---

## 2. 동작 흐름

```
1. 플러그인 설치: /plugin install telegram@claude-plugins-official
2. 토큰 설정: /telegram:configure <token>
3. 채널 활성화하여 재시작: claude --channels plugin:telegram@claude-plugins-official
4. 페어링: 봇에 메시지 → 코드 수신 → /telegram:access pair <code>
5. 접근 제한: /telegram:access policy allowlist
```

- `--channels`에 명시하지 않으면 `.mcp.json`에 있어도 푸시 불가
- 여러 채널 동시 가능: `--channels plugin:telegram@... plugin:discord@...`
- 세션이 열려 있는 동안만 이벤트 수신

---

## 3. 보안 — Sender Allowlist

- 모든 채널은 **발신자 허용 목록** 유지. 미등록 발신자는 무시
- Telegram/Discord: 페어링 코드로 등록
- iMessage: 자기 자신은 자동 허용, 타인은 `/imessage:access allow +15551234567`

**Permission Relay**: 채널이 이 기능을 선언하면, 허용된 발신자가 **원격으로 도구 승인/거부** 가능. 신뢰하는 발신자만 allowlist에 추가해야 하는 이유.

---

## 4. Enterprise 제어

| 설정 | 역할 | 미설정 시 |
|------|------|---------|
| `channelsEnabled` | 마스터 스위치. `true`여야 채널 동작 | 채널 차단 |
| `allowedChannelPlugins` | 허용 플러그인 목록. 설정 시 Anthropic 기본 목록 대체 | Anthropic 기본 목록 적용 |

```json
{
  "channelsEnabled": true,
  "allowedChannelPlugins": [
    { "marketplace": "claude-plugins-official", "plugin": "telegram" },
    { "marketplace": "acme-corp-plugins", "plugin": "internal-alerts" }
  ]
}
```

- Pro/Max 사용자(조직 없음)는 제한 없이 사용 가능
- `allowedChannelPlugins: []` (빈 배열) = 모든 채널 플러그인 차단 (development 플래그는 가능)
- 완전 차단은 `channelsEnabled` 미설정

---

## 5. 다른 기능과 비교

| 기능 | 동작 | 적합한 상황 |
|------|------|-----------|
| **Claude Code on the web** | 클라우드 샌드박스에서 새 세션 | 비동기 독립 작업 위임 |
| **Claude in Slack** | @Claude 멘션 → 웹 세션 스폰 | 팀 대화에서 직접 작업 시작 |
| **MCP 서버** | Claude가 쿼리 (온디맨드) | 시스템 읽기/쿼리 접근 |
| **Remote Control** | 브라우저/모바일에서 로컬 세션 조종 | 진행 중인 세션 원격 제어 |
| **Channels** | 외부 → 세션에 이벤트 푸시 | 외부 이벤트에 실시간 반응 |

Channels의 고유 영역:
- **Chat bridge** — Telegram/Discord/iMessage로 Claude에 질문 → 로컬 파일에서 작업 → 같은 채팅에 답장
- **Webhook receiver** — CI, 에러 트래커, 배포 파이프라인의 웹훅이 Claude가 파일을 열고 있는 세션에 도착

---

## 6. 리서치 프리뷰 제한

- `--channels`는 Anthropic 허용 목록(또는 조직 allowlist)의 플러그인만 수락
- 미허용 플러그인은 세션 시작은 되지만 채널 미등록 + 경고
- 커스텀 채널 테스트: `--dangerously-load-development-channels`
- 프로토콜과 플래그 문법이 피드백에 따라 변경될 수 있음

> [insight] Channel은 Claude Code의 다른 기능과 다른 고유한 영역을 채운다: **외부 이벤트의 실시간 푸시**. MCP는 Claude가 쿼리하고, Remote Control은 사용자가 조종하지만, Channel은 외부 시스템(CI, 채팅, 모니터링)이 Claude에게 먼저 말을 건다. 하네스에서 CI 실패 → 자동 디버깅, 모니터링 알림 → 자동 분석 같은 반응형 워크플로우를 설계할 때 핵심 인프라.

> [insight] Permission Relay가 있는 채널에서 allowlist에 등록된 발신자는 **원격으로 도구 승인/거부**가 가능하다. 이는 편리하지만, allowlist에 넣는 발신자를 신중히 선택해야 하는 보안 함의가 있다. 허용된 발신자 = 세션의 도구 실행 권한을 가진 사람.
