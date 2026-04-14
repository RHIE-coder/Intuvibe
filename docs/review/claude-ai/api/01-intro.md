# Intro to Claude — API 플랫폼 진입점

---

Claude = Anthropic의 AI 플랫폼. 언어, 추론, 분석, 코딩 등.

---

## 1. 현재 모델 라인업

| 모델 | 포지션 |
|------|--------|
| **Claude Opus 4.6** | 최고 지능. 코딩, 엔터프라이즈 에이전트, 전문 작업 |
| **Claude Sonnet 4.6** | 프론티어 지능 at scale. 코딩, 에이전트, 엔터프라이즈 워크플로 |
| **Claude Haiku 4.5** | 최고 속도 + 준프론티어 지능 |

---

## 2. 신규 개발자 권장 경로

1. **첫 API 호출** → Quickstart (환경 설정, SDK, 첫 메시지)
2. **Messages API 이해** → 요청/응답 구조, 멀티턴, 시스템 프롬프트, stop reason
3. **모델 선택** → 능력/비용 비교
4. **기능 & 도구 탐색** → extended thinking, web search, 파일 처리, structured outputs 등

---

## 3. 개발 도구

| 도구 | 용도 |
|------|------|
| **Developer Console** | 브라우저에서 프롬프트 프로토타이핑 (Workbench + prompt generator) |
| **API Reference** | 전체 API + 클라이언트 SDK 문서 |
| **Claude Cookbook** | Jupyter 노트북 인터랙티브 학습 (PDF, 임베딩 등) |

---

## 4. 핵심 기능

- **텍스트 & 코드 생성**: 요약, QA, 데이터 추출, 번역, 코드 설명/생성
- **Vision**: 이미지 처리/분석 → 텍스트/코드 생성

> [insight] API 문서의 진입점은 Claude Code 문서와 완전히 다른 관점이다. Claude Code는 "에이전틱 하네스" 관점에서 시작하지만, API 문서는 "Messages API → 모델 선택 → 기능 탐색" 순서로 원시 API 사용부터 시작한다. 하네스 구축 시 이 두 레이어의 관계를 이해해야 한다: API가 기반이고 Claude Code가 그 위의 하네스.
