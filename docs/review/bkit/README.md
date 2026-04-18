# bkit Review

> `popup-studio-ai/bkit-claude-code` 리뷰 묶음.
> 목적은 PDCA + Context Engineering + stateful automation 구조를 현재 하네스와 비교하는 것.

---

## 문서 구성

| # | 문서 | 초점 |
|---|------|------|
| 01 | [Overview](01-overview.md) | 전체 철학, 구조, PDCA/state machine 개요 |
| 02 | [PDCA State Machine](02-pdca-state-machine.md) | 상태 전이, gate, iteration loop |
| 03 | [Agent System](03-agent-system.md) | CTO-led team, orchestration, council/leader/swarm 패턴 |
| 04 | [Skill System](04-skill-system.md) | skill taxonomy, trigger, automation 연결 |
| 05 | [Hooks and Scripts](05-hooks-and-scripts.md) | hooks.json, script layer, execution architecture |
| 06 | [Automation and Safety](06-automation-and-safety.md) | L0-L4 automation, trust, audit, rollback |
| 07 | [Evals and Testing](07-evals-and-testing.md) | eval 체계, A/B testing, 테스트 전략 |
| 08 | [Takeaways](08-takeaways.md) | 현재 하네스 설계에 주는 시사점 요약 |

---

## 이 묶음의 의미

bkit은 현재 review 대상들 중에서도 가장 **stateful** 하고, 가장 **운영체제형** 접근을 취하는 Claude Code 플러그인이다.

특히 주목할 축은 이렇다.

- PDCA를 명시적 state machine으로 모델링
- automation level과 trust score를 운영 개념으로 둠
- hooks / scripts / lib 계층이 두꺼움
- skill/agent보다 상태 관리와 워크플로우 엔진 비중이 큼

즉 bkit 리뷰는 "간단한 skill/plugin 구조"보다, **장기 실행 하네스가 어디까지 복잡해질 수 있는지**를 보는 비교군에 가깝다.

---

## 하네스 관점의 한 줄 정리

> bkit은 PDCA를 state machine과 automation controller로 굳힌 Claude Code 중심 하네스다.
> 현재 하네스가 어디까지 상태와 자동화를 도입할지 판단할 때 가장 직접적인 대조군이다.

---

## 참고

- 스냅샷 마커: [2026.04](2026.04)
- 상위 인덱스: [../README.md](../README.md)
