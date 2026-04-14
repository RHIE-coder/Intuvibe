# Usage and Cost API

---

조직의 API 사용량 및 비용 데이터에 프로그래밍 방식으로 접근.  
**Admin API 키 필요** (`sk-ant-admin...`).

---

## 1. 두 엔드포인트

| 엔드포인트 | 목적 | 시간 단위 |
|-----------|------|---------|
| `/v1/organizations/usage_report/messages` | 토큰 소비량 추적 | `1m`, `1h`, `1d` |
| `/v1/organizations/cost_report` | USD 비용 내역 | `1d`만 지원 |

---

## 2. Usage API

### 핵심 개념
- **Time buckets**: `1m`/`1h`/`1d` 고정 구간
- **토큰 분류**: 미캐시 입력 / 캐시 입력 / 캐시 생성 / 출력
- **필터/그룹**: API 키, 워크스페이스, 모델, 서비스 티어, 컨텍스트 윈도우, `inference_geo`, `speed`

### 기본 예시

```bash
# 모델별 일간 사용량
GET /v1/organizations/usage_report/messages?\
  starting_at=2025-01-01T00:00:00Z&\
  ending_at=2025-01-08T00:00:00Z&\
  group_by[]=model&\
  bucket_width=1d

# 워크스페이스/API키 필터
GET ...&api_key_ids[]=apikey_xxx&workspace_ids[]=wrkspc_xxx

# inference_geo별 분류 (데이터 레지던시 감사용)
GET ...&group_by[]=inference_geo&group_by[]=model

# fast mode 사용량 (beta header 필요)
GET ...&group_by[]=speed  # 헤더: anthropic-beta: fast-mode-2026-02-01
```

### 시간 단위별 제한

| 단위 | 기본 | 최대 | 용도 |
|------|------|------|------|
| `1m` | 60 | 1440 | 실시간 모니터링 |
| `1h` | 24 | 168 | 일간 패턴 |
| `1d` | 7 | 31 | 주간/월간 리포트 |

---

## 3. Cost API

- 통화: USD, 소수점 문자열 (센트 단위)
- 비용 유형: 토큰 사용, 웹 검색, 코드 실행
- 그룹: `workspace_id`, `description` (모델/inference_geo 파싱 포함)

```bash
GET /v1/organizations/cost_report?\
  starting_at=2025-01-01T00:00:00Z&\
  ending_at=2025-01-31T00:00:00Z&\
  group_by[]=workspace_id&\
  group_by[]=description
```

> **주의**: Priority Tier 비용은 cost 엔드포인트에 포함되지 않음 → usage 엔드포인트에서 `service_tier=priority`로 추적.

---

## 4. 페이지네이션

```bash
# 응답에 has_more: true, next_page: "page_xyz" 포함
# 다음 요청: &page=page_xyz
```

---

## 5. FAQ 핵심

| 질문 | 답 |
|------|---|
| 데이터 신선도 | 요청 완료 후 약 5분 내 반영 |
| 권장 폴링 주기 | 분당 1회 |
| 코드 실행 비용 위치 | cost 엔드포인트 `Code Execution Usage` |
| Default Workspace 식별 | `workspace_id: null` |
| Workbench 사용 | `api_key_id: null` |

---

## 6. 파트너 솔루션

CloudZero, Datadog, Grafana Cloud, Honeycomb, Vantage — 코드 없이 바로 사용 가능한 Claude API 모니터링 대시보드 제공.

---

> [insight] 하네스의 플러그인별 비용 청구(chargeback) 시스템의 핵심이 이 API다. `workspace_id`로 그룹화하면 플러그인별 비용을 자동으로 분리할 수 있고, `description` 그룹화로 모델별 세분화도 가능하다. 특히 `inference_geo` 차원은 US-only 데이터 레지던시 설정이 실제로 적용되고 있는지 컴플라이언스 감사에 활용할 수 있다. 하네스 대시보드에서 이 API를 5분 간격으로 폴링해 실시간 비용 모니터링을 제공하는 것이 타당하다.
