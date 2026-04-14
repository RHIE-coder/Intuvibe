# Keybindings — 키보드 단축키 커스터마이즈

---

`~/.claude/keybindings.json`으로 CLI 키보드 단축키를 커스터마이즈한다.
`/keybindings`로 파일 생성/열기. 변경 시 자동 감지, 재시작 불필요.

---

## 1. 설정 구조

```json
{
  "$schema": "https://www.schemastore.org/claude-code-keybindings.json",
  "bindings": [
    {
      "context": "Chat",
      "bindings": {
        "ctrl+e": "chat:externalEditor",
        "ctrl+u": null
      }
    }
  ]
}
```

- `context` = 바인딩 적용 영역
- `null` = 기본 바인딩 해제
- 핫리로드 지원

---

## 2. 주요 컨텍스트 & 액션

### Global

| 액션 | 기본 | 설명 |
|------|------|------|
| `app:interrupt` | Ctrl+C | 취소 |
| `app:exit` | Ctrl+D | 종료 |
| `app:toggleTodos` | Ctrl+T | 작업 목록 토글 |
| `app:toggleTranscript` | Ctrl+O | 트랜스크립트 토글 |

### Chat

| 액션 | 기본 | 설명 |
|------|------|------|
| `chat:submit` | Enter | 메시지 전송 |
| `chat:newline` | (미바인드) | 줄바꿈 삽입 |
| `chat:cancel` | Escape | 입력 취소 |
| `chat:cycleMode` | Shift+Tab | 권한 모드 순환 |
| `chat:modelPicker` | Cmd+P / Meta+P | 모델 선택 |
| `chat:fastMode` | Meta+O | fast mode 토글 |
| `chat:thinkingToggle` | Cmd+T / Meta+T | 사고 모드 토글 |
| `chat:externalEditor` | Ctrl+G, Ctrl+X Ctrl+E | 외부 에디터 |
| `chat:stash` | Ctrl+S | 프롬프트 임시 저장 |
| `chat:imagePaste` | Ctrl+V | 이미지 붙여넣기 |
| `chat:killAgents` | Ctrl+X Ctrl+K | 백그라운드 에이전트 종료 |

### Task

| 액션 | 기본 | 설명 |
|------|------|------|
| `task:background` | Ctrl+B | 작업 백그라운드 전환 |

### Voice

| 액션 | 기본 | 설명 |
|------|------|------|
| `voice:pushToTalk` | Space | 홀드 시 음성 녹음 |

---

## 3. 키 문법

### Modifier

`ctrl`, `alt`/`opt`, `shift`, `meta`/`cmd` + `+` 구분자

```
ctrl+k          단일 모디파이어
ctrl+shift+c    복수 모디파이어
```

### 대문자

단독 대문자 = Shift 암시. `K` = `shift+k`.
모디파이어와 함께면 Shift 암시 없음: `ctrl+K` = `ctrl+k`.

### Chord (연속 키)

```
ctrl+k ctrl+s    Ctrl+K 누른 후 Ctrl+S
```

### 특수 키

`escape`/`esc`, `enter`/`return`, `tab`, `space`, `up`/`down`/`left`/`right`, `backspace`, `delete`

---

## 4. 바인딩 해제

```json
{ "context": "Chat", "bindings": { "ctrl+s": null } }
```

Chord 접두사의 모든 바인딩을 해제하면 해당 접두사를 단일 키로 사용 가능:

```json
{
  "context": "Chat",
  "bindings": {
    "ctrl+x ctrl+k": null,
    "ctrl+x ctrl+e": null,
    "ctrl+x": "chat:newline"
  }
}
```

---

## 5. 예약 키 (리바인드 불가)

| 키 | 이유 |
|----|------|
| Ctrl+C | 하드코딩 인터럽트 |
| Ctrl+D | 하드코딩 종료 |
| Ctrl+M | 터미널에서 Enter와 동일 (CR) |

---

## 6. 터미널 충돌

| 키 | 충돌 |
|----|------|
| Ctrl+B | tmux 접두사 |
| Ctrl+A | GNU screen 접두사 |
| Ctrl+Z | Unix 프로세스 일시정지 (SIGTSTP) |

---

## 7. Vim 모드와의 관계

- Vim = 텍스트 입력 레벨 (커서 이동, 모드, 모션)
- Keybindings = 컴포넌트 레벨 (submit, toggle 등)
- `Escape` → vim에서 INSERT→NORMAL 전환 (`chat:cancel` 아님)
- 대부분의 Ctrl+키는 vim을 통과해서 keybinding 시스템에 도달
- vim NORMAL에서 `?` = 도움말

---

## 8. 검증

`/doctor`로 keybinding 경고 확인:
- JSON 파싱 에러
- 잘못된 컨텍스트명
- 예약 키 충돌
- 터미널 multiplexer 충돌
- 같은 컨텍스트 내 중복 바인딩

> [insight] `/keybindings`가 자동으로 `$schema` URL을 포함하는 파일을 생성하므로 에디터에서 자동완성/검증이 동작한다. 바인딩 변경은 즉시 핫리로드되므로 시행착오가 빠르다.
