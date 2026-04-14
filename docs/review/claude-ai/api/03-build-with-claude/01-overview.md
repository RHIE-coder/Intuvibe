# Features Overview — API 기능 전체 지도

---

API 표면 5개 영역. 신규 개발자는 **Model capabilities + Tools**부터, 최적화 시 나머지.

---

## 1. 가용성 분류

| 분류 | 설명 |
|------|------|
| **Beta** | 피드백 수집용 프리뷰. 변경/중단 가능. 베타 헤더 필요 |
| **GA** | 안정, 프로덕션 권장. 베타 헤더 없음. API 버전 보장 |
| **Deprecated** | 기능하지만 비권장. 마이그레이션 경로 + 제거 일정 제공 |
| **Retired** | 사용 불가 |

---

## 2. Model Capabilities

Claude의 추론, 형식, 입력 모달리티 제어.

| 기능 | 핵심 | ZDR | 플랫폼 |
|------|------|:---:|--------|
| **Context windows** | 최대 1M 토큰 | O | API, Bedrock, Vertex, Azure(β) |
| **Adaptive thinking** | 동적 사고 깊이. effort로 제어 | O | API, Bedrock, Vertex, Azure(β) |
| **Extended thinking** | 단계별 사고 과정 투명화 | O | API, Bedrock, Vertex, Azure(β) |
| **Effort** | 응답 깊이 vs 토큰 효율 조절. Opus 4.6/4.5 | O | API, Bedrock, Vertex, Azure(β) |
| **Structured outputs** | JSON 스키마 적합성 보장 (JSON 출력 + strict tool use) | O* | API, Bedrock, Azure(β) |
| **Citations** | 소스 문서의 정확한 문장/구절 참조 | O | API, Bedrock, Vertex, Azure(β) |
| **Batch processing** | 비동기 대량 처리. **50% 비용 절감** | X | API, Bedrock, Vertex |
| **Search results** | RAG용 자연 인용. 커스텀 지식 베이스에 웹 검색 수준 인용 | O | API, Bedrock, Vertex, Azure(β) |
| **PDF support** | PDF 텍스트 + 시각 콘텐츠 처리 | O | API, Bedrock, Vertex, Azure(β) |
| **Data residency** | `inference_geo` 파라미터로 추론 위치 제어 (`global`/`us`) | O | API만 |

---

## 3. Tools

### Server-side (플랫폼이 실행)

| 도구 | 핵심 | ZDR | 플랫폼 |
|------|------|:---:|--------|
| **Code execution** | 샌드박스 코드 실행. **web 도구와 함께 시 무료** | X | API, Azure(β) |
| **Web search** | 실시간 웹 데이터 보강 | O* | API, Vertex, Azure(β) |
| **Web fetch** | 웹 페이지/PDF 전체 내용 가져오기 | O* | API, Azure(β) |

### Client-side (개발자가 구현/실행)

| 도구 | 핵심 | ZDR | 플랫폼 |
|------|------|:---:|--------|
| **Bash** | 셸 명령/스크립트 실행 | O | API, Bedrock, Vertex, Azure(β) |
| **Computer use** | 스크린샷 + 마우스/키보드 제어 | O | 전체(β) |
| **Memory** | 대화 간 정보 저장/조회. 지식 베이스 구축 | O | API, Bedrock, Vertex, Azure(β) |
| **Text editor** | 텍스트 파일 생성/편집 | O | API, Bedrock, Vertex, Azure(β) |

---

## 4. Tool Infrastructure

| 기능 | 핵심 | ZDR | 플랫폼 |
|------|------|:---:|--------|
| **Agent Skills** | 프리빌트(PowerPoint/Excel/Word/PDF) + 커스텀. progressive disclosure로 컨텍스트 관리 | X | API(β), Azure(β) |
| **Fine-grained tool streaming** | 도구 파라미터를 JSON 검증 없이 스트리밍. 레이턴시 감소 | O | API, Bedrock, Vertex, Azure(β) |
| **MCP connector** | Messages API에서 직접 원격 MCP 서버 연결 (별도 클라이언트 불필요) | X | API(β), Azure(β) |
| **Programmatic tool calling** | 코드 실행 컨테이너 내에서 도구 프로그래밍 호출. 레이턴시/토큰 절감 | X | API, Azure(β) |
| **Tool search** | 수천 도구를 regex 검색으로 동적 탐색/로드. 컨텍스트 최적화 | O* | API, Bedrock, Vertex, Azure(β) |

---

## 5. Context Management

| 기능 | 핵심 | ZDR | 플랫폼 |
|------|------|:---:|--------|
| **Compaction** | 서버 사이드 자동 컨텍스트 요약. Opus 4.6/Sonnet 4.6 | O | 전체(β) |
| **Context editing** | 자동 컨텍스트 관리 전략. 토큰 한계 접근 시 tool result 정리, thinking 블록 관리 | O | 전체(β) |
| **Auto prompt caching** | 단일 API 파라미터로 자동 캐싱. 마지막 캐시 가능 블록 자동 캐시 | O | API, Azure(β) |
| **Prompt caching (5m)** | 표준 5분 캐시 | O | API, Bedrock, Vertex, Azure(β) |
| **Prompt caching (1hr)** | 1시간 확장 캐시 | O | API, Vertex, Azure(β) |
| **Token counting** | 전송 전 토큰 수 계산 | O | API, Bedrock, Vertex, Azure(β) |

---

## 6. Files & Assets

| 기능 | 핵심 | ZDR | 플랫폼 |
|------|------|:---:|--------|
| **Files API** | 파일 업로드/관리. 요청마다 재업로드 불필요. PDF/이미지/텍스트 | X | API(β), Azure(β) |

---

## ZDR 주의사항

| 기능 | ZDR 제한 |
|------|---------|
| Structured outputs | 프롬프트/출력 미저장. JSON 스키마만 24시간 캐시 |
| Tool search | 도구 카탈로그(이름/설명/메타)만 서버 저장. 구현은 ZDR |
| Web search/fetch | dynamic filtering 활성화 시 ZDR 비적격 |

> [insight] API 기능의 5영역 분류(Model capabilities / Tools / Tool infrastructure / Context management / Files)는 하네스 아키텍처 레이어와 직접 대응한다. 하네스에서 API 호출을 구성할 때 이 5개 축이 설계 차원이 된다: 모델 동작 제어, 도구 정의, 도구 오케스트레이션, 컨텍스트 수명 관리, 자산 관리.

> [insight] Server-side vs Client-side 도구 구분이 핵심이다. Code execution/Web search/Web fetch는 **Anthropic 서버가 실행**하고, Bash/Computer use/Memory/Text editor는 **하네스가 구현/실행**한다. 하네스에서 client-side 도구의 tool_use 응답을 받아 실제 실행 후 결과를 반환하는 루프를 구현해야 한다.

> [insight] **MCP connector**가 Messages API에서 직접 원격 MCP 서버에 연결한다. Claude Code의 로컬 MCP와 달리, API 레벨에서 별도 MCP 클라이언트 없이 원격 서버를 사용할 수 있다. 하네스에서 MCP 통합 시 두 경로(로컬 stdio vs API MCP connector)를 선택해야 한다.

> [insight] **Compaction API**와 **Context editing**이 모두 베타로 전 플랫폼에서 사용 가능하다. Claude Code의 클라이언트 사이드 `/compact`를 API가 서버 사이드에서 대체할 수 있게 됨. 하네스에서 컨텍스트 관리를 API에 위임하면 클라이언트 로직이 크게 단순화된다.
