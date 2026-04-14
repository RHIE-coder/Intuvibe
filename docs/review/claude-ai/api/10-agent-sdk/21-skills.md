# Agent Skills in the Agent SDK

---

Claude가 컨텍스트에 따라 자율 호출하는 전문화된 능력. SDK에서는 파일시스템 기반으로만 정의 (프로그래매틱 API 없음).

---

## 1. SDK에서 스킬 사용 설정

```python
options = ClaudeAgentOptions(
    cwd="/path/to/project",             # .claude/skills/ 포함 디렉토리
    setting_sources=["user", "project"], # 필수: 파일시스템 스킬 로딩
    allowed_tools=["Skill", "Read", "Write", "Bash"],  # "Skill" 툴 필수
)
```

**핵심 주의사항**:
- `setting_sources` 없으면 스킬 로딩 안 됨 (가장 흔한 실수)
- `"Skill"` 툴이 `allowed_tools`에 없으면 스킬 실행 안 됨
- 서브에이전트와 달리 프로그래매틱 등록 불가

---

## 2. 스킬 위치

| 위치 | 설명 | 로딩 조건 |
|------|------|----------|
| `.claude/skills/` | 프로젝트 스킬 (git 공유) | `"project"` 포함 |
| `~/.claude/skills/` | 개인 스킬 (전체 프로젝트) | `"user"` 포함 |
| 플러그인 번들 | Claude Code 플러그인과 함께 배포 | 플러그인 설치 시 |

---

## 3. SKILL.md 기반 스킬 생성

```
.claude/skills/processing-pdfs/
└── SKILL.md
```

`description` 필드가 Claude의 자율 호출 기준. (구체적 키워드 포함 필수)

---

## 4. 툴 제한 (SDK 전용 방식)

**주의**: SKILL.md의 `allowed-tools` 프런트매터는 CLI에서만 동작, SDK에서는 무시.

SDK에서 툴 제한 시:
```python
options = ClaudeAgentOptions(
    setting_sources=["user", "project"],
    allowed_tools=["Skill", "Read", "Grep", "Glob"],
    permission_mode="dontAsk",  # allowedTools에 없는 툴 자동 거부
)
```

`allowedTools` 단독 사용 시 → 미등록 툴은 활성 permission mode로 처리 (거부 아님).  
`dontAsk` 함께 사용해야 미등록 툴 완전 차단.

---

## 5. 사용 가능한 스킬 확인

```python
async for message in query(
    prompt="What Skills are available?",
    options=ClaudeAgentOptions(
        setting_sources=["user", "project"],
        allowed_tools=["Skill"],
    )
):
    print(message)
```

---

> [insight] 스킬의 SDK 제한사항 (파일시스템 전용, 프로그래매틱 API 없음)은 하네스 플러그인 배포 방식을 "파일 배포" 중심으로 확정한다. 플러그인 설치 = `.claude/skills/<plugin>/SKILL.md` 파일 생성, 제거 = 파일 삭제로 단순화된다. 하네스의 플러그인 마켓플레이스는 결국 SKILL.md 파일의 패키지 관리자 역할을 하며, 이는 npm/pip과 유사한 아키텍처다.

> [insight] `allowed_tools=["Skill", ...] + permission_mode="dontAsk"` 조합은 SDK에서 스킬 기반 에이전트의 최소 권한 설정 표준이다. SKILL.md의 `allowed-tools` 무시 특성을 알지 못하면 스킬이 의도치 않게 광범위한 툴 접근 권한을 갖게 된다. 하네스의 스킬 실행 컨텍스트에서 이 조합을 기본값으로 강제하는 것이 안전하다.
