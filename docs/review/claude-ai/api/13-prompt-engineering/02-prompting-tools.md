# Console Prompting Tools

---

Claude Console의 3가지 프롬프트 도구: **생성기 → 템플릿/변수 → 개선기** 순으로 사용.

---

## 1. Prompt Generator (생성기)

"빈 페이지 문제" 해결용 — 초안 프롬프트가 없을 때 시작점 제공.  
모든 Claude 모델 호환 (extended thinking 포함).

---

## 2. 프롬프트 템플릿 & 변수

### 콘텐츠 구분

| 타입 | 설명 | 예시 |
|------|------|------|
| **고정 콘텐츠** | 매 요청에서 동일한 지시/컨텍스트 | 시스템 프롬프트 |
| **변수 콘텐츠** | 요청마다 변하는 동적 요소 | 사용자 입력, RAG 검색 결과, 대화 이력 |

### 변수 표기: `{{double brackets}}`

```text
Translate this text from English to Spanish: {{text}}
```

팁: 변수를 XML 태그로 감싸면 구조가 더 명확해짐.

### 템플릿 사용 이점

- **일관성**: 여러 호출에 걸쳐 동일한 구조 보장
- **효율성**: 고정 부분 재작성 없이 변수만 교체
- **테스트 가능성**: 변수 부분만 바꿔 엣지 케이스 빠른 검증
- **버전 관리**: 동적 입력과 분리하여 핵심 프롬프트 변경 추적

---

## 3. Prompt Improver (개선기)

복잡한 태스크, 높은 정확도 필요 시 자동 개선. 4단계로 작동:

| 단계 | 작업 |
|------|------|
| 1. 예제 식별 | 기존 프롬프트에서 예제 추출 |
| 2. 초안 작성 | XML 태그 + 명확한 섹션 구조화 |
| 3. CoT 정제 | 단계별 추론 지시 추가 |
| 4. 예제 강화 | 새 추론 과정을 반영한 예제 업데이트 |

### 개선 전후 비교 (분류 프롬프트)

**전**:
```text
From the following list of Wikipedia article titles, identify which article this sentence came from.
Respond with just the article title and nothing else.

Article titles: {{titles}}
Sentence to classify: {{sentence}}
```

**후**:
```text
You are an intelligent text classification system...

<article_titles>{{titles}}</article_titles>
<sentence_to_classify>{{sentence}}</sentence_to_classify>

Follow these steps:
1. List the key concepts from the sentence
2. Compare each key concept with the article titles
3. Rank the top 3 most relevant titles and explain why
4. Select the most appropriate article title

Wrap your analysis in <analysis> tags...
Output only the chosen article title.
```

### 주의사항

- 응답이 더 길고 상세해짐 → **레이턴시/비용 민감 앱에는 부적합**
- 예제는 실제 API 호출 시 첫 번째 user 메시지 시작에 포함됨

---

> [insight] 프롬프트 템플릿의 `{{변수}}` 패턴은 하네스의 플러그인 SKILL.md 파일에서 동일하게 활용할 수 있다. 플러그인이 Claude에 전달하는 시스템 프롬프트를 고정 템플릿으로 관리하고, 사용자 컨텍스트(계정 정보, RAG 결과 등)를 `{{변수}}`로 주입하는 구조를 표준화하면 플러그인 프롬프트의 버전 관리와 테스트가 용이해진다. 하네스의 플러그인 개발 가이드에 이 패턴을 명시적으로 권장해야 한다.

> [insight] Prompt Improver가 생성하는 프롬프트는 CoT 추론 지시로 인해 응답이 길어져 레이턴시와 비용이 증가한다. 하네스 플러그인에서 사용자 대면 실시간 응답(레이턴시 민감)과 백그라운드 분석 태스크(정확도 우선)를 구분하고, 후자에만 개선된 프롬프트를 적용하는 이중 프롬프트 전략이 필요하다.
