# API and Data Retention

---

Anthropic API의 데이터 보존 정책, ZDR, HIPAA 준비성에 대한 종합 문서.

---

## 1. 두 가지 데이터 처리 약정

| 약정 | 설명 |
|------|------|
| **ZDR (Zero Data Retention)** | API 응답 반환 후 고객 데이터를 저장하지 않음 (법률 준수 및 오용 방지 예외) |
| **HIPAA 준비성** | PHI 처리 조직을 위한 BAA 체결 + HIPAA 준비 API 접근 |

---

## 2. ZDR 범위

**ZDR 적용**:
- Claude Messages API, Token Counting API
- Claude Code (Commercial 조직 API 키 또는 Claude Enterprise + ZDR 활성화)

**ZDR 미적용**:
- Console/Workbench 사용
- Claude Free/Pro/Max/Teams/Enterprise (Claude Code 제외)
- 서드파티 통합 (Bedrock, Vertex AI 포함)

---

## 3. 기능별 ZDR/HIPAA 적격성 (핵심)

| 기능 | ZDR | HIPAA | 비고 |
|------|-----|-------|------|
| Messages API | ✅ | ✅ | |
| Token Counting | ✅ | ✅ | |
| Web Search | ✅¹ | ✅¹ | Dynamic filtering 제외 |
| Web Fetch | ✅² | ❌ | |
| Memory tool | ✅ | ✅ | 클라이언트 사이드 |
| Fast mode | ✅ | ✅ | |
| 1M context window | ✅ | ✅ | |
| Extended thinking | ✅ | ✅ | |
| Prompt caching | ✅ | ✅ | KV 캐시만 메모리 보관 |
| Structured outputs | ✅ (qualified) | ✅³ | JSON 스키마만 캐시 (24시간) |
| Computer use | ✅ | ❌ | |
| Context mgmt (compaction) | ✅ | ❌ | |
| Tool search | ✅ (qualified) | ❌ | 툴 카탈로그 메타데이터만 보관 |
| **Batch processing** | **❌** | **❌** | 29일 보존 |
| **Code execution** | **❌** | **❌** | 최대 30일 보존 |
| **Files API** | **❌** | **❌** | 명시적 삭제 전까지 보존 |
| **Agent skills** | **❌** | **❌** | 표준 정책 |
| **MCP connector** | **❌** | **❌** | 표준 정책 |

¹ Dynamic filtering은 ZDR/HIPAA 제외  
² Web fetch는 ZDR 적격이나 웹사이트 운영자가 별도 보관 가능  
³ JSON 스키마에 PHI 포함 금지

---

## 4. HIPAA 준비성

- BAA 체결 → Anthropic이 HIPAA 활성화 전용 조직 프로비저닝
- 비적격 기능 요청 시 **자동 400 에러** 반환
- HIPAA/일반 워크로드를 **별도 조직**으로 분리 필수

### PHI 포함 금지 위치
- JSON 스키마 property 이름, `enum`, `const`, `pattern`
- PHI는 메시지 콘텐츠(prompts/responses)에만 포함 허용

---

## 5. 예외: 정책 위반 시 보존

ZDR/HIPAA 약정에도 불구하고, 법률 준수 또는 Usage Policy 위반 감지 시 **최대 2년** 보존 가능.

---

## 6. ZDR 제한사항

- **CORS 미지원**: ZDR 조직은 브라우저 직접 API 호출 불가 → 백엔드 프록시 필수

---

> [insight] 하네스의 플러그인 데이터 처리 정책 설계에서 이 문서가 가장 직접적인 기준이다. 핵심 결론: (1) Messages API 기반 플러그인은 ZDR 적용 가능 → 의료/금융/법률 플러그인에서 신뢰도 있게 홍보 가능, (2) Files API/Batch/Code Execution을 사용하는 플러그인은 ZDR 약정에서 제외 → 플러그인 마켓플레이스에서 "ZDR 호환" 뱃지 부여 시 이 기능들 사용 여부를 체크해야 함, (3) HIPAA 적격 플러그인은 별도 조직 필수 → 하네스가 HIPAA 고객용 별도 테넌트를 제공해야 하며, Computer Use/Context Management/MCP Connector 플러그인은 HIPAA 테넌트에서 자동 차단해야 한다.
