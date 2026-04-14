# packages/harness

Claude Code 기반 agentic engineering harness 패키지다.

## 구조

```text
packages/harness/
├── book/                 # 단일 진실 — 설계 의도 + 현재 형상
├── bench/                # 검증
│   ├── specs/            # 인수 조건 명세 (spec ↔ test 1:1)
│   ├── tests/            # 결정론적 node:test
│   └── scenarios/        # fixture 기반 시나리오 검증
├── plugin/               # 실제 배포/설치 대상 플러그인
│   ├── .claude-plugin/
│   ├── agents/
│   ├── hooks/
│   ├── scripts/
│   ├── skills/
│   └── settings.json
├── PLAN.md               # 현재 구현 계획
└── CONVENTIONS.md        # 관리 규칙
```

## Plugin Metadata

- plugin name: `intuvibe-harness`
- version: `0.1.0`
- plugin manifest: `packages/harness/plugin/.claude-plugin/plugin.json`

루트 마켓플레이스는 `.claude-plugin/marketplace.json` 에서 이 패키지를 `harness/plugin` source로 참조한다.

## 개발 워크플로우

```
book/ → PLAN.md → bench/ → plugin/ → git tag
```

book/이 목표 상태를 정의하고, 개발은 plugin/이 book/을 따라잡는 과정이다. gap이 0이 되면 git tag.

상세: [CONVENTIONS.md](CONVENTIONS.md)

## Bench

```bash
find packages/harness/bench/tests -name "*.test.mjs" | xargs node --test
```
