# Claude Cookbooks Review

> `anthropics/claude-cookbooks` 계열 자료를 하네스 엔지니어링 관점에서 분석한 메모 묶음.
> 목적은 cookbook 예제를 그대로 따라 하기보다, 하네스에 이식 가능한 패턴과 프리미티브를 추출하는 것이다.

---

## 문서 구성

| 문서 | 초점 |
|---|------|
| [analysis.md](analysis.md) | agent workflow pattern, context engineering, SDK 패턴 등 핵심 분석 |
| [MANIFEST.md](MANIFEST.md) | cookbook 자료 목록과 정리 메타 |

---

## 이 묶음의 의미

`claude-cookbooks`는 다른 review 묶음과 달리 제품 문서 해설이나 plugin 구조 리뷰가 아니다. 오히려:

- 패턴 추출
- 프리미티브 정리
- cookbook 예제의 하네스 적용 가능성 검토

에 더 가깝다.

현재 `analysis.md`는 특히 다음 축을 다룬다.

- agent workflow pattern
- context engineering
- memory / compaction / clearing
- Agent SDK 관련 패턴

즉 이 묶음은 완성된 제품 구조를 비교하는 용도보다, **하네스에 가져올 수 있는 패턴 라이브러리**로 보는 편이 맞다.

---

## 하네스 관점의 한 줄 정리

> Claude Cookbooks 리뷰는 구조 비교보다 패턴 추출에 가까운 메모 묶음이다.
> 하네스의 workflow engine, context management, evaluator loop를 설계할 때 필요한 저수준 아이디어를 얻는 용도로 유용하다.

---

## 참고

- 스냅샷 마커: [2026.04](2026.04)
- 상위 인덱스: [../README.md](../README.md)
