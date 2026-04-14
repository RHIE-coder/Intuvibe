# Environment Variables — 환경변수 전체 레퍼런스

---

셸에서 `claude` 실행 전 설정하거나, `settings.json`의 `env` 키로 설정.
120개 이상의 환경변수를 기능별로 분류.

---

## 1. 인증 & API

| 변수 | 동작 |
|------|------|
| `ANTHROPIC_API_KEY` | API 키 (`X-Api-Key` 헤더). 설정 시 로그인 상태여도 구독 대신 API 키 사용. 인터랙티브=1회 승인, `-p`=항상 사용 |
| `ANTHROPIC_AUTH_TOKEN` | `Authorization: Bearer <값>` 헤더 직접 설정 |
| `ANTHROPIC_BASE_URL` | API 엔드포인트 오버라이드 (프록시/게이트웨이). 비퍼스트파티 호스트에서 MCP tool search 기본 비활성화. `ENABLE_TOOL_SEARCH=true`로 활성화 |
| `ANTHROPIC_CUSTOM_HEADERS` | 커스텀 헤더 (`Name: Value`, 줄바꿈 구분) |
| `ANTHROPIC_BETAS` | 쉼표 구분 `anthropic-beta` 헤더 값. 모든 인증 방식과 호환 |
| `CLAUDE_CODE_OAUTH_TOKEN` | OAuth 액세스 토큰 (claude.ai 인증). `/login` 대안, SDK/자동화용 |
| `CLAUDE_CODE_OAUTH_REFRESH_TOKEN` | OAuth 리프레시 토큰. `CLAUDE_CODE_OAUTH_SCOPES` 필수 |
| `CLAUDE_CODE_OAUTH_SCOPES` | 리프레시 토큰 OAuth 스코프 (공백 구분) |

### mTLS

| 변수 | 동작 |
|------|------|
| `CLAUDE_CODE_CLIENT_CERT` | 클라이언트 인증서 파일 경로 |
| `CLAUDE_CODE_CLIENT_KEY` | 클라이언트 개인키 파일 경로 |
| `CLAUDE_CODE_CLIENT_KEY_PASSPHRASE` | 암호화된 개인키 패스프레이즈 (선택) |

### API 키 헬퍼

| 변수 | 동작 |
|------|------|
| `CLAUDE_CODE_API_KEY_HELPER_TTL_MS` | `apiKeyHelper` 크리덴셜 갱신 간격 |

---

## 2. 클라우드 프로바이더

### Bedrock

| 변수 | 동작 |
|------|------|
| `CLAUDE_CODE_USE_BEDROCK` | Bedrock 사용 |
| `ANTHROPIC_BEDROCK_BASE_URL` | Bedrock 엔드포인트 오버라이드 |
| `AWS_BEARER_TOKEN_BEDROCK` | Bedrock API 키 인증 |
| `CLAUDE_CODE_SKIP_BEDROCK_AUTH` | AWS 인증 스킵 (LLM 게이트웨이용) |
| `ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION` | Haiku급 모델 AWS 리전 오버라이드 |
| `ENABLE_PROMPT_CACHING_1H_BEDROCK` | Bedrock 프롬프트 캐시 TTL 5분→1시간 |

### Bedrock Mantle

| 변수 | 동작 |
|------|------|
| `CLAUDE_CODE_USE_MANTLE` | Bedrock Mantle 엔드포인트 사용 |
| `ANTHROPIC_BEDROCK_MANTLE_BASE_URL` | Mantle 엔드포인트 오버라이드 |
| `CLAUDE_CODE_SKIP_MANTLE_AUTH` | Mantle AWS 인증 스킵 |

### Vertex AI

| 변수 | 동작 |
|------|------|
| `CLAUDE_CODE_USE_VERTEX` | Vertex AI 사용 |
| `ANTHROPIC_VERTEX_BASE_URL` | Vertex 엔드포인트 오버라이드 |
| `ANTHROPIC_VERTEX_PROJECT_ID` | GCP 프로젝트 ID (필수) |
| `CLAUDE_CODE_SKIP_VERTEX_AUTH` | Google 인증 스킵 |

### Foundry (Azure)

| 변수 | 동작 |
|------|------|
| `CLAUDE_CODE_USE_FOUNDRY` | Microsoft Foundry 사용 |
| `ANTHROPIC_FOUNDRY_BASE_URL` | Foundry 전체 base URL |
| `ANTHROPIC_FOUNDRY_RESOURCE` | Foundry 리소스명 (`BASE_URL` 미설정 시 필수) |
| `ANTHROPIC_FOUNDRY_API_KEY` | Foundry API 키 |
| `CLAUDE_CODE_SKIP_FOUNDRY_AUTH` | Azure 인증 스킵 |

> [insight] 4개 프로바이더 모두 `SKIP_*_AUTH` 변수가 존재한다. LLM 게이트웨이/프록시 구성에서 Claude Code의 자체 인증을 건너뛰고 게이트웨이가 인증을 처리하게 할 때 사용. 하네스에서 중앙 게이트웨이를 통해 API를 라우팅할 때 필수 설정.

---

## 3. 모델 설정

### 모델 alias 오버라이드

각 모델(Opus/Sonnet/Haiku)에 4개씩 변수 존재:

```
ANTHROPIC_DEFAULT_{OPUS|SONNET|HAIKU}_MODEL              — 모델 ID
ANTHROPIC_DEFAULT_{OPUS|SONNET|HAIKU}_MODEL_NAME          — 표시명
ANTHROPIC_DEFAULT_{OPUS|SONNET|HAIKU}_MODEL_DESCRIPTION   — 설명
ANTHROPIC_DEFAULT_{OPUS|SONNET|HAIKU}_MODEL_SUPPORTED_CAPABILITIES — 지원 기능
```

### 기타 모델

| 변수 | 동작 |
|------|------|
| `ANTHROPIC_MODEL` | 사용할 모델 설정명 |
| `ANTHROPIC_CUSTOM_MODEL_OPTION` | `/model` 선택기에 커스텀 모델 추가 (빌트인 미교체) |
| `ANTHROPIC_CUSTOM_MODEL_OPTION_NAME` | 커스텀 모델 표시명 |
| `ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION` | 커스텀 모델 설명 |
| `CLAUDE_CODE_SUBAGENT_MODEL` | 서브에이전트 모델 (model-config 참조) |
| `ANTHROPIC_SMALL_FAST_MODEL` | **[DEPRECATED]** Haiku급 백그라운드 태스크 모델 |
| `CLAUDE_CODE_EFFORT_LEVEL` | effort 레벨: `low`, `medium`, `high`, `max`, `auto`. `/effort`와 설정보다 우선 |
| `CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP` | Opus 4.0/4.1 → 현재 Opus 자동 리매핑 비활성화 |

---

## 4. 컨텍스트 & 압축

| 변수 | 동작 |
|------|------|
| `CLAUDE_CODE_DISABLE_1M_CONTEXT` | 1M 컨텍스트 윈도우 비활성화 (엔터프라이즈 컴플라이언스) |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | 자동 압축 계산용 컨텍스트 용량 오버라이드 (기본: 모델 윈도우 크기) |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | 자동 압축 트리거 퍼센트 (1-100, 기본 ~95%). 메인 대화 + 서브에이전트 적용 |
| `DISABLE_AUTO_COMPACT` | 자동 압축 비활성화 (수동 `/compact`는 유지) |
| `DISABLE_COMPACT` | 모든 압축 비활성화 (자동 + 수동) |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | 최대 출력 토큰 수. 유효 컨텍스트 윈도우를 줄여 자동 압축 앞당김 |
| `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS` | 파일 읽기 기본 토큰 한도 오버라이드 |

---

## 5. 도구 동작

### Bash

| 변수 | 동작 |
|------|------|
| `BASH_DEFAULT_TIMEOUT_MS` | Bash 기본 타임아웃 (기본 120,000ms = 2분) |
| `BASH_MAX_TIMEOUT_MS` | 모델이 설정 가능한 최대 타임아웃 (기본 600,000ms = 10분) |
| `BASH_MAX_OUTPUT_LENGTH` | Bash 출력 최대 문자 수 (초과 시 중간 잘림) |
| `CLAUDE_CODE_BASH_MAINTAIN_PROJECT_WORKING_DIR` | 각 Bash 명령 후 원래 작업 디렉토리로 복귀 |
| `CLAUDE_CODE_SHELL` | 셸 자동 감지 오버라이드 |
| `CLAUDE_CODE_SHELL_PREFIX` | 모든 Bash 명령에 래핑되는 접두 명령 (로깅/감사용) |
| `CLAUDE_ENV_FILE` | 각 Bash 명령 전 소싱할 셸 스크립트 경로 (virtualenv/conda 유지) |
| `CLAUDE_CODE_USE_POWERSHELL_TOOL` | Windows PowerShell 도구 활성화 (옵트인 프리뷰, WSL 제외) |

### Glob

| 변수 | 동작 |
|------|------|
| `CLAUDE_CODE_GLOB_HIDDEN` | `false` → dotfile 제외 (기본 포함) |
| `CLAUDE_CODE_GLOB_NO_IGNORE` | `false` → `.gitignore` 패턴 존중 (기본 전체 반환) |
| `CLAUDE_CODE_GLOB_TIMEOUT_SECONDS` | Glob 타임아웃 (기본 20초, WSL 60초) |

### API 통신

| 변수 | 동작 |
|------|------|
| `API_TIMEOUT_MS` | API 요청 타임아웃 (기본 600,000ms = 10분, 최대 2,147,483,647) |
| `CLAUDE_CODE_MAX_RETRIES` | API 실패 재시도 횟수 (기본 10) |
| `CLAUDE_ENABLE_STREAM_WATCHDOG` | 90초 이상 스트리밍 멈춤 시 연결 중단 |
| `CLAUDE_STREAM_IDLE_TIMEOUT_MS` | 스트림 유휴 워치독 타임아웃 (기본 90,000ms) |
| `CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK` | 스트리밍 실패 시 비스트리밍 폴백 비활성화 |
| `CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING` | 세밀한 도구 입력 스트리밍 강제 활성화 (Anthropic API 전용) |
| `DISABLE_PROMPT_CACHING` | 모든 모델 프롬프트 캐싱 비활성화 |
| `DISABLE_PROMPT_CACHING_{OPUS\|SONNET\|HAIKU}` | 모델별 프롬프트 캐싱 비활성화 |
| `CLAUDE_CODE_PROXY_RESOLVES_HOSTS` | 프록시가 DNS 해석 수행하도록 허용 |

---

## 6. 기능 비활성화 (`DISABLE_*`)

| 변수 | 동작 |
|------|------|
| `CLAUDE_CODE_DISABLE_FAST_MODE` | fast mode 비활성화 |
| `CLAUDE_CODE_DISABLE_THINKING` | 확장 사고 강제 비활성화 |
| `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` | Opus/Sonnet 4.6 적응형 추론 비활성화 → 고정 예산 폴백 |
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY` | auto memory 비활성화 (`0`으로 강제 활성화도 가능) |
| `CLAUDE_CODE_DISABLE_CLAUDE_MDS` | CLAUDE.md 메모리 파일 로드 방지 |
| `CLAUDE_CODE_DISABLE_ATTACHMENTS` | 첨부 처리 비활성화. `@` 파일 멘션 → 플레인 텍스트 |
| `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` | 모든 백그라운드 태스크 비활성화 (`run_in_background`, auto-backgrounding, Ctrl+B) |
| `CLAUDE_CODE_DISABLE_CRON` | 스케줄 태스크 비활성화. `/loop` + cron 도구 사용 불가 |
| `CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING` | 파일 체크포인팅 비활성화. `/rewind` 코드 복원 불가 |
| `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS` | 시스템 프롬프트에서 커밋/PR 워크플로 지침 + git status 스냅샷 제거 |
| `CLAUDE_CODE_DISABLE_MOUSE` | 풀스크린 마우스 추적 비활성화 |
| `CLAUDE_CODE_DISABLE_TERMINAL_TITLE` | 자동 터미널 타이틀 업데이트 비활성화 |
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | Anthropic 베타 헤더/스키마 필드 제거 |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | = `DISABLE_AUTOUPDATER` + `DISABLE_FEEDBACK_COMMAND` + `DISABLE_ERROR_REPORTING` + `DISABLE_TELEMETRY` |
| `DISABLE_INTERLEAVED_THINKING` | interleaved-thinking 베타 헤더 전송 방지 |

### 명령 숨기기

| 변수 | 동작 |
|------|------|
| `DISABLE_DOCTOR_COMMAND` | `/doctor` 숨기기 |
| `DISABLE_EXTRA_USAGE_COMMAND` | `/extra-usage` 숨기기 |
| `DISABLE_FEEDBACK_COMMAND` | `/feedback` 비활성화 (alias: `DISABLE_BUG_COMMAND`) |
| `DISABLE_INSTALL_GITHUB_APP_COMMAND` | `/install-github-app` 숨기기 |
| `DISABLE_LOGIN_COMMAND` | `/login` 숨기기 |
| `DISABLE_LOGOUT_COMMAND` | `/logout` 숨기기 |
| `DISABLE_UPGRADE_COMMAND` | `/upgrade` 숨기기 |

### 텔레메트리 & 업데이트

| 변수 | 동작 |
|------|------|
| `DISABLE_AUTOUPDATER` | 자동 업데이트 비활성화 |
| `DISABLE_TELEMETRY` | Statsig 텔레메트리 옵트아웃 |
| `DISABLE_ERROR_REPORTING` | Sentry 에러 리포팅 옵트아웃 |
| `DISABLE_INSTALLATION_CHECKS` | 설치 경고 비활성화 |
| `DISABLE_COST_WARNINGS` | 비용 경고 비활성화 |
| `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY` | 세션 품질 설문 비활성화 (텔레메트리 비활성화 시 자동) |
| `CLAUDE_CODE_ENABLE_TELEMETRY` | OpenTelemetry 데이터 수집 활성화 |

---

## 7. 플러그인 & MCP

| 변수 | 동작 |
|------|------|
| `CLAUDE_CODE_PLUGIN_CACHE_DIR` | 플러그인 루트 디렉토리 오버라이드 (기본 `~/.claude/plugins`) |
| `CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS` | 플러그인 git 작업 타임아웃 (기본 120,000ms) |
| `CLAUDE_CODE_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE` | git pull 실패 시 마켓플레이스 캐시 유지 (재클론 대신) |
| `CLAUDE_CODE_PLUGIN_SEED_DIR` | 읽기 전용 플러그인 시드 디렉토리 (`:` 구분, Windows `;`) |
| `CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL` | 첫 실행 시 공식 마켓플레이스 자동 추가 스킵 |
| `CLAUDE_CODE_SYNC_PLUGIN_INSTALL` | 비인터랙티브에서 플러그인 설치 완료까지 대기 |
| `CLAUDE_CODE_SYNC_PLUGIN_INSTALL_TIMEOUT_MS` | 동기 플러그인 설치 타임아웃 |
| `ENABLE_CLAUDEAI_MCP_SERVERS` | `false`로 claude.ai MCP 서버 비활성화 (로그인 사용자 기본 활성) |
| `ENABLE_TOOL_SEARCH` | `true`로 비퍼스트파티 호스트에서 MCP tool search 활성화 |

---

## 8. 서브에이전트 & 팀

| 변수 | 동작 |
|------|------|
| `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS` | 빌트인 서브에이전트(Explore, Plan) 비활성화. 비인터랙티브 전용 |
| `CLAUDE_AGENT_SDK_MCP_NO_PREFIX` | MCP 도구명에서 `mcp__<server>__` 접두사 제거. SDK 전용 |
| `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` | 최대 병렬 읽기전용 도구/서브에이전트 (기본 10) |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | 에이전트 팀 실험 기능 활성화 |
| `CLAUDE_CODE_TASK_LIST_ID` | 같은 ID로 세션 간 태스크 리스트 공유 |
| `CLAUDE_CODE_TEAM_NAME` | 이 팀메이트가 속한 에이전트 팀명 |
| `CLAUDE_CODE_AUTO_BACKGROUND_TASKS` | ~2분 이상 에이전트 태스크 자동 백그라운딩 강제 활성화 |
| `CLAUDE_CODE_ENABLE_TASKS` | 비인터랙티브에서 태스크 추적 활성화 (인터랙티브는 기본 ON) |

---

## 9. UI & 접근성

| 변수 | 동작 |
|------|------|
| `CLAUDE_CODE_NO_FLICKER` | 풀스크린 렌더링 활성화 (플리커 감소) |
| `CLAUDE_CODE_SCROLL_SPEED` | 풀스크린 마우스 스크롤 배수 (1-20) |
| `CLAUDE_CODE_ACCESSIBILITY` | 네이티브 터미널 커서 유지 + 반전 텍스트 비활성화. 화면 확대기 지원 |
| `CLAUDE_CODE_SYNTAX_HIGHLIGHT` | `false`로 diff 구문 강조 비활성화 |
| `CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION` | `false`로 프롬프트 제안(응답 후 회색 예측) 비활성화 |

---

## 10. 경로 & 환경

| 변수 | 동작 |
|------|------|
| `CLAUDE_CONFIG_DIR` | 설정 디렉토리 오버라이드 (기본 `~/.claude`). 다중 계정에 유용 |
| `CLAUDE_CODE_TMPDIR` | 임시 디렉토리 오버라이드 (macOS 기본 `/tmp`, Linux/Windows `os.tmpdir()`) |
| `CLAUDE_CODE_GIT_BASH_PATH` | Windows: Git Bash 실행파일 경로 (PATH에 없을 때) |
| `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` | `--add-dir` 디렉토리에서 CLAUDE.md 로드 |
| `CLAUDE_CODE_DEBUG_LOGS_DIR` | 디버그 로그 **파일** 경로 (이름과 달리 디렉토리 아님). 디버그 모드 별도 활성화 필요 |
| `CLAUDE_CODE_DEBUG_LOG_LEVEL` | 디버그 파일 최소 레벨: `verbose`, `debug`(기본), `info`, `warn`, `error` |
| `CLAUDE_CODE_IDE_HOST_OVERRIDE` | IDE 확장 연결 호스트 오버라이드 |
| `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL` | IDE 확장 자동 설치 스킵 |
| `CLAUDE_CODE_IDE_SKIP_VALID_CHECK` | IDE 락파일 검증 스킵 |
| `CLAUDE_CODE_AUTO_CONNECT_IDE` | IDE 자동 연결 오버라이드 (`false`=방지, `true`=강제) |

---

## 11. SDK & 자동화

| 변수 | 동작 |
|------|------|
| `CLAUDECODE` | Claude Code가 스폰한 셸 환경에서 `1`로 설정됨. 스크립트에서 Claude Code 내부 실행 감지 |
| `CLAUDE_CODE_SIMPLE` | = `--bare`. 최소 시스템 프롬프트 + Bash/파일 도구만. 자동 탐색 비활성화 |
| `CLAUDE_CODE_RESUME_INTERRUPTED_TURN` | 이전 세션 mid-turn 종료 시 자동 재개 (SDK 모드) |
| `CLAUDE_CODE_EXIT_AFTER_STOP_DELAY` | 쿼리 루프 유휴 후 자동 종료 대기 시간(ms). 자동화/SDK용 |
| `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` | 서브프로세스(Bash, hooks, MCP)에서 Anthropic/클라우드 크리덴셜 제거 |
| `CLAUDE_CODE_NEW_INIT` | `/init`을 skills/hooks/memory 포함 대화형 설정으로 확장 |
| `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS` | SessionEnd 훅 최대 시간 (기본 1,500ms) |
| `CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX` | Remote Control 자동 세션명 접두사 (기본 호스트명) |

---

## 12. OpenTelemetry

| 변수 | 동작 |
|------|------|
| `CLAUDE_CODE_ENABLE_TELEMETRY` | OTEL 데이터 수집 활성화 |
| `CLAUDE_CODE_OTEL_FLUSH_TIMEOUT_MS` | 스팬 플러시 타임아웃 (기본 5,000ms) |
| `CLAUDE_CODE_OTEL_HEADERS_HELPER_DEBOUNCE_MS` | 동적 OTEL 헤더 갱신 간격 (기본 1,740,000ms = 29분) |
| `CLAUDE_CODE_OTEL_SHUTDOWN_TIMEOUT_MS` | 익스포터 셧다운 타임아웃 (기본 2,000ms). 종료 시 메트릭 손실 시 증가 |

> [insight] `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=1`은 Bash 도구, hooks, MCP 서버의 서브프로세스에서 Anthropic/클라우드 크리덴셜을 제거한다. 하네스에서 서드파티 MCP 서버나 플러그인을 실행할 때, 크리덴셜 유출을 방지하는 필수 보안 설정.

> [insight] `ANTHROPIC_BASE_URL` 설정 시 비퍼스트파티 호스트에서 MCP tool search가 자동 비활성화된다. 프록시가 `tool_reference` 블록을 전달하는 경우 `ENABLE_TOOL_SEARCH=true`를 명시해야 한다. 하네스에서 중앙 프록시를 사용할 때 이 동작을 인지하지 못하면 tool search가 조용히 작동하지 않는다.

> [insight] `CLAUDECODE=1`은 Claude Code가 스폰한 모든 셸 환경에 자동 설정된다. 훅이나 스크립트에서 "지금 Claude Code 안에서 실행 중인가?"를 감지하는 공식 방법. `CLAUDE_CODE_SIMPLE`은 `--bare` 모드의 환경변수 버전으로, 훅에서 bare 모드 감지에도 사용 가능.
