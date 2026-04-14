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
| `intuvibe-harness` | 0.1.0 | Agentic engineering harness — 워크플로우, 가드레일, 품질 파이프라인 |

## 버전 관리

마켓플레이스 버전과 플러그인 버전은 독립적으로 관리한다.

| 대상 | 위치 | 범프 시점 |
|------|------|-----------|
| 마켓플레이스 | `metadata.version` in `.claude-plugin/marketplace.json` | 플러그인 추가/제거, 메타데이터 구조 변경 |
| 개별 플러그인 | `plugins[].version` + 각 `plugin.json` | 해당 플러그인 기능 변경 시 |

- 마켓플레이스 버전은 "선반 자체의 변경"을 추적한다. 플러그인 내용 업데이트만으로는 올리지 않는다.
- 플러그인 버전은 각 패키지가 독립적으로 관리한다. 릴리스 시 `git tag`로 표기한다 (예: `harness-v0.2.0`).

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
