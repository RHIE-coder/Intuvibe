# Review Index

> 외부 도구, 플랫폼, 플러그인, 하네스 관련 자료를 읽고 `packages/harness` 설계에 연결하기 위한 리뷰 문서 모음.
> 목적은 단순 링크 수집이 아니라, **비교군 확보와 구조적 교훈 추출**이다.

---

## 역할

`docs/review/`는 크게 두 종류의 문서를 담는다.

- **도구 / 플랫폼 리뷰**
  Claude Code, Codex, Compound Engineering, bkit, Superpowers 같은 실제 에이전트 도구와 프레임워크
- **하네스 관점 비교**
  업계 문서와 실험 결과를 바탕으로, 현재 하네스 설계와 어디가 맞고 어디가 다른지 비교하는 자료

즉 여기 문서들은 단순 사용법 문서가 아니라, 하네스 구조를 더 잘 설계하기 위한 **대조군 라이브러리**에 가깝다.

---

## 리뷰 묶음

| 폴더 | 성격 | 진입 문서 |
|---|---|---|
| `bkit/` | Claude Code 기반 PDCA/Context Engineering 플러그인 리뷰 | [README.md](bkit/README.md) |
| `claude-ai/` | Claude Code 공식 문서 해설/정리 | [README.md](claude-ai/README.md) |
| `claude-cookbooks/` | Claude 관련 cookbook 분석 메모 | [README.md](claude-cookbooks/README.md) |
| `codex-cli/` | Codex CLI 빠른 실전 메모 | [README.md](codex-cli/README.md) |
| `compound-engineering/` | Compound Engineering plugin 리뷰 | [README.md](compound-engineering/README.md) |
| `harness-engineering/` | Anthropic/OpenAI/ETH Zürich 하네스 개념 비교 | [README.md](harness-engineering/README.md) |
| `openai-codex/` | OpenAI Codex 공식 문서 기반 장문 리뷰 | [README.md](openai-codex/README.md) |
| `superpowers/` | obra/superpowers 구조와 철학 리뷰 | [README.md](superpowers/README.md) |

---

## Codex 관련 문서 구분

Codex 관련 문서는 두 묶음으로 나뉜다.

### `codex-cli/`

- 빠른 실전 참조
- Claude 사용자 기준 대응표
- 자주 쓰는 명령 다시 보기
- marketplace / MCP / config 메모

### `openai-codex/`

- OpenAI 공식 문서 기준 장문 리뷰
- Codex를 운영 플랫폼으로 읽기
- config / rules / hooks / AGENTS.md / skills / plugins / automation 구조 분석

한 줄로 정리하면:

- `codex-cli/` = quick reference
- `openai-codex/` = official docs review

---

## 하네스 설계와 가장 직접 연결되는 묶음

현재 하네스 구조를 설계하거나 비교할 때 우선순위는 대체로 이렇다.

1. [openai-codex](openai-codex/README.md)
2. [claude-ai](claude-ai/README.md)
3. [harness-engineering](harness-engineering/README.md)
4. [compound-engineering](compound-engineering/README.md)
5. [superpowers](superpowers/README.md)
6. [bkit](bkit/README.md)

이 순서는 "공식 플랫폼 구조 -> 하네스 개념 -> 실제 OSS 구현체" 순서로 읽는 흐름에 가깝다.

---

## 메모

- 각 폴더의 `2026.04` 파일은 스냅샷 마커다.
- 주요 review 묶음은 이제 대부분 `README.md`를 진입 문서로 가진다.
- 공식 문서 기반 리뷰는 가능하면 원문 우선, 접근이 막히는 경우에만 보조 출처를 사용한다.
