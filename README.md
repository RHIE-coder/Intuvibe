# intuvibe

Claude Code용 플러그인 마켓플레이스.

## 설치

```bash
# 1. marketplace 등록
claude plugin marketplace add rhie-coder/intuvibe

# 2. 플러그인 설치
claude plugin install intuvibe-harness
```

## 업데이트

```bash
# marketplace 최신화 (새 플러그인 목록, 버전 정보 반영)
claude plugin marketplace update intuvibe

# 특정 플러그인 업데이트
claude plugin install intuvibe-harness
```

## 삭제

```bash
# 플러그인 삭제
claude plugin uninstall intuvibe-harness

# marketplace 자체를 제거하려면
claude plugin marketplace remove intuvibe
```

## 플러그인 목록

| 플러그인 | 버전 | 설명 |
|----------|------|------|
| `intuvibe-harness` | 0.3.0 | Agentic engineering harness — 워크플로우, 가드레일, 품질 파이프라인, trace observability |

## 버전 관리

`git tag`는 마켓플레이스 버전 단위로 관리한다 (예: `v0.1.0`).
태그별 플러그인 버전 이력은 [RELEASES.md](RELEASES.md) 참고.

## 구조

```text
.
├── .claude-plugin/        # marketplace metadata
├── docs/                  # 공용 리서치/리뷰 문서
└── packages/
    └── harness/           # intuvibe-harness 플러그인 패키지
        ├── book/          # 단일 진실 (설계 의도 + 현재 형상)
        ├── bench/         # 검증 (specs, tests, scenarios)
        ├── plugin/        # 배포 대상 플러그인
        ├── PLAN.md        # 현재 구현 계획
        └── CONVENTIONS.md # 관리 규칙
```

- marketplace manifest: `.claude-plugin/marketplace.json`
- plugin source: `packages/harness/plugin`

패키지 상세는 [packages/harness/README.md](packages/harness/README.md) 참고.

## 리서치 / 리뷰

- Review index: [docs/review/README.md](docs/review/README.md)
- Codex CLI quick notes: [docs/review/codex-cli/README.md](docs/review/codex-cli/README.md)
- OpenAI Codex official docs review: [docs/review/openai-codex/README.md](docs/review/openai-codex/README.md)
