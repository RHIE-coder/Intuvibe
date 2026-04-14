# Built-in Commands — 슬래시 명령어 전체 레퍼런스

---

`/` 입력으로 목록 표시, 이어서 타이핑으로 필터링.
**모든 명령이 모든 사용자에게 표시되지 않는다** — 플랫폼, 플랜, 환경에 따라 가시성이 달라진다.
번들 스킬(`/simplify`, `/batch`, `/debug`, `/loop`)도 같은 `/` 메뉴에 표시된다.

`<arg>` = 필수, `[arg]` = 선택.

---

## 1. 세션 관리

| 명령 | 동작 |
|------|------|
| `/clear` | 대화 이력 삭제 + 컨텍스트 해제. alias: `/reset`, `/new` |
| `/compact [instructions]` | 대화 압축. 선택적 포커스 지시문 |
| `/resume [session]` | 세션 ID/이름으로 재개 또는 선택 UI. alias: `/continue` |
| `/branch [name]` | 현재 지점에서 대화 분기. alias: `/fork` |
| `/rewind` | 이전 지점으로 대화/코드 되감기, 또는 선택 지점부터 요약. alias: `/checkpoint` |
| `/rename [name]` | 세션명 변경 + 프롬프트 바 표시. 인자 없으면 자동 생성 |
| `/exit` | CLI 종료. alias: `/quit` |

---

## 2. 컨텍스트 & 비용

| 명령 | 동작 |
|------|------|
| `/context` | 컨텍스트 사용량 컬러 그리드 시각화. 도구별 최적화 제안, 메모리 비대화 경고 |
| `/cost` | 토큰 사용 통계 |
| `/usage` | 플랜 사용량 한도 + rate limit 상태 |
| `/extra-usage` | rate limit 도달 시 extra usage 설정 |
| `/stats` | 일일 사용량, 세션 이력, 스트릭, 모델 선호도 시각화 |

---

## 3. 모델 & 성능

| 명령 | 동작 |
|------|------|
| `/model [model]` | 모델 변경. 좌우 화살표로 effort 조절. **현재 응답 완료 안 기다림** |
| `/effort [low\|medium\|high\|max\|auto]` | effort 레벨 설정. `low`/`medium`/`high` 세션 간 유지. `max` 현재 세션만 (Opus). `auto` 기본값 복원. **현재 응답 완료 안 기다림** |
| `/fast [on\|off]` | fast mode 토글 |

> [insight] `/model`과 `/effort`는 현재 응답이 진행 중이어도 즉시 적용된다. 긴 태스크 도중 모델이나 effort를 실시간 조절할 수 있다는 의미.

---

## 4. 설정 & 환경

| 명령 | 동작 |
|------|------|
| `/config` | 설정 UI (테마, 모델, output style 등). alias: `/settings` |
| `/status` | 버전, 모델, 계정, 연결 상태. **응답 중에도 사용 가능** |
| `/permissions` | 도구 권한 관리 (allow/ask/deny). 스코프별 조회, auto mode 거부 이력 확인. alias: `/allowed-tools` |
| `/sandbox` | 샌드박스 모드 토글 |
| `/hooks` | 훅 설정 조회 |
| `/theme` | 컬러 테마 변경. 라이트/다크, 색맹 접근성(daltonized), ANSI 테마 |
| `/color [color\|default]` | 세션 프롬프트 바 색상: `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan` |
| `/keybindings` | 키바인딩 설정 파일 열기/생성 |
| `/statusline` | 상태 라인 설정. 설명 텍스트 전달 또는 인자 없이 자동 설정 |
| `/terminal-setup` | Shift+Enter 등 터미널 키바인딩 설정 (VS Code, Alacritty, Warp 등 필요 시만 표시) |
| `/vim` | **v2.1.92에서 제거**. `/config` → Editor mode로 대체 |

---

## 5. 프로젝트 & 메모리

| 명령 | 동작 |
|------|------|
| `/init` | CLAUDE.md 가이드 초기화. `CLAUDE_CODE_NEW_INIT=1`로 skills/hooks/memory까지 대화형 설정 |
| `/memory` | CLAUDE.md 편집, auto-memory 활성/비활성, auto-memory 항목 조회 |
| `/add-dir <path>` | 세션에 작업 디렉토리 추가 (파일 접근만, `.claude/` 설정 미탐색) |
| `/skills` | 사용 가능한 스킬 목록 |
| `/agents` | 서브에이전트 설정 관리 |
| `/plugin` | 플러그인 관리 |
| `/reload-plugins` | 활성 플러그인 재로드 (변경 반영). 컴포넌트별 수/에러 리포트 |
| `/mcp` | MCP 서버 연결 및 OAuth 관리 |

---

## 6. 코드 & 리뷰

| 명령 | 동작 |
|------|------|
| `/diff` | 인터랙티브 diff 뷰어. 좌우 = git diff ↔ Claude 턴별 diff, 상하 = 파일 탐색 |
| `/security-review` | 현재 브랜치 변경사항 보안 취약점 분석 (injection, auth, data exposure 등) |
| `/review` | **Deprecated**. `claude plugin install code-review@claude-plugins-official` 사용 |
| `/plan [description]` | 플랜 모드 진입. 설명 전달 시 즉시 시작 (예: `/plan fix the auth bug`) |

---

## 7. 출력 & 내보내기

| 명령 | 동작 |
|------|------|
| `/copy [N]` | 마지막 어시스턴트 응답 클립보드 복사. `N`으로 N번째 이전 응답. 코드 블록 있으면 인터랙티브 선택. `w`로 파일 쓰기 (SSH에서 유용) |
| `/export [filename]` | 대화를 플레인 텍스트로 내보내기. 파일명 지정 또는 클립보드/파일 선택 대화상자 |

> [insight] `/copy`의 `w` 키로 파일 쓰기가 가능하다. SSH 원격 환경에서 클립보드 접근이 안 될 때 유용한 우회 경로.

---

## 8. 원격 & 통합

| 명령 | 동작 |
|------|------|
| `/remote-control` | 세션을 claude.ai에서 원격 제어 가능하게 설정. alias: `/rc` |
| `/remote-env` | `--remote`로 시작하는 웹 세션의 기본 원격 환경 설정 |
| `/desktop` | 현재 세션을 Claude Code Desktop 앱에서 계속. macOS/Windows. alias: `/app` |
| `/ide` | IDE 통합 관리 + 상태 표시 |
| `/chrome` | Chrome 통합 설정 |
| `/voice` | 음성 입력 토글. claude.ai 계정 필요 |

---

## 9. 계정 & 인증

| 명령 | 동작 |
|------|------|
| `/login` | Anthropic 계정 로그인 |
| `/logout` | 로그아웃 |
| `/privacy-settings` | 프라이버시 설정 (Pro/Max 전용) |
| `/upgrade` | 상위 플랜 업그레이드 페이지 |
| `/passes` | Claude Code 무료 1주 공유 (자격 계정만 표시) |

---

## 10. 유틸리티 & 기타

| 명령 | 동작 |
|------|------|
| `/btw <question>` | 대화에 추가하지 않는 사이드 질문 |
| `/doctor` | 설치/설정 진단 검증 |
| `/feedback [report]` | 피드백 제출. alias: `/bug` |
| `/help` | 도움말 + 명령 목록 |
| `/insights` | 세션 분석 리포트 (프로젝트 영역, 상호작용 패턴, 마찰점) |
| `/install-github-app` | Claude GitHub Actions 앱 설정 (리포 선택 + 통합 설정 대화형) |
| `/install-slack-app` | Claude Slack 앱 설치 (브라우저 OAuth) |
| `/mobile` | 모바일 앱 다운로드 QR 코드. alias: `/ios`, `/android` |
| `/powerup` | Claude Code 기능 인터랙티브 튜토리얼 + 애니메이션 데모 |
| `/release-notes` | 체인지로그 인터랙티브 버전 선택기 |
| `/schedule [description]` | Cloud 스케줄 태스크 생성/관리. 대화형 설정 |
| `/stickers` | Claude Code 스티커 주문 |
| `/tasks` | 백그라운드 태스크 목록/관리. alias: `/bashes` |
| `/ultraplan <prompt>` | 울트라플랜 세션에서 플랜 작성 → 브라우저 리뷰 → 원격/터미널 실행 |
| `/setup-bedrock` | Amazon Bedrock 설정 마법사 (`CLAUDE_CODE_USE_BEDROCK=1` 시에만 표시) |

---

## 11. MCP 프롬프트

MCP 서버가 노출하는 프롬프트는 `/mcp__<server>__<prompt>` 형식으로 명령어처럼 사용 가능.
연결된 서버에서 동적 탐색.

---

## 12. 제거된 명령

| 명령 | 버전 | 대체 |
|------|------|------|
| `/pr-comments` | v2.1.91 제거 | Claude에게 직접 PR 코멘트 조회 요청 |
| `/vim` | v2.1.92 제거 | `/config` → Editor mode |
| `/review` | deprecated | `code-review` 플러그인 설치 |

> [insight] `/model`과 `/effort`가 "현재 응답 완료를 기다리지 않고 즉시 적용"된다는 것은, 긴 에이전틱 루프 도중에 실시간으로 모델/effort를 전환할 수 있다는 의미다. 비용이 예상보다 빠르게 올라갈 때 mid-turn에서 effort를 낮추거나, 복잡한 구간에서만 max로 올리는 동적 제어가 가능.

> [insight] 가시성 조건이 있는 명령들: `/desktop`(macOS/Windows), `/upgrade`/`/privacy-settings`(Pro/Max), `/terminal-setup`(특정 터미널), `/setup-bedrock`(환경변수), `/passes`(자격 계정). 하네스에서 명령어 목록을 구성할 때 환경 감지 기반 동적 표시가 필요할 수 있다.
