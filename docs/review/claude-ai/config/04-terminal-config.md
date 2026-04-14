# Terminal Config — 터미널 최적화

---

Claude Code가 터미널에서 최적으로 동작하기 위한 설정.
테마, 줄바꿈, 알림, 렌더링, 입력 처리, Vim 모드를 다룬다.

---

## 1. 테마

Claude Code가 터미널 테마를 제어하지 않음 → 터미널 앱에서 설정.
`/config`에서 Claude Code 테마를 터미널에 맞출 수 있음.
커스텀 status line은 `/statusline`로 설정.

---

## 2. 줄바꿈 입력

| 방법 | 설명 |
|------|------|
| `\` + Enter | 어디서나 동작 |
| `Ctrl+J` | 어디서나 동작 (line feed) |
| `Shift+Enter` | iTerm2, WezTerm, Ghostty, Kitty에서 기본 지원 |
| `/terminal-setup` | VS Code, Alacritty, Zed, Warp용 자동 설정 |

### Option+Enter (macOS)

- **Terminal.app**: Settings → Profiles → Keyboard → "Use Option as Meta Key"
- **iTerm2**: Settings → Profiles → Keys → Left/Right Option key → "Esc+"
- **VS Code**: `"terminal.integrated.macOptionIsMeta": true`

---

## 3. 알림

Claude가 작업 완료 후 대기 상태가 되면 알림 이벤트 발생.

### 터미널 네이티브 알림

| 터미널 | 지원 |
|--------|------|
| Kitty, Ghostty | 추가 설정 없이 동작 |
| iTerm2 | Settings → Profiles → Terminal → "Notification Center Alerts" + "Send escape sequence-generated alerts" |
| macOS Terminal.app | 미지원 → Hook 사용 |

### tmux 내 사용

```
set -g allow-passthrough on
```

이 설정 없이는 tmux가 escape sequence를 가로채서 외부 터미널에 도달 불가.

### Hook 알림

터미널 알림과 **병행 실행** (대체가 아님). 커스텀 로직 추가 가능.

---

## 4. 렌더링 최적화

긴 세션에서 깜빡임이나 스크롤 점프 발생 시:

```bash
CLAUDE_CODE_NO_FLICKER=1
```

→ fullscreen 렌더링 모드. 메모리 평탄, 마우스 지원 추가.

---

## 5. 대용량 입력

- 직접 붙여넣기는 잘릴 수 있음 (특히 VS Code 터미널)
- 파일에 쓰고 Claude에게 읽도록 요청하는 것이 안전
- 매우 긴 콘텐츠는 파일 기반 워크플로우 권장

---

## 6. Vim 모드

`/config` → Editor mode 또는 `~/.claude.json`에 `"editorMode": "vim"`.

지원 키바인딩:
- **모드 전환**: `Esc`(NORMAL), `i`/`I`/`a`/`A`/`o`/`O`(INSERT)
- **네비게이션**: `h`/`j`/`k`/`l`, `w`/`e`/`b`, `0`/`$`/`^`, `gg`/`G`, `f`/`F`/`t`/`T`
- **편집**: `x`, `d`(w/e/b/d/D), `c`(w/e/b/c/C), `.`(반복)
- **Yank/Paste**: `yy`/`Y`, `yw`/`ye`/`yb`, `p`/`P`
- **텍스트 객체**: `iw`/`aw`, `i"`/`a"`, `i(`/`a(` 등
- **인덴트**: `>>`/`<<`
- **라인**: `J`(join)

> [insight] tmux 내에서 Claude Code를 사용할 때 `set -g allow-passthrough on`이 없으면 알림과 터미널 진행 바가 동작하지 않는다. 하네스 환경이 tmux 기반이라면 이 설정이 필수.
