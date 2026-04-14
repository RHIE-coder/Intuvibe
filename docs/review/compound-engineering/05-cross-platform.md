# Compound Engineering - Cross-Platform System

> 10 targets, converter CLI architecture, sync system, MCP merge strategies, content transformation pipeline

---

## 1. 아키텍처 개요

### Universal IR 파이프라인

```
Claude Plugin (source)
  ↓  parse (src/parsers/claude.ts)
ClaudePlugin (Universal IR)
  ↓  convert (src/converters/claude-to-*.ts)
Platform-Specific Bundle (*Bundle)
  ↓  write (src/targets/*.ts)
Filesystem (target platform format)
```

**핵심**: Claude Code가 **단일 소스 포맷**. 모든 변환은 `ClaudePlugin` IR을 거쳐 각 플랫폼 번들로 출력.

### 10 Active Targets

| # | Target | Output Root | Config Format | 특징 |
|---|--------|-------------|---------------|------|
| 1 | **OpenCode** | `~/.config/opencode/` | `opencode.json` | 기본 타겟, 가장 완성도 높음 |
| 2 | **Codex** | `~/.codex/` | `config.toml` | Managed TOML block, `$skill` 참조 모델 |
| 3 | **Copilot** | `.github/` | `copilot-mcp-config.json` | `.agent.md` 파일, `COPILOT_MCP_` env prefix |
| 4 | **Droid** | `~/.factory/` | — | Commands + Droids, MCP 별도 `mcp.json` |
| 5 | **Gemini** | `.gemini/` | `settings.json` | TOML 커맨드 포맷, 중복 스킬 경고 처리 |
| 6 | **Kiro** | `~/.kiro/` | JSON agent config | stdio MCP만 지원, 이름 64자 제한 |
| 7 | **OpenClaw** | `~/.openclaw/` | npm 패키지 생성 | `package.json` + `index.ts` + manifest |
| 8 | **Pi** | `~/.pi/agent/` | MCPorter config | MCP proxy layer (MCPorter), compat extension |
| 9 | **Qwen** | `~/.qwen/` | `qwen-extension.json` | YAML agents, env var → Settings 자동 추출 |
| 10 | **Windsurf** | `~/.codeium/windsurf/` | `mcp_config.json` | **유일한 scope 지원** (global/workspace) |

**참고**: Overview에서 11개로 언급했으나, Cursor는 docs/specs/에 스펙만 존재하고 converter/target 구현은 없음. 실제 구현 = **10개**.

---

## 2. CLI 구조

### Runtime & Entry

```json
// package.json
{
  "name": "@every-env/compound-plugin",
  "version": "2.63.1",
  "bin": { "compound-plugin": "src/index.ts" }
}
```

**의존성**: `citty` (CLI 프레임워크), `js-yaml` (YAML 파싱). Bun 런타임.

### 5 Commands

| Command | 용도 | 주요 플래그 |
|---------|------|-----------|
| **convert** | 로컬 플러그인 → 타겟 변환 | `--to`, `--scope`, `--permissions`, `--agent-mode`, `--also` |
| **install** | 번들/GitHub에서 fetch + convert | `--branch`, `--to` |
| **sync** | `~/.claude/` config → 타겟 동기화 | `--target`, `--claude-home` |
| **list** | 번들 플러그인 목록 | — |
| **plugin-path** | 브랜치를 캐시 경로로 체크아웃 | 브랜치 이름 |

### convert 주요 플래그

```bash
bunx @every-env/compound-plugin convert ./plugins/compound-engineering \
  --to codex \              # 타겟 플랫폼 (또는 'all')
  --permissions broad \     # none | broad | from-commands
  --agent-mode subagent \   # primary | subagent
  --also gemini,kiro \      # 추가 타겟
  --scope global            # global | workspace (windsurf만)
```

| 플래그 | 기본값 | 설명 |
|--------|--------|------|
| `--to` | `opencode` | 타겟 플랫폼 (`all` = 감지된 모든 도구) |
| `--permissions` | `broad` (convert), `none` (install) | 권한 모드 |
| `--agent-mode` | `subagent` | 에이전트 모델 상속 방식 |
| `--infer-temperature` | `true` | 모델에서 temperature 추론 |

### install 플러그인 해결 우선순위

```
1. 로컬 경로 (., /, ~ 시작)
2. 번들 플러그인 (../../plugins/<name>)  ← --branch 없을 때
3. GitHub 클론 → 임시 디렉토리           ← --branch 있거나 번들 없을 때
```

GitHub 소스: `COMPOUND_PLUGIN_GITHUB_SOURCE` env var로 오버라이드 가능.

### plugin-path 캐싱

```
~/.cache/compound-engineering/branches/<plugin>-<sanitized-branch>/
```

브랜치 이름 변환: `/` → `~`, 기타 unsafe → percent-encoding. 존재하면 `git fetch + reset --hard`.

---

## 3. Universal IR: ClaudePlugin

### 타입 정의

```typescript
// src/types/claude.ts
export type ClaudePlugin = {
  root: string
  manifest: ClaudeManifest
  agents: ClaudeAgent[]
  commands: ClaudeCommand[]
  skills: ClaudeSkill[]
  hooks?: ClaudeHooks
  mcpServers?: Record<string, ClaudeMcpServer>
}

export type ClaudeAgent = {
  name: string
  description?: string
  capabilities?: string
  model?: string          // "inherit" → 변환 시 제거
  body: string
  sourcePath: string
}

export type ClaudeCommand = {
  name: string
  description?: string
  argumentHint?: string
  model?: string
  allowedTools?: string[]
  disableModelInvocation?: boolean   // true → 일부 타겟에서 제외
  body: string
  sourcePath: string
}

export type ClaudeSkill = {
  name: string
  description?: string
  argumentHint?: string
  disableModelInvocation?: boolean
  ce_platforms?: string[]   // 플랫폼 필터링 (없으면 모든 플랫폼)
  sourceDir: string
  skillPath: string
}
```

### 핵심 필터링 메커니즘

```typescript
// ce_platforms: 특정 플랫폼에만 스킬 배포
export function filterSkillsByPlatform(
  skills: ClaudeSkill[],
  platform: string
): ClaudeSkill[]
```

```typescript
// disableModelInvocation: true → 변환 시 제외
// Codex: prompts/skills 모두에서 제외
// OpenCode: commandFiles에서 제외
```

### Hooks 타입

```typescript
export type ClaudeHookEntry =
  | { type: "command"; command: string; timeout?: number }
  | { type: "prompt"; prompt: string }
  | { type: "agent"; agent: string }

export type ClaudeHooks = {
  hooks: Record<string, ClaudeHookMatcher[]>
}
```

**Hooks 지원 현황**: OpenCode만 완전 변환 (PreToolUse → try/catch 래핑). Gemini, Kiro는 "hooks incompatible" 경고.

---

## 4. Converter 패턴

### 4.1 Content Transformation (모든 converter 공통)

각 converter에는 `transformContentFor*()` 함수가 있으며, 4가지 변환을 수행:

| 변환 | Claude 소스 | 타겟 예시 (Codex) |
|------|-------------|-------------------|
| **Sub-agent 호출** | `Task agent-name(args)` | `Use the $agent-name skill to: args` |
| **FQ agent 참조** | `compound-engineering:review:security-sentinel` | `security-sentinel` (최종 세그먼트만) |
| **경로 재작성** | `.claude/`, `~/.claude/` | `.codex/`, `~/.codex/` (타겟별) |
| **슬래시 커맨드** | `/foo:bar` | `/prompts:foo-bar` (콜론 → 하이픈) |

### 4.2 Model Normalization

```typescript
// 별칭 → 정규화
"haiku"  → "anthropic/claude-haiku-4-5"
"sonnet" → "anthropic/claude-sonnet-4-20250514"

// inherit → 제거
"model: inherit" → (model 필드 생략)

// subagent mode → model 제거 (provider 상속)
agent-mode: subagent → (model 필드 생략)
```

### 4.3 Name Normalization (공통)

```typescript
function normalizeName(value: string): string {
  // lowercase → [:/\s] → '-' → strip non-[a-z0-9_-] → collapse hyphens → trim
}

function uniqueName(base: string, usedSet: Set<string>): string {
  // 중복 시 -2, -3 suffix
}

function sanitizeDescription(value: string, maxLength: number): string {
  // 단어 경계에서 ellipsis 절단
}
```

### 4.4 Converter별 고유 패턴

| Converter | 고유 패턴 |
|-----------|----------|
| **OpenCode** | Permission mapping (`none/broad/from-commands`), hook → plugin `.ts` 변환 |
| **Codex** | `$skill` 참조 모델, managed TOML block, `workflows:` 별칭 → `ce:` 정규화 |
| **Copilot** | `_compound_managed_mcp` 추적 키, `COPILOT_MCP_` env prefix |
| **Gemini** | TOML 출력 (`"""`  multi-line), hooks 비호환 경고 |
| **Kiro** | 도구 매핑 (`Bash→shell`, `Edit→write`, `Task→use_subagent`), 이름 64자 제한, stdio MCP만 |
| **OpenClaw** | npm 패키지 생성 (`package.json` + `index.ts` + `api.registerCommand()`) |
| **Pi** | MCPorter MCP proxy, compat extension 생성, AGENTS.md managed block |
| **Qwen** | env var placeholder → `QwenSetting[]` 자동 추출, `CONTEXT.md` 생성, stdio MCP만 |
| **Windsurf** | scope 지원 (`global/workspace`), `global_workflows/` vs `workflows/` |
| **Droid** | Commands + Droids 분리, MCP 별도 `mcp.json` |

---

## 5. MCP Merge Strategies

### 타겟별 MCP 처리

| Target | 전략 | Config 파일 | 충돌 시 |
|--------|------|-------------|---------|
| **OpenCode** | `mergeJsonConfigAtKey` | `opencode.json` → `"mcp"` | **User wins** (기존 우선) |
| **Codex** | Managed TOML block | `config.toml` | Block 교체 (관리 영역만) |
| **Copilot** | `_compound_managed_mcp` 추적 | `copilot-mcp-config.json` | Stale 자동 정리 |
| **Gemini** | `mergeJsonConfigAtKey` | `settings.json` → `"mcpServers"` | 기존 우선 |
| **Kiro** | `mergeJsonConfigAtKey` | `settings/mcp.json` | 기존 우선, **stdio만** |
| **OpenClaw** | 직접 병합 | `openclaw.json` | **Incoming wins** (플러그인 우선) |
| **Pi** | MCPorter config | `mcporter.json` | 기존 우선 |
| **Qwen** | dual tracking key | `settings.json` → `"mcpServers"` | Stale 자동 정리 |
| **Windsurf** | `mergeJsonConfigAtKey` | `mcp_config.json` | 기존 우선 |
| **Droid** | `mergeJsonConfigAtKey` | `mcp.json` → `"mcpServers"` | 기존 우선 |

### MCP Transport 변환

```typescript
// src/sync/mcp-transports.ts
hasExplicitSseTransport(server)     // type: "sse"
hasExplicitHttpTransport(server)    // type: "http" | "streamable"
hasExplicitRemoteTransport(server)  // either of above
```

| Claude 소스 | OpenCode | Codex | Copilot | Kiro | Qwen |
|-------------|----------|-------|---------|------|------|
| stdio | `{ type: "local", command: [...] }` | TOML block | `{ type: "local" }` | `{ command, args }` | `{ command, args }` |
| SSE URL | `{ type: "remote", url }` | TOML block | `{ type: "sse", url }` | — (stdio only) | `{ url, headers }` |
| HTTP URL | `{ type: "remote", url }` | TOML block | `{ type: "http", url }` | — (stdio only) | `{ httpUrl, headers }` |

---

## 6. Sync System

### 구조

```
src/sync/
├── registry.ts         # 10 SyncTargetDefinition 등록
├── commands.ts         # 타겟별 커맨드 변환 함수 (최대 파일, 6.7KB)
├── skills.ts           # 스킬 symlink (복사가 아님!)
├── json-config.ts      # JSON config 병합 유틸리티
├── mcp-transports.ts   # MCP transport 감지
├── opencode.ts         # sync: skills + commands + MCP
├── codex.ts            # sync: skills + commands + MCP (TOML)
├── copilot.ts          # sync: skills + commands + MCP
├── droid.ts            # sync: skills + commands + MCP
├── gemini.ts           # sync: skills + commands + MCP
├── kiro.ts             # sync: skills + commands + MCP
├── pi.ts               # sync: skills + commands + MCP (MCPorter)
├── qwen.ts             # sync: skills + commands + MCP
├── windsurf.ts         # sync: skills + commands + MCP
└── openclaw.ts         # sync: skills only (commands/MCP 미지원 경고)
```

### Convert vs Sync의 차이

| | Convert | Sync |
|---|---------|------|
| **소스** | 플러그인 디렉토리 전체 | `~/.claude/` 개인 config |
| **대상** | 지정된 출력 경로 | 자동 감지된 도구 경로 |
| **내용** | agents + commands + skills + hooks + MCP | skills (symlink) + commands + MCP |
| **목적** | 플러그인 배포 | 개인 설정 동기화 |

### Auto-Detection

```typescript
// sync --target all
detectInstalledTools() → 파일시스템 탐색으로 설치된 도구 감지

// 감지 경로 예시:
codex:    ~/.codex
pi:       ~/.pi
gemini:   .gemini/, ~/.gemini
windsurf: ~/.codeium/windsurf, .windsurf/
copilot:  ~/.copilot, .github/skills, .github/agents
```

### Skills = Symlink (복사가 아님)

```typescript
// src/sync/skills.ts
forceSymlink(sourceDir, targetDir)
// → 스킬 디렉토리를 타겟에 심링크
// → 원본 하나만 관리하면 모든 플랫폼에 반영
```

**핵심**: 스킬은 **심링크**로 연결. 원본 수정 시 모든 타겟에 즉시 반영. 커맨드만 per-platform 변환.

### Managed Block 패턴 (Codex TOML)

```toml
# 기존 사용자 설정 (보존)
[mcp]
  [mcp.user-server]
  type = "stdio"

# BEGIN Compound Engineering plugin MCP
[mcp.plugin-server]
type = "stdio"
command = "node"
args = ["server.js"]
# END Compound Engineering plugin MCP
```

`BEGIN/END` 마커로 관리 영역 분리. 업데이트 시 관리 영역만 교체, 사용자 설정 보존.

### Security

```typescript
// 파일 쓰기 시 권한 제한
writeTextSecure(path, content, 0o600)  // owner만 읽기/쓰기

// MCP env var 비밀 감지
sync.ts → loadClaudeHome() → 잠재적 secrets 경고
```

---

## 7. Platform Specs (docs/specs/)

### 8 Spec 문서

```
docs/specs/
├── claude-code.md    # 소스 플랫폼 레퍼런스
├── opencode.md       # config 우선순위, 권한 모델
├── codex.md          # 프롬프트/스킬 구조
├── copilot.md        # .github/ 구조, agent .md
├── gemini.md         # TOML 커맨드, settings.json
├── kiro.md           # JSON agent config, steering
├── windsurf.md       # scope, workflows
└── cursor.md         # 스펙만 (구현 없음)
```

### Lossy Mapping 예시 (Kiro Spec)

| Claude Code 기능 | Kiro 대응 | 손실 |
|-------------------|----------|------|
| Agent `model: inherit` | — | 모델 상속 없음 |
| Agent `tools: [Bash, Read]` | `tools: ["*"]` only | 세분화된 도구 제한 불가 |
| Hooks (21 events) | 5 trigger types | 대부분 이벤트 매핑 불가 |
| MCP HTTP/SSE | — | stdio만 지원 |

---

## 8. 테스트 커버리지

### 49+ Test Files

| 카테고리 | 파일 수 | 테스트 대상 |
|----------|:-------:|------------|
| **Converter tests** | 10+ | 각 `claude-to-*.ts` 변환 로직 |
| **Writer tests** | 10+ | 각 `write*Bundle()` 파일시스템 출력 |
| **Sync tests** | 10+ | 각 `syncTo*()` 동기화 로직 |
| **Parser tests** | 2+ | `claude.ts`, `claude-home.ts` 파싱 |
| **Utility tests** | 5+ | name normalization, model mapping |
| **Integration** | 2+ | end-to-end convert + write |

### 핵심 테스트 패턴

```typescript
// converter.test.ts — OpenCode 예시
test("model normalization", () => {
  // "haiku" → "anthropic/claude-haiku-4-5"
  // "inherit" → 제거
  // subagent mode → model 제거
})

test("from-commands permission", () => {
  // allowedTools → OpenCode permission block 매핑
})

test("content transformation", () => {
  // FQ agent refs (3-segment → final segment)
  // .claude/ → .opencode/ 경로 재작성
  // URL과 CSS 선택자는 변환하지 않음
})
```

```typescript
// sync-codex.test.ts
test("managed TOML block", () => {
  // BEGIN/END 마커 사이만 교체
  // 마커 밖 사용자 설정 보존
  // MCP 없으면 managed block 삭제
  // 파일 권한 0o600
})
```

---

## 9. Superpowers/bkit/Compound 비교

| 측면 | Superpowers | bkit | Compound |
|------|-------------|------|----------|
| **플랫폼 수** | 6 (수동 매핑) | 1 (Claude Code only) | **10 (자동 converter)** |
| **변환 방식** | 수동 마크다운 파일 | — | **TypeScript CLI + Universal IR** |
| **스킬 배포** | 파일 복사 | npm install | **Symlink (sync) / Convert (deploy)** |
| **MCP 처리** | 없음 | 없음 | **10 strategy (target별 merge)** |
| **Config 보호** | 없음 | 없음 | **User-wins / Managed block** |
| **Auto-detection** | 없음 | 없음 | **파일시스템 기반 도구 감지** |
| **플랫폼 필터** | 없음 | 없음 | **`ce_platforms` 필드** |

---

## 10. 하네스 설계 시사점

### 채용할 패턴

1. **Universal IR + Converter 패턴** — 단일 소스 포맷을 정의하고 타겟별 converter를 분리. 새 플랫폼 추가 = converter + type + target writer 추가.

2. **Skills Symlink** — 스킬 디렉토리를 심링크로 연결하여 원본 하나만 관리. 변환이 필요한 것은 commands만.

3. **Managed Block / Tracking Key** — 플러그인이 관리하는 config 영역과 사용자 영역을 명확히 분리. BEGIN/END 마커 또는 `_managed` 추적 키.

4. **Content Transformation Pipeline** — 플랫폼별 `transformContentFor*()` 함수로 path, agent ref, command syntax를 체계적으로 변환.

5. **`ce_platforms` 필터** — 특정 스킬을 특정 플랫폼에만 배포하는 선언적 메커니즘.

6. **Auto-Detection** — 파일시스템 기반으로 설치된 도구를 감지하여 `--target all` 자동화.

### 주의할 패턴

1. **Lossy Mapping** — 플랫폼마다 기능 차이가 크고 (Kiro: stdio만, hooks 5개만), 변환 시 손실 불가피. 각 타겟의 제약을 문서화하고 경고해야 함.

2. **10개 타겟 유지보수** — converter/type/target/sync/test 5개 파일 × 10 타겟 = 50+ 파일. 새 플랫폼 추가 비용이 점점 증가.

3. **Cursor 미구현** — 스펙은 있지만 구현이 없는 상태가 오래 지속될 수 있음. "implemented: false" 상태 관리 필요.

---

**다음 단계**: Step 6 — Docs & Knowledge System (brainstorms/plans/solutions, knowledge compounding) deep dive
