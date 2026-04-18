# Codex CLI Cheatsheet for Claude Users

기준: 로컬 `codex --help` 기준으로 빠르게 대응해보는 메모.

공식 문서 기반 장문 리뷰는 [openai-codex](../openai-codex/README.md) 참고.

## Quick Mapping

| Claude | Codex |
| --- | --- |
| `claude --dangerously-skip-permissions` | `codex --dangerously-bypass-approvals-and-sandbox` |
| `/clear` | 새 `codex` 세션 시작 |
| 이전 대화 이어가기 | `codex resume --last` |
| 이전 대화 분기하기 | `codex fork --last` |
| `--channels ...` | `marketplace` + `mcp` 중심으로 생각 |

## Common Commands

```bash
# 현재 디렉터리에서 시작
codex

# 특정 프로젝트 기준으로 시작
codex -C /path/to/project

# 완전 무보호 실행
codex --dangerously-bypass-approvals-and-sandbox

# 웹 검색 허용
codex --search

# 이전 세션 이어가기
codex resume --last

# 이전 세션을 복제해서 새 분기 시작
codex fork --last

# 1회성 비대화형 실행
codex exec "이 repo 구조 점검해줘"
```

## Permissions and Execution

- 기본적으로 `--sandbox` 와 `--ask-for-approval` 조합으로 실행 정책을 정한다.
- 자주 쓰는 옵션:
  - `-s read-only`
  - `-s workspace-write`
  - `-s danger-full-access`
  - `-a on-request`
  - `-a never`
- 빠른 자동 실행:

```bash
codex --full-auto
```

- Claude의 `--dangerously-skip-permissions`에 가장 가까운 건:

```bash
codex --dangerously-bypass-approvals-and-sandbox
```

## Marketplace

Codex에서는 Claude의 plugin channel 감각보다 marketplace 등록이 먼저다.

```bash
# GitHub repo 기반 마켓플레이스 추가
codex marketplace add owner/repo

# ref 지정
codex marketplace add owner/repo --ref main

# sparse checkout path 지정
codex marketplace add owner/repo --sparse packages/harness
```

메모:

- `codex marketplace` 로컬 도움말 기준 노출된 하위 명령은 현재 `add` 중심이다.
- 플러그인 배포 구조를 만질 때는 repo layout, marketplace manifest, plugin manifest를 같이 본다.

## MCP

Codex에서 외부 연동은 `channels`보다 `mcp`로 보는 편이 맞다.

```bash
# 등록된 MCP 서버 목록
codex mcp list

# HTTP MCP 서버 추가
codex mcp add telegram --url https://example.com/mcp

# stdio MCP 서버 추가
codex mcp add local-tool -- node ./server.js

# MCP 서버 상세 조회
codex mcp get telegram
```

## Config

전역 설정 파일:

```text
~/.codex/config.toml
```

일회성 오버라이드는 `-c` 로 넣는다.

```bash
codex -c model="gpt-5.4"
codex -c shell_environment_policy.inherit=all
codex -c model="gpt-5.4" -c shell_environment_policy.inherit=all
```

## Practical Translation

Claude에서 이런 식으로 썼다면:

```bash
claude --dangerously-skip-permissions
claude --dangerously-skip-permissions --channels plugin:telegram@claude-plugins-official
```

Codex에서는 대체로 이렇게 생각하면 된다:

```bash
codex --dangerously-bypass-approvals-and-sandbox
codex marketplace add owner/repo
codex mcp add telegram --url https://example.com/mcp
```

핵심 차이:

- `/clear`보다는 새 세션, `resume`, `fork`
- `channels`보다는 `marketplace`와 `mcp`
- 권한 스킵은 `--dangerously-bypass-approvals-and-sandbox`
