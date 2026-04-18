# Superpowers Review

> `obra/superpowers` 리뷰 묶음.
> 목적은 skill-first methodology, mandatory workflow, multi-platform packaging 구조를 현재 하네스와 비교하는 것.

---

## 문서 구성

| # | 문서 | 초점 |
|---|------|------|
| 01 | [Overview](01-overview.md) | 철학, 구조, 배포 방식, 전체 워크플로우 개요 |
| 02 | [Skill System](02-skill-system.md) | SKILL.md 구조와 skill trigger 철학 |
| 03 | [Core Skills Deep Dive](03-core-skills-deep-dive.md) | brainstorming, plans, TDD, verification 등 핵심 스킬 분석 |
| 04 | [Subagent Architecture](04-subagent-architecture.md) | subagent-driven-development와 2단계 리뷰 |
| 05 | [Hooks Commands Plugins](05-hooks-commands-plugins.md) | hooks, commands, multi-platform plugin packaging |
| 06 | [Testing Strategy](06-testing-strategy.md) | pressure scenario, trigger test, verification 접근 |
| 07 | [Remaining Skills](07-remaining-skills.md) | 나머지 skill 분류와 역할 정리 |
| 08 | [Takeaways](08-takeaways.md) | 현재 하네스 설계에 주는 시사점 요약 |

---

## 이 묶음의 의미

Superpowers는 review 대상들 중 가장 **skill-first** 하고, 가장 **methodology-driven** 하다.

특히 주목할 점은:

- "mandatory, not suggestions"라는 강한 workflow 철학
- skill 확인을 모든 작업의 출발점으로 강제
- TDD / debugging / review / branch completion을 skill 단위로 조직
- multi-platform packaging
- zero-dependency 성향

즉 Superpowers는 두꺼운 runtime이나 state machine보다는, **작업 방법론을 skill과 review discipline으로 강제하는 하네스**를 보는 비교군이다.

---

## 하네스 관점의 한 줄 정리

> Superpowers는 skill 시스템을 중심으로 개발 방법론 자체를 플러그인화한 구조다.
> 현재 하네스의 skill 설계, workflow 강제 수준, multi-platform distribution을 고민할 때 가장 직접적인 레퍼런스다.

---

## 참고

- 스냅샷 마커: [2026.04](2026.04)
- 상위 인덱스: [../README.md](../README.md)
