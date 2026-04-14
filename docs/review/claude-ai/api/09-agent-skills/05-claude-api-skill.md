# Claude API Skill

---

Claude API 및 Agent SDK 레퍼런스 자료를 Claude에 제공하는 오픈소스 Skill. Claude Code에 번들 포함.

- 소스: `github.com/anthropics/skills`
- 지원 언어: Python, TypeScript, Java, Go, Ruby, C#, PHP, cURL (8개)

---

## 1. 제공 내용

- 언어별 SDK 설치, 퀵스타트, 패턴, 에러 처리
- 툴 유즈, 스트리밍, 배치 처리 구현 가이드
- Agent SDK 레퍼런스 (Python, TypeScript만)
- 현재 모델 ID, 컨텍스트 윈도우, 가격 정보
- 자주 발생하는 실수 방지 가이드

---

## 2. 활성화 조건

**자동**: 프로젝트에서 Anthropic SDK import 감지 시
- `anthropic` (Python)
- `@anthropic-ai/sdk` (TypeScript)
- `claude_agent_sdk` (Agent SDK)

**수동**: `/claude-api` 직접 입력

일반 프로그래밍, ML/데이터 사이언스, 타 AI SDK(OpenAI 등)에는 활성화 안 됨.

---

## 3. 언어별 지원 범위

| 언어 | SDK 문서 | Tool Runner | Agent SDK |
|------|---------|-------------|-----------|
| Python | ✅ | ✅ (beta) | ✅ |
| TypeScript | ✅ | ✅ (beta) | ✅ |
| Java/Go/Ruby/C#/PHP | ✅ | 일부 | ❌ |

멀티 언어 프로젝트 → Claude가 언어 질문. 미지원 언어(Rust, Swift 등) → cURL/raw HTTP 예시 제공.

---

## 4. 설치 (Claude Code 외 환경)

```bash
npx skills add https://github.com/anthropics/skills --skill claude-api
```

또는 Claude Code 플러그인으로:
```bash
/plugin marketplace add anthropics/skills
/plugin install claude-api@anthropic-agent-skills
```

---

> [insight] claude-api Skill의 자동 활성화 조건(SDK import 감지)은 하네스 설계에서 응용 가능한 패턴이다. 특정 라이브러리나 패턴이 감지될 때 관련 Skills를 자동 로딩하는 "컨텍스트 인식 Skill 활성화" 전략은, 하네스의 플러그인 마켓플레이스에서 사용자가 명시적으로 플러그인을 선택하지 않아도 작업 컨텍스트에 따라 적절한 Skills를 자동 제안하는 UX를 설계하는 데 참고할 수 있다.
