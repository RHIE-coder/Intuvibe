# Voice Dictation — 음성 입력

---

Push-to-talk 방식으로 프롬프트를 음성으로 입력. 타이핑과 혼합 가능.
오디오는 **Anthropic 서버로 스트리밍**되어 전사 (로컬 처리 아님).

---

## 1. 요구사항

- **claude.ai 계정** 필수 (API 키, Bedrock, Vertex, Foundry 미지원)
- **로컬 마이크** 필요 → 원격 환경(웹, SSH) 미지원
- WSL2: WSLg 필요 (Windows 11 포함). WSL1/Windows 10은 네이티브 Windows에서 실행
- Linux: 네이티브 모듈 실패 시 `arecord`(ALSA) 또는 `rec`(SoX)로 폴백

---

## 2. 활성화

```
/voice          # 토글 ON/OFF
```

세션 간 유지. 설정:

```json
{ "voiceEnabled": true }
```

---

## 3. 녹음 방법

| 동작 | 결과 |
|------|------|
| `Space` 홀드 | 녹음 시작 (warmup 후) |
| `Space` 놓기 | 녹음 중지 + 텍스트 확정 |
| `Space` 탭 | 일반 스페이스 입력 |

### Warmup

Space 홀드는 key-repeat 감지 기반 → 짧은 warmup 시간 있음.
warmup 중 입력된 스페이스 문자는 녹음 활성화 시 자동 제거.

**Warmup 건너뛰기**: modifier 조합으로 리바인드 (예: `meta+k`) → 첫 키 입력 시 즉시 녹음.

### 혼합 입력

음성 전사는 커서 위치에 삽입. 타이핑 + 음성을 자유롭게 조합 가능:

```
> refactor the auth middleware to ▮
  # Space 홀드 → "use the new token validation helper" 발화
> refactor the auth middleware to use the new token validation helper▮
```

---

## 4. 코딩 어휘 인식

전사 엔진이 코딩 용어에 튜닝됨:
- `regex`, `OAuth`, `JSON`, `localhost` 등 개발 용어 정확 인식
- 현재 프로젝트 이름, git 브랜치명이 인식 힌트로 자동 추가

---

## 5. 언어 설정

`language` 설정과 동일. 미설정 시 영어 기본.

20개 언어 지원: cs, da, nl, en, fr, de, el, hi, id, it, ja, ko, no, pl, pt, ru, es, sv, tr, uk

```json
{ "language": "korean" }
```

미지원 언어 설정 시 → `/voice` 경고 + 영어 폴백. Claude 텍스트 응답은 영향 없음.

---

## 6. 키 리바인드

`~/.claude/keybindings.json`:

```json
{
  "bindings": [{
    "context": "Chat",
    "bindings": {
      "meta+k": "voice:pushToTalk",
      "space": null
    }
  }]
}
```

- `space: null` → Space 기본 바인딩 제거
- modifier 조합 → warmup 없이 즉시 녹음
- 일반 문자키(예: `v`)는 warmup 중 프롬프트에 입력되므로 비권장

---

## 7. 트러블슈팅

| 문제 | 원인/해결 |
|------|---------|
| "requires a Claude.ai account" | API 키/서드파티 인증 중. `/login`으로 claude.ai 계정 로그인 |
| "Microphone access is denied" | 시스템 설정에서 터미널에 마이크 권한 부여 |
| "No audio recording tool found" | Linux: SoX 설치 (`sudo apt-get install sox`) |
| Space 홀드해도 반응 없음 | `/voice` 비활성 상태이거나 OS 레벨에서 key-repeat 비활성화 |
| 전사 결과 부정확 | `/config`에서 올바른 언어 설정 확인 |

> [insight] 음성 전사는 로컬이 아닌 **Anthropic 서버에서 처리**된다. 민감한 내용을 음성으로 입력할 때 이 점을 인지해야 한다. 또한 claude.ai 계정 전용이므로 API 키나 서드파티 프로바이더 환경에서는 사용 불가.
