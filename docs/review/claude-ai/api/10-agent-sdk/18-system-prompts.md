# Modifying System Prompts in Agent SDK

---

Agent SDK의 시스템 프롬프트 커스터마이징 4가지 방법.

**기본값**: SDK는 **minimal system prompt** 사용 (툴 지시만 포함, Claude Code 코딩 가이드라인 제외).  
Claude Code 전체 프롬프트 사용 시: `system_prompt={"type": "preset", "preset": "claude_code"}` 명시 필요.

---

## 1. 4가지 방법 비교

| 방법 | 지속성 | 재사용성 | 기본 툴 유지 | 커스터마이징 수준 |
|------|--------|----------|------------|-----------------|
| **CLAUDE.md** | 프로젝트 파일 | 프로젝트 단위 | ✅ | 추가만 가능 |
| **Output Styles** | 파일로 저장 | 프로젝트/유저 | ✅ | 기본값 대체 |
| **preset + append** | 세션 한정 | 코드로 관리 | ✅ | 추가만 가능 |
| **Custom 문자열** | 세션 한정 | 코드로 관리 | ❌ (직접 포함 필요) | 완전 제어 |

---

## 2. CLAUDE.md (프로젝트 수준 지시)

- 위치: `CLAUDE.md` 또는 `.claude/CLAUDE.md` (프로젝트) / `~/.claude/CLAUDE.md` (유저)
- 마크다운 형식: 코딩 가이드라인, 공통 명령어, 아키텍처 컨텍스트 등

**핵심 주의**: `setting_sources=["project"]` 명시 필수 (없으면 로딩 안 됨)

```python
options=ClaudeAgentOptions(
    system_prompt={"type": "preset", "preset": "claude_code"},
    setting_sources=["project"],  # CLAUDE.md 로딩 필수
)
```

---

## 3. Output Styles (재사용 가능한 설정)

파일(`~/.claude/output-styles/*.md` 또는 `.claude/output-styles/*.md`)로 저장.

```python
# 파일 형식
content = """---
name: Code Reviewer
description: Thorough code review assistant
---

You are an expert code reviewer.
For every submission:
1. Check bugs and security issues
2. Rate code quality (1-10)"""
```

- CLI: `/output-style [style-name]`
- SDK에서 사용: `setting_sources=["user"]` 또는 `["project"]` 포함 시 자동 로딩

---

## 4. preset + append

Claude Code 기본 프롬프트 유지 + 추가 지시만 덧붙이기.

```python
system_prompt={
    "type": "preset",
    "preset": "claude_code",
    "append": "Always include detailed docstrings and type hints in Python code.",
}
```

---

## 5. Custom 문자열 (완전 제어)

```python
options=ClaudeAgentOptions(
    system_prompt="You are a Python coding specialist. ..."
)
```

기본 툴 지시, 안전 지침, 환경 컨텍스트 모두 직접 포함해야 함.

---

> [insight] `preset: "claude_code"` + `append` 조합은 하네스의 플러그인별 에이전트 설정에서 표준 패턴으로 채택할 만하다. 플러그인이 도메인별 지시(예: "SQL 최적화 전문가", "보안 코드 리뷰어")를 `append`로 주입하면 Claude Code의 기본 툴/안전 지침을 그대로 상속하면서 플러그인 특화 행동을 추가할 수 있다. Custom 문자열 방식은 보안 지침을 직접 재구현해야 하므로 플러그인에서는 권장하지 않는다.

> [insight] `setting_sources=["project"]` 없이는 CLAUDE.md가 로딩되지 않는다는 점은 하네스 구현 시 놓치기 쉬운 함정이다. 하네스의 플러그인 실행 옵션 빌더에서 `system_prompt` 프리셋 설정과 `setting_sources` 설정을 항상 함께 주입하는 헬퍼를 만들면, 플러그인 개발자가 CLAUDE.md를 작성해도 실제로 적용되지 않는 상황을 방지할 수 있다.
