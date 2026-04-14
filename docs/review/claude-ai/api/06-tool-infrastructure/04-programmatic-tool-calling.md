# Programmatic Tool Calling

---

Claude가 code_execution 컨테이너 안에서 코드를 작성해 툴을 직접 호출. 다중 툴 워크플로우의 라운드트립 제거 + 중간 결과를 컨텍스트에 로드하지 않음.

- **ZDR: ❌ 미지원** (표준 데이터 보존 정책 적용)
- 필수 조건: `code_execution_20260120` 툴 활성화
- 지원 플랫폼: Claude API, Microsoft Foundry

---

## 1. 핵심 개념

**문제**: 20개 직원 예산 검사 시 전통 방식 = 20번 API 라운드트립 + 수천 라인 raw 데이터 컨텍스트 로드

**해결**: Claude가 Python 코드 1개 작성 → 컨테이너 안에서 20번 툴 호출 → 초과분만 반환

**효과**: 중간 tool_result가 컨텍스트에 진입하지 않음. 토큰 소비 최대 10배 감소.

---

## 2. 설정

```json
// code_execution 툴 (필수, 프로그래매틱 전용 버전)
{"type": "code_execution_20260120", "name": "code_execution"}

// 프로그래매틱 호출 허용 툴
{
  "name": "query_database",
  "description": "Execute SQL. Returns JSON array of rows.",
  "input_schema": {"type": "object", "properties": {"sql": {"type": "string"}}, "required": ["sql"]},
  "allowed_callers": ["code_execution_20260120"]
}
```

### allowed_callers 값

| 값 | 의미 |
|----|------|
| `["direct"]` | Claude가 직접 호출만 (기본값) |
| `["code_execution_20260120"]` | 코드 실행 내에서만 호출 가능 |
| `["direct", "code_execution_20260120"]` | 둘 다 가능 (비권장, 모호성 증가) |

---

## 3. 응답 구조

```json
// Claude 응답
{
  "content": [
    {"type": "server_tool_use", "id": "srvtoolu_abc", "name": "code_execution",
     "input": {"code": "results = await query_database('<sql>')\nprint(max(results, key=lambda x: x['revenue']))"}},
    {"type": "tool_use", "id": "toolu_def", "name": "query_database",
     "input": {"sql": "<sql>"},
     "caller": {"type": "code_execution_20260120", "tool_id": "srvtoolu_abc"}}
  ],
  "container": {"id": "container_xyz", "expires_at": "..."},
  "stop_reason": "tool_use"
}
```

**`caller.type`**: 호출 방식 식별 (`"direct"` 또는 `"code_execution_20260120"`)

---

## 4. 메시지 포맷 제약

프로그래매틱 툴 결과 응답 시 **tool_result 블록만** 포함 가능. 텍스트 혼합 불가.

```json
// ❌ 잘못된 형식
{"role": "user", "content": [
  {"type": "tool_result", "tool_use_id": "toolu_def", "content": "[...]"},
  {"type": "text", "text": "다음에 뭘 하면 좋을까요?"}
]}

// ✅ 올바른 형식
{"role": "user", "content": [
  {"type": "tool_result", "tool_use_id": "toolu_def", "content": "[...]"}
]}
```

(일반 클라이언트 툴 호출에서는 이 제약 없음)

---

## 5. 고급 패턴

### 배치 처리 루프
```python
regions = ["West", "East", "Central"]
results = {}
for region in regions:
    data = await query_database(f"SELECT revenue FROM sales WHERE region='{region}'")
    results[region] = sum(row["revenue"] for row in data)
print(max(results.items(), key=lambda x: x[1]))
```
N번 라운드트립 → 1번 코드 실행.

### 조기 종료
```python
for endpoint in endpoints:
    status = await check_health(endpoint)
    if status == "healthy":
        print(f"Found: {endpoint}")
        break
```

### 데이터 필터링
```python
logs = await fetch_logs(server_id)
errors = [log for log in logs if "ERROR" in log]
print(f"{len(errors)} errors found")
for e in errors[-10:]:
    print(e)
```

---

## 6. 컨테이너 수명

- 유휴 타임아웃: **4.5분** (타임아웃 시 `TimeoutError`로 stderr 반환)
- 최대 수명: **30일**
- 재사용: `container` 필드에 ID 전달

**주의**: 툴 호출 응답 지연 시 컨테이너 만료 가능. `expires_at` 모니터링 필수.

---

## 7. 제약 사항

| 항목 | 제약 |
|------|------|
| Structured outputs | `strict: true` 툴과 비호환 |
| tool_choice | 프로그래매틱 강제 호출 불가 |
| disable_parallel_tool_use | 미지원 |
| MCP connector 툴 | 프로그래매틱 호출 불가 |

---

## 8. 토큰 효율

- 프로그래매틱 tool_result는 Claude 컨텍스트에 추가되지 않음
- 중간 처리(필터링, 집계)가 코드에서 처리 → 모델 토큰 미소비
- 10개 툴 직접 호출 = 프로그래매틱 + 요약 반환 대비 ~10배 토큰

---

> [insight] 프로그래매틱 툴 호출은 하네스의 "대량 데이터 처리 에이전트" 설계에서 핵심이다. 100개 파일 분석, 50개 DB 레코드 집계, 20개 API 병렬 호출 등 N번 라운드트립이 필요한 작업을 단 1번의 코드 실행으로 처리할 수 있다.

> [insight] `allowed_callers: ["code_execution_20260120"]`만 설정하면 Claude가 직접 호출하지 못하고 코드 실행 내에서만 호출 가능한 보안 툴을 만들 수 있다. 하네스에서 DB 수정, 파일 삭제 등 위험 작업을 Claude가 자의적으로 실행하지 못하게 강제하는 보안 레이어로 활용 가능.

> [insight] 프로그래매틱 툴 호출 응답에서 텍스트 혼합 불가 제약은 하네스의 에이전트 루프 구현에서 자주 실수하는 지점이다. `stop_reason: "tool_use"` + `caller.type: "code_execution_20260120"` 조합을 감지하면 tool_result만 반환하도록 별도 처리 분기가 필요하다.

> [insight] ZDR 미지원은 하네스에서 프로그래매틱 툴 호출을 사용할 때 데이터 보안 정책을 검토해야 함을 의미한다. 민감 데이터(PII, 금융 정보)가 포함된 툴 결과는 컨테이너에서 30일간 보관되므로, ZDR이 필요한 워크플로우에서는 클라이언트 사이드 구현을 고려해야 한다.
