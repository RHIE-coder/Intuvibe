# Claude Code Analytics API

---

Claude Code 사용자의 일별 집계 생산성 메트릭에 프로그래밍 방식으로 접근.  
**Admin API 키 필요** (`sk-ant-admin...`).

---

## 1. 엔드포인트

```
GET /v1/organizations/usage_report/claude_code
```

### 파라미터

| 파라미터 | 필수 | 설명 |
|---------|------|------|
| `starting_at` | ✅ | YYYY-MM-DD (UTC). 단 하루치 데이터 반환 |
| `limit` | - | 페이지당 레코드 수 (기본 20, 최대 1000) |
| `page` | - | 이전 응답의 `next_page` 커서 |

---

## 2. 응답 메트릭 (사용자 × 일 단위)

### 차원 (Dimensions)
- `date`: RFC 3339 UTC 타임스탬프
- `actor`: `user_actor` (email) 또는 `api_actor` (API 키 이름)
- `customer_type`: `"api"` (PAYG) 또는 `"subscription"` (Pro/Team)
- `terminal_type`: `"vscode"`, `"iTerm.app"`, `"tmux"` 등

### 핵심 메트릭
```json
"core_metrics": {
  "num_sessions": 5,
  "lines_of_code": { "added": 1543, "removed": 892 },
  "commits_by_claude_code": 12,
  "pull_requests_by_claude_code": 2
}
```

### 툴 수락/거절률
```json
"tool_actions": {
  "edit_tool": { "accepted": 45, "rejected": 5 },
  "write_tool": { "accepted": 8, "rejected": 1 },
  "notebook_edit_tool": { "accepted": 3, "rejected": 0 }
}
```
수락률 = `accepted / (accepted + rejected)`

### 모델별 비용
```json
"model_breakdown": [{
  "model": "claude-opus-4-6",
  "tokens": { "input": 100000, "output": 35000, "cache_read": 10000, "cache_creation": 5000 },
  "estimated_cost": { "currency": "USD", "amount": 1025 }
}]
```
`amount`는 **센트(cents) USD** 단위.

---

## 3. 제약사항

| 항목 | 내용 |
|------|------|
| 데이터 신선도 | 활동 후 최대 1시간 지연 |
| 실시간 메트릭 | ❌ 일별 집계만 (실시간은 OpenTelemetry 사용) |
| 지원 범위 | Claude API 1P만 (Bedrock/Vertex 미포함) |
| API 사용 비용 | 무료 |
| 데이터 보존 | 명시된 삭제 기한 없음 |

---

## 4. 주요 활용 사례

- 임원 대시보드: 개발 속도에 대한 Claude Code 영향 리포트
- AI 툴 비교: Copilot/Cursor 대비 지표 비교
- 팀별 비용 할당
- 도입 ROI 정당화

---

> [insight] 하네스 플랫폼에서 Claude Code를 내부 개발 도구로 채택하는 경우, 이 API로 하네스 개발자들의 생산성 메트릭을 직접 수집할 수 있다. 특히 `edit_tool` 수락률은 하네스 플러그인 개발 품질 지표로, `lines_of_code.added/removed`는 개발 속도 측정 지표로 활용 가능하다. `estimated_cost`의 센트 단위를 달러로 변환할 때 100으로 나눠야 함에 주의.
