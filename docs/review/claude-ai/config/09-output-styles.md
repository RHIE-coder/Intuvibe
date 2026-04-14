# Output Styles — 시스템 프롬프트 커스터마이즈

---

Output Style은 Claude Code의 **시스템 프롬프트를 직접 수정**하는 장치다.
기본 SW 엔지니어링 지침을 대체하거나 보완하여 Claude의 동작 패턴 자체를 바꾼다.

---

## 1. 빌트인 스타일

| 스타일 | 동작 |
|--------|------|
| **Default** | 기본 시스템 프롬프트. SW 엔지니어링 작업 최적화 |
| **Explanatory** | 코딩 작업 + "Insight" 설명 추가. 구현 선택/코드베이스 패턴 교육 |
| **Learning** | 협업 학습 모드. Insight + `TODO(human)` 마커로 사용자에게 코드 작성 요청 |

---

## 2. 동작 원리

```
시스템 프롬프트 = [빌트인 SW 엔지니어링 지침] + [Output Style 지침]
                         ↑                            ↑
              keep-coding-instructions: true면 유지    항상 추가
              false(기본)면 제거
```

- **커스텀 스타일** → 기본적으로 코딩 지침(테스트 검증 등)을 **제거**하고 스타일 지침만 적용
- `keep-coding-instructions: true` → 코딩 지침 **유지** + 스타일 지침 추가
- 대화 중 스타일 준수 리마인더가 주기적으로 삽입됨
- **세션 시작 시 시스템 프롬프트가 고정** → 변경은 다음 세션부터 적용 (프롬프트 캐싱을 위해)

---

## 3. 토큰 비용

- 시스템 프롬프트 추가 → 입력 토큰 증가 (프롬프트 캐싱으로 첫 요청 이후 경감)
- Explanatory/Learning → 긴 응답 → 출력 토큰 증가
- 커스텀 스타일 → 지침 내용에 따라 다름

---

## 4. 설정

```
/config → Output style 선택
```

→ `.claude/settings.local.json`에 저장 (local project 레벨).

직접 설정:

```json
{ "outputStyle": "Explanatory" }
```

---

## 5. 커스텀 스타일 만들기

### 파일 구조

```markdown
---
name: My Custom Style
description: A brief description shown in the /config picker
keep-coding-instructions: true
---

# Custom Style Instructions

You are an interactive CLI tool that helps users with...

## Specific Behaviors

[정의할 동작...]
```

### Frontmatter

| 필드 | 역할 | 기본값 |
|------|------|--------|
| `name` | 스타일명. 미설정 시 파일명 | 파일명 |
| `description` | `/config` picker에 표시되는 설명 | 없음 |
| `keep-coding-instructions` | 빌트인 코딩 지침 유지 여부 | `false` |

### 저장 위치

| 위치 | 스코프 |
|------|--------|
| `~/.claude/output-styles/` | 전 프로젝트 (개인) |
| `.claude/output-styles/` | 현재 프로젝트 (팀, 동명 시 프로젝트 우선) |
| Plugin `output-styles/` | 플러그인 활성 범위 |

---

## 6. 유사 기능과 비교

| | Output Style | CLAUDE.md | `--append-system-prompt` |
|---|---|---|---|
| **시스템 프롬프트 수정** | O (대체 또는 추가) | X (유저 메시지로 추가) | O (시스템 프롬프트에 append) |
| **코딩 지침 제어** | 제거 가능 | 영향 없음 | 영향 없음 |
| **적용 범위** | 세션 전체 | 세션 전체 | 세션 전체 |

| | Output Style | Agent | Skill |
|---|---|---|---|
| **대상** | 메인 에이전트 루프 | 특정 작업 위임 | 특정 작업/지식 |
| **영향** | 시스템 프롬프트만 | 모델, 도구, 컨텍스트 전체 | 프롬프트 내용 |
| **활성** | 항상 (선택 후) | 호출 시 | 호출 시 또는 자동 |

---

## 7. 활용 시나리오

### 코딩 모드 유지 + 행동 변경

```yaml
---
keep-coding-instructions: true
---
After completing each task, add a "Why this approach" note.
When a change is under 10 lines, leave a TODO(human) marker.
```

### 비코딩 용도로 전환

```yaml
---
name: Technical Writer
description: Documentation and technical writing assistant
---
You are a technical writing assistant. Focus on clarity, structure,
and accurate technical terminology. Do not write code unless asked.
```

`keep-coding-instructions` 생략 → 코딩 지침 제거 → 문서 작성 전용 에이전트.

> [insight] Output Style은 시스템 프롬프트를 **직접 수정**하는 유일한 사용자 접근 가능 장치다 (`--append-system-prompt`과 함께). CLAUDE.md는 유저 메시지로 추가되어 준수 보장이 안 되지만, Output Style은 시스템 프롬프트의 일부이므로 더 강한 영향력을 가진다. 하네스에서 Claude의 기본 행동 패턴을 바꿔야 할 때 Output Style이 가장 적합한 도구.

> [insight] `keep-coding-instructions: false`(기본)는 코딩 관련 빌트인 지침(테스트 검증, 파일 편집 패턴 등)을 **제거**한다. 비코딩 용도(문서 작성, 리서치 등)에는 맞지만, 코딩하면서 행동만 조금 바꾸고 싶다면 반드시 `keep-coding-instructions: true`를 설정해야 한다. 이걸 빠뜨리면 코딩 품질이 하락할 수 있다.
