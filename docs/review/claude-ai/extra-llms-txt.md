# [번외] llms.txt — LLM을 위한 사이트 안내 표준

---

## 1. llms.txt란?

웹사이트 루트에 `/llms.txt` 마크다운 파일을 배치하여, **LLM이 추론 시점에 사용할 수 있는 정보**를 제공하는 표준 제안이다.

### 왜 필요한가

- LLM의 컨텍스트 윈도우는 대부분의 웹사이트 전체를 처리하기에 너무 작다
- HTML → LLM 친화적 평문 변환은 어렵고 부정확하다
- LLM이 사이트를 이해하려면 **구조화된 진입점**이 필요하다

### 기존 표준과의 차이

| | robots.txt | sitemap.xml | llms.txt |
|---|---|---|---|
| **목적** | 접근 정책 (크롤링 허용/차단) | 인덱싱 가능한 전체 페이지 나열 | LLM 컨텍스트에 맞춤형 정보 제공 |
| **대상** | 크롤러 | 검색 엔진 | LLM |
| **형식** | 독자 문법 | XML | Markdown |

---

## 2. 스펙 구조

```markdown
# 프로젝트/사이트 이름              ← H1 (필수)

> 프로젝트의 간단한 요약             ← 인용문 (선택)

상세 설명 텍스트                    ← 본문 (선택, 제목 없이)

## 섹션 이름                        ← H2 섹션 (파일 목록)

- [링크 제목](url): 선택적 설명     ← 마크다운 하이퍼링크 (필수 형식)
- [링크 제목](url): 설명

## Optional                        ← 컨텍스트 짧을 때 생략 가능한 보조 정보

- [링크 제목](url)
```

### 규칙

- H1 = 프로젝트명 (필수, 1개)
- 인용문 (`>`) = 한줄 요약
- H2 = 섹션 구분. 각 섹션 아래에 `[이름](url): 설명` 형식의 링크 목록
- `## Optional` = 컨텍스트 윈도우가 짧을 때 생략 가능한 보조 자료
- 마크다운 하이퍼링크 형식 필수 (URL만 나열 불가)

---

## 3. 실제 예시 — Claude Code docs

Claude Code docs 사이트가 실제로 `/llms.txt`를 제공한다: `https://code.claude.com/docs/llms.txt`

```markdown
# Claude Code Docs

## Docs

- [Overview](https://code.claude.com/docs/en/overview): Claude Code overview
- [Quickstart](https://code.claude.com/docs/en/quickstart): Get started quickly
- [How Claude Code works](https://code.claude.com/docs/en/how-claude-code-works): ...
- [Settings](https://code.claude.com/docs/en/settings): Configure Claude Code
...
```

그리고 각 페이지 상단에 AI 에이전트를 위한 안내문을 삽입:

```
> ## Documentation Index
> Fetch the complete documentation index at: https://code.claude.com/docs/llms.txt
> Use this file to discover all available pages before exploring further.
```

→ AI 에이전트가 개별 페이지를 fetch하면 **전체 문서 구조를 발견할 수 있는 진입점**을 알려주는 구조.

---

## 4. 구축 가이드

### 기본 구축

1. 사이트 루트에 `/llms.txt` 파일 생성 (마크다운)
2. H1에 프로젝트명, 인용문에 한줄 요약
3. H2 섹션별로 주요 문서 링크를 `[이름](url): 설명` 형식으로 나열
4. 컨텍스트 윈도우에 맞게 **핵심 정보를 우선 배치** (Optional 섹션은 뒤쪽)

### 마크다운 버전 제공 (선택)

각 페이지의 `.md` 확장자 버전을 제공:
- `https://example.com/docs/guide` → `https://example.com/docs/guide.md`
- HTML 파싱 없이 LLM이 직접 마크다운으로 읽을 수 있음

### 작성 지침

- 간결하고 명확한 언어 사용
- 링크 설명에 정보성 있는 키워드 포함 (LLM이 검색 키로 활용)
- 모호한 용어나 설명 없는 전문용어 피하기
- `## Optional` 섹션으로 보조 자료 분리 → 컨텍스트 절약

### 통합 도구

- `llms_txt2ctx` — CLI/Python 모듈로 llms.txt를 컨텍스트로 확장
- VitePress, Docusaurus, Drupal 플러그인 지원
- VS Code PagePilot 확장

---

## 5. 이 리뷰에서 발견된 동작

이번 문서 리뷰 작업에서 Claude Code가 WebFetch로 페이지를 가져올 때마다 상단 안내문이 반환되었다. 이는 docs 사이트가 **AI 에이전트의 fetch를 인지하고 의도적으로 llms.txt 경로를 안내**하는 설계.

이 패턴의 의미:
- 사이트가 AI 에이전트에게 "먼저 전체 목차를 파악하라"고 유도
- 개별 페이지 fetch → 전체 구조 발견 → 체계적 탐색 가능
- LLM의 컨텍스트 윈도우 효율을 높이기 위한 협력적 설계

> [insight] llms.txt는 AI 에이전트가 사이트를 체계적으로 탐색할 수 있게 하는 **진입점 표준**이다. 하네스에서 자체 문서 사이트를 만든다면 llms.txt를 제공하여 Claude가 전체 구조를 한번에 파악하고 필요한 페이지만 선택적으로 fetch하도록 유도할 수 있다. 각 페이지에 llms.txt 경로 안내문을 삽입하는 Claude Code docs의 패턴은 좋은 참고 사례.
