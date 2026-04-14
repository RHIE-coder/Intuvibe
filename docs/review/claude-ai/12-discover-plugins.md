# Discover Plugins — 플러그인 마켓플레이스

---

플러그인은 Skills, Agents, Hooks, MCP 서버를 하나의 설치 단위로 묶은 확장 패키지다.
마켓플레이스는 이 플러그인들을 탐색/설치할 수 있는 카탈로그.

---

## 1. 마켓플레이스 구조

```
마켓플레이스 추가 (카탈로그 등록)
  → /plugin Discover 탭에서 탐색
  → 개별 플러그인 설치
  → /reload-plugins로 활성화
```

소스 유형:
- **GitHub**: `owner/repo` (예: `anthropics/claude-code`)
- **Git URL**: GitLab, Bitbucket, 셀프 호스팅 (`#branch` 태그 지원)
- **로컬 경로**: 디렉토리 또는 `marketplace.json` 직접 지정
- **원격 URL**: `marketplace.json` 직접 URL

---

## 2. 공식 Anthropic 마켓플레이스

`claude-plugins-official` — Claude Code 시작 시 **자동 사용 가능**. `/plugin` Discover 탭 또는 [claude.com/plugins](https://claude.com/plugins).

```
/plugin install github@claude-plugins-official
```

### Code Intelligence 플러그인

LSP(Language Server Protocol)를 통해 Claude에 **정의 이동, 참조 찾기, 편집 후 즉시 타입 에러 감지** 능력을 부여.

| 언어 | 플러그인 | 필요 바이너리 |
|------|---------|-------------|
| C/C++ | `clangd-lsp` | `clangd` |
| C# | `csharp-lsp` | `csharp-ls` |
| Go | `gopls-lsp` | `gopls` |
| Java | `jdtls-lsp` | `jdtls` |
| Kotlin | `kotlin-lsp` | `kotlin-language-server` |
| Lua | `lua-lsp` | `lua-language-server` |
| PHP | `php-lsp` | `intelephense` |
| Python | `pyright-lsp` | `pyright-langserver` |
| Rust | `rust-analyzer-lsp` | `rust-analyzer` |
| Swift | `swift-lsp` | `sourcekit-lsp` |
| TypeScript | `typescript-lsp` | `typescript-language-server` |

**Claude가 얻는 능력:**
- **자동 진단** — 파일 편집 후 LSP가 에러/경고 자동 보고. Claude가 같은 턴에서 수정. `Ctrl+O`로 인라인 진단 확인
- **코드 네비게이션** — 정의 이동, 참조 찾기, 타입 정보, 심볼 목록, 구현 탐색, 호출 계층

### 외부 통합 플러그인

사전 구성된 MCP 서버 번들:
- **소스 관리**: github, gitlab
- **프로젝트 관리**: atlassian(Jira/Confluence), asana, linear, notion
- **디자인**: figma
- **인프라**: vercel, firebase, supabase
- **커뮤니케이션**: slack
- **모니터링**: sentry

### 개발 워크플로우 플러그인

- `commit-commands` — git 커밋, push, PR 워크플로우
- `pr-review-toolkit` — PR 리뷰 전문 에이전트
- `agent-sdk-dev` — Agent SDK 개발 도구
- `plugin-dev` — 플러그인 제작 툴킷

### Output Styles 플러그인

- `explanatory-output-style` — 구현 선택에 대한 교육적 인사이트
- `learning-output-style` — 인터랙티브 학습 모드

---

## 3. 설치 스코프

| 스코프 | 적용 범위 | 설정 위치 |
|--------|----------|---------|
| **User** (기본) | 본인, 전 프로젝트 | `~/.claude/settings.json` |
| **Project** | 팀 전원, 현재 프로젝트 | `.claude/settings.json` |
| **Local** | 본인, 현재 프로젝트 | `.claude/settings.local.json` |
| **Managed** | 관리자가 설치, 수정 불가 | managed settings |

```bash
/plugin install plugin-name@marketplace-name              # user 기본
claude plugin install formatter@your-org --scope project  # 프로젝트
```

---

## 4. 플러그인 관리

```bash
/plugin                    # UI: Discover / Installed / Marketplaces / Errors 탭
/plugin disable <name>     # 비활성화 (제거 X)
/plugin enable <name>      # 재활성화
/plugin uninstall <name>   # 완전 제거
/reload-plugins            # 변경사항 즉시 적용 (재시작 불필요)
```

### 마켓플레이스 관리

```bash
/plugin marketplace list
/plugin marketplace update <name>     # 최신 플러그인 목록 갱신
/plugin marketplace remove <name>     # 마켓플레이스 제거 (설치된 플러그인도 제거)
```

### 자동 업데이트

- 공식 마켓플레이스: 기본 활성화
- 서드파티/로컬: 기본 비활성화
- `/plugin` → Marketplaces → 개별 토글
- `DISABLE_AUTOUPDATER` = 전체 비활성화
- `FORCE_AUTOUPDATE_PLUGINS=1` + `DISABLE_AUTOUPDATER` = Claude Code 업데이트만 수동, 플러그인은 자동

---

## 5. 팀 마켓플레이스 설정

`.claude/settings.json`에 마켓플레이스 등록 → 팀원이 폴더 trust 시 설치 프롬프트:

```json
{
  "extraKnownMarketplaces": {
    "my-team-tools": {
      "source": {
        "source": "github",
        "repo": "your-org/claude-plugins"
      }
    }
  }
}
```

---

## 6. 네임스페이싱

플러그인 명령은 `/<plugin-name>:<skill-name>` 형태:

```
/commit-commands:commit
```

여러 플러그인이 같은 스킬 이름을 가져도 충돌 없음.

---

## 7. 보안

플러그인과 마켓플레이스는 **사용자 권한으로 임의 코드를 실행**할 수 있는 고신뢰 컴포넌트.
신뢰하는 소스의 플러그인만 설치. 조직은 managed marketplace restrictions로 허용 마켓플레이스를 제한 가능.

---

## 8. 트러블슈팅

| 문제 | 해결 |
|------|------|
| `/plugin` 명령 미인식 | 버전 확인 (`claude --version`) → 업데이트 → 재시작 |
| 마켓플레이스 로딩 실패 | URL 접근성, `.claude-plugin/marketplace.json` 존재 확인 |
| 플러그인 설치 실패 | 소스 URL 접근 가능/공개 여부 확인 |
| 스킬 안 보임 | `rm -rf ~/.claude/plugins/cache` → 재시작 → 재설치 |
| LSP 바이너리 미발견 | `$PATH`에 바이너리 설치 확인, `/plugin` Errors 탭 확인 |
| LSP 높은 메모리 사용 | 대형 프로젝트에서 `rust-analyzer`, `pyright` 등. `/plugin disable`로 비활성화 |
| 모노레포 오진단 | workspace 설정 문제. 코드 편집에는 영향 없음 |

> [insight] Code Intelligence 플러그인(LSP)은 Claude의 코드 품질을 극적으로 높인다. 편집 후 **즉시 타입 에러를 감지**하고 같은 턴에서 수정하므로, grep 기반 검색만으로는 불가능한 정확한 네비게이션이 가능해진다. 하네스에서 특정 언어 프로젝트를 다룬다면 해당 LSP 플러그인을 기본 설치하는 것이 효과적.

> [insight] 플러그인 명령의 네임스페이싱(`/plugin:skill`)은 여러 플러그인이 공존할 때 충돌을 방지한다. 하네스에서 자체 플러그인을 만들 때 이 네임스페이스 구조를 활용하면 기존 스킬/명령과 충돌 없이 확장할 수 있다.

> [insight] `extraKnownMarketplaces`를 `.claude/settings.json`에 추가하면 팀원이 프로젝트를 열 때 자동으로 마켓플레이스 설치를 제안받는다. 하네스 배포 시 팀 전용 플러그인을 자동 프로비저닝하는 채널로 활용 가능.
