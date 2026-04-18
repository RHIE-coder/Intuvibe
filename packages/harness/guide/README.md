# Harness 사용 가이드

> **이 문서의 목표:** 하네스를 처음 쓰는 사람이 설치 → 첫 세션 → 실제 워크플로우까지 따라갈 수 있게 한다.
>
> 설계 의도·세부 결정 근거는 [`../book/`](../book/) 참조. 여기서는 **사용법**에 집중한다.

---

## 📚 목차

| # | 문서 | 내용 | 주요 다이어그램 |
|:-:|-----|------|-----------|
| 1 | [Quick Start](01-quick-start.md) | 설치 & 첫 세션까지 5분 | — |
| 2 | [3개 도메인 전체 그림](02-domains.md) | A(자체 개발) · B(기반 개발) · C(마이그레이션) | flowchart |
| 3 | [Standard 워크플로우](03-standard-workflow.md) | Phase 0~10 전체 흐름 + Gate | flowchart + lane |
| 4 | [Prototype → Standard 승격](04-prototype-to-standard.md) | 실험 → 제품 전환 경로 | state diagram |
| 5 | [Migration (도메인 C)](05-migration.md) | 기존 코드를 하네스로 편입 | flowchart |
| 6 | [슬래시 명령 치트시트](06-commands.md) | `/harness:*` 16종 한눈에 | — |
| 7 | [Mode — standard/prototype/explore](07-modes.md) | 세 모드의 차이와 전환 | decision tree |
| 8 | [Hook Lifecycle](08-hook-lifecycle.md) | 한 턴에 무엇이 일어나는가 | sequence |
| 9 | [Observability — 3개 이벤트 스트림](09-observability.md) | audit / events / traces + Inspector | flowchart |
| 10 | [.harness/state/ 디렉토리 해부](10-state-directory.md) | 파일별 역할 | — (트리) |
| 11 | [트러블슈팅 · FAQ](11-troubleshooting.md) | 자주 막히는 지점 | — |

---

## 🧭 어떻게 읽을까

| 처지 | 권장 경로 |
|------|---------|
| **처음 쓴다** | 1 → 2 → 3 → 6 (필요 시 11) |
| **기존 프로젝트에 도입** | 1 → 2 → 5 → 3 |
| **실험·프로토타입 모드로 시작** | 1 → 7 → 4 |
| **하네스 자체를 이해하고 싶다** | 2 → 8 → 9 → [book/](../book/) |
| **문제 해결 중** | 11 → 8 (hook 흐름 확인) → 9 (Inspector 로 trace 관측) |

---

## 🔗 관련 문서

- [`../README.md`](../README.md) — 패키지 개요
- [`../CONVENTIONS.md`](../CONVENTIONS.md) — 기여자용 관리 규칙
- [`../book/`](../book/) — 설계 의도와 현재 형상 (깊은 참조)
- [`../../../apps/inspector/README.md`](../../../apps/inspector/README.md) — trace 시각화 도구

---

> 이 가이드에 오탈자·누락을 발견하면 같은 PR 에서 고쳐주세요. 문서는 `book/` 만큼 엄격하게 최신화 대상입니다.
