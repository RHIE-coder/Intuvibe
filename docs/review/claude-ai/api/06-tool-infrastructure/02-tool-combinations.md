# Tool Combinations

---

Anthropic 제공 툴의 대표적인 조합 패턴. 리서치·코딩·장기 실행·데스크탑 자동화 에이전트별 권장 구성.

---

## 1. 리서치 에이전트: web_search + code_execution

```json
{
  "tools": [
    {"type": "web_search_20260209", "name": "web_search"},
    {"type": "code_execution_20250825", "name": "code_execution"}
  ]
}
```

**흐름**: 검색 → 코드 실행(분석/집계/시각화) → 필요 시 추가 검색

`_20260209` 조합 시 code_execution 무료. 서버 사이드 실행이므로 클라이언트 샌드박스 불필요.

---

## 2. 코딩 에이전트: text_editor + bash

```json
{
  "tools": [
    {"type": "text_editor_20250728", "name": "str_replace_based_edit_tool"},
    {"type": "bash_20250124", "name": "bash"}
  ]
}
```

**흐름**: 코드 검사 → 편집 → 테스트 실행 → 반복

클라이언트 실행. 신뢰할 수 없는 코드 환경에서는 작업 디렉토리 제한 + 명령어 얼로우리스트 적용.

---

## 3. 인용 리서치: web_search + web_fetch

```json
{
  "tools": [
    {"type": "web_search_20260209", "name": "web_search"},
    {"type": "web_fetch_20260209", "name": "web_fetch"}
  ]
}
```

**흐름**: 검색 → 스니펫 검토 → 관련 URL 선택 → 전체 페이지 fetch

검색 결과 스니펫만으로 답변 불충분한 경우(문서, 아티클, 사양서) 적합. fetch로 전체 페이지 인용.

---

## 4. 장기 실행 에이전트: memory + 기타 툴

```json
{
  "tools": [
    {"type": "memory_20250818", "name": "memory"},
    // ...기타 툴
  ]
}
```

memory는 다른 툴과 직교(orthogonal). 다른 툴 동작에 영향 없이 세션 간 사실을 저장·검색하는 레이어만 추가.

---

## 5. 범용 데스크탑: computer_use

```json
{
  "tools": [
    {
      "type": "computer_20250124",
      "name": "computer",
      "display_width_px": 1280,
      "display_height_px": 800
    }
  ]
}
```

API 없는 레거시 소프트웨어, 시각적 검증, 다수 데스크탑 앱 걸친 워크플로우에 적합. 가장 범용적이나 스크린샷 라운드트립으로 가장 느림. 더 좁은 툴로 커버 가능하면 우선 사용 권장.

---

> [insight] 5가지 조합 패턴은 하네스의 에이전트 템플릿 라이브러리의 뼈대다. 리서치/코딩/인용/장기실행/데스크탑을 각각 프리셋으로 제공하면 사용자가 에이전트 유형을 선택만 해도 최적 툴 구성이 자동 적용된다.

> [insight] `web_search_20260209 + code_execution` 조합에서 code_execution이 무료라는 점은 하네스의 비용 계산기에서 중요한 예외 케이스다. 리서치 에이전트 비용 추정 시 "web_search 횟수 × $0.01"만 계산하면 되고 code_execution 비용은 0으로 처리.

> [insight] `memory`의 직교성(orthogonality) 개념은 하네스 플러그인 아키텍처에서 핵심이다. memory 툴은 어떤 조합에도 충돌 없이 추가할 수 있는 "상태 영속성 레이어"로, 모든 에이전트 유형의 기본 옵션으로 포함시킬 수 있다.
