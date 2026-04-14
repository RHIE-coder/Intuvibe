# Fullscreen Rendering — 깜빡임 제거 + 마우스 지원

---

**리서치 프리뷰** (`CLAUDE_CODE_NO_FLICKER=1`). 터미널의 alternate screen buffer에서 렌더링하여
깜빡임 제거, 메모리 평탄화, 마우스 지원을 제공한다. `vim`이나 `htop`처럼 터미널 화면을 점유하는 방식.

---

## 1. 활성화

```bash
CLAUDE_CODE_NO_FLICKER=1 claude          # 일회성
export CLAUDE_CODE_NO_FLICKER=1          # 영구 (~/.zshrc 등)
```

활성 확인: 입력 박스가 화면 하단에 **고정**되면 fullscreen 모드.

---

## 2. 달라지는 것

| 기존 | Fullscreen | 대안 |
|------|-----------|------|
| `Cmd+F` / tmux 검색 | 안 됨 (alternate buffer) | `Ctrl+O` → `/` 검색, 또는 `[`로 네이티브 scrollback에 쓰기 |
| 터미널 클릭 드래그 선택 | 앱 내 선택, 마우스 놓으면 자동 복사 | `CLAUDE_CODE_DISABLE_MOUSE=1`로 네이티브 선택 복원 |
| `Cmd`-클릭 URL | 직접 클릭 | VS Code 터미널에서는 기존 `Cmd`-클릭 유지 |

---

## 3. 마우스

| 동작 | 결과 |
|------|------|
| **프롬프트 클릭** | 커서 위치 이동 |
| **접힌 도구 결과 클릭** | 펼치기/접기 토글 |
| **URL/파일 경로 클릭** | 브라우저/앱에서 열기 |
| **클릭 드래그** | 텍스트 선택 → 놓으면 자동 복사 |
| **더블 클릭** | 단어 선택 (파일 경로는 하나로) |
| **트리플 클릭** | 라인 선택 |
| **마우스 휠** | 대화 스크롤 |

자동 복사 끄기: `/config` → Copy on select 토글. 끄면 `Ctrl+Shift+C`로 수동 복사.
선택 중 `Ctrl+C` = 취소 대신 복사.

---

## 4. 스크롤

| 단축키 | 동작 |
|--------|------|
| `PgUp` / `PgDn` | 반 화면 스크롤 |
| `Ctrl+Home` | 대화 시작으로 |
| `Ctrl+End` | 최신 메시지 + auto-follow 재개 |
| 마우스 휠 | 몇 줄씩 스크롤 |

MacBook: `Fn+↑`=PgUp, `Fn+↓`=PgDn, `Fn+←`=Home, `Fn+→`=End.

위로 스크롤 → auto-follow 일시정지. `Ctrl+End` 또는 맨 아래로 스크롤하면 재개.

### 휠 속도 조정

```bash
export CLAUDE_CODE_SCROLL_SPEED=3    # 1-20, 기본값 1
```

VS Code 터미널 등 이벤트 증폭이 없는 터미널에서 유용.

---

## 5. 검색 & 리뷰 (Transcript Mode)

`Ctrl+O` → transcript mode 진입. `less` 스타일 네비게이션:

| 키 | 동작 |
|----|------|
| `/` | 검색. `Enter` 확정, `Esc` 취소 |
| `n` / `N` | 다음/이전 매칭 |
| `j`/`k` 또는 `↑`/`↓` | 1줄 스크롤 |
| `g`/`G` 또는 `Home`/`End` | 맨 위/아래 |
| `Ctrl+U`/`Ctrl+D` | 반 페이지 |
| `Ctrl+B`/`Ctrl+F` 또는 `Space`/`b` | 전체 페이지 |
| `[` | 전체 대화를 네이티브 scrollback에 쓰기 → `Cmd+F` 사용 가능 |
| `v` | 임시 파일로 내보내기 → `$EDITOR`에서 열기 |
| `Esc` / `q` | transcript mode 종료 |

---

## 6. tmux 호환

```bash
set -g mouse on    # 필수: 마우스 휠 스크롤
```

없으면 휠 이벤트가 tmux로 가서 Claude Code에 도달 안 함. `PgUp`/`PgDn`은 동작.

**`tmux -CC` (iTerm2 통합 모드) 비호환** — alternate buffer와 마우스 추적 미작동. 일반 tmux(iTerm2 내)는 정상.

---

## 7. 네이티브 텍스트 선택 유지

마우스 캡처가 불편하면 (SSH, tmux 등):

```bash
CLAUDE_CODE_NO_FLICKER=1 CLAUDE_CODE_DISABLE_MOUSE=1 claude
```

→ 깜빡임 제거 + 메모리 평탄은 유지, 마우스 캡처만 끔.
키보드 스크롤(`PgUp`/`PgDn` 등)은 그대로. 클릭 기능만 상실.

---

## 8. 클립보드 경로

| 환경 | 경로 |
|------|------|
| 일반 터미널 | 시스템 클립보드 |
| tmux 내 | tmux paste buffer |
| SSH | OSC 52 escape sequence (일부 터미널에서 차단) |

복사 후 toast 메시지로 어떤 경로를 사용했는지 표시.

> [insight] Fullscreen 모드는 **보이는 메시지만 렌더링**하므로 대화 길이와 무관하게 메모리가 일정하다. 긴 세션에서 메모리 증가나 렌더링 지연이 문제라면 이 모드가 근본 해결책이다. 다만 alternate buffer를 쓰기 때문에 `Cmd+F`나 tmux 검색이 안 되고 `Ctrl+O` → `/` 또는 `[`를 써야 하는 트레이드오프가 있다.
