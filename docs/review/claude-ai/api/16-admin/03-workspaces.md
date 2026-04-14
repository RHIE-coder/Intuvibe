# Workspaces

---

조직 내 API 사용을 구조화하는 단위. 프로젝트/환경/팀별 분리 + 중앙 청구 관리.

---

## 1. 핵심 특성

- **Default Workspace**: 모든 조직에 존재, 이름 변경/삭제 불가, ID 없음 (`null`)
- **식별자**: `wrkspc_` prefix (예: `wrkspc_01JwQvzr7rXLA5AGx3HKfFUJ`)
- **최대 100개** 워크스페이스 (아카이브된 것 제외)
- **API 키**: 단일 워크스페이스 스코프 — 해당 워크스페이스 리소스에만 접근 가능

---

## 2. 워크스페이스 역할 (5가지)

| 역할 | 권한 |
|------|------|
| Workspace User | Workbench만 |
| Workspace Limited Developer | API 키 관리 + API 사용 (세션 추적 뷰/파일 다운로드 불가) |
| Workspace Developer | API 키 관리 + API 사용 |
| Workspace Admin | 워크스페이스 완전 제어 |
| Workspace Billing | 결제 정보 조회 (조직 billing 역할에서 자동 상속, 수동 할당 불가) |

**역할 상속**:
- 조직 admin → 모든 워크스페이스에 자동 Workspace Admin
- 조직 billing → 모든 워크스페이스에 자동 Workspace Billing
- 조직 user/developer → 각 워크스페이스에 **수동** 추가 필요

---

## 3. Admin API로 관리

```bash
# 워크스페이스 생성
POST /v1/organizations/workspaces
{"name": "Production"}

# 목록 조회
GET /v1/organizations/workspaces?limit=10&include_archived=false

# 아카이브 (되돌릴 수 없음, 모든 API 키 즉시 비활성화)
POST /v1/organizations/workspaces/{workspace_id}/archive
```

---

## 4. 워크스페이스 스코프 리소스

| 리소스 | 비고 |
|--------|------|
| Files API | 워크스페이스 격리 |
| Message Batches | 워크스페이스 격리 |
| Skills API | 워크스페이스 격리 |
| Prompt Caches | 2026-02-05부터 워크스페이스 격리 (Claude API + Azure만) |

---

## 5. 제한 설정

- **Spend limits**: 월간 지출 상한
- **Rate limits**: RPM, 입력 TPM, 출력 TPM
- Default Workspace는 제한 설정 불가
- 미설정 시 조직 레벨 제한 그대로 적용

---

## 6. 주요 사용 패턴

| 패턴 | 워크스페이스 |
|------|------------|
| 환경 분리 | Development / Staging / Production |
| 팀 분리 | Engineering / Data Science / Support |
| 프로젝트별 | Project-A / Project-B |

---

## 7. FAQ 요약

| 질문 | 답 |
|------|---|
| 워크스페이스 최대 개수 | 100개 (아카이브 제외) |
| 아카이브 취소 | 불가 |
| 멤버 제거 시 API 키 | 조직/워크스페이스 스코프이므로 그대로 유지 |
| Workspace Billing 수동 할당 | 불가 (조직 billing 역할에서만 상속) |

---

> [insight] 하네스의 플러그인 마켓플레이스에서 워크스페이스는 **플러그인별 격리 단위**로 활용할 수 있다. 각 플러그인(또는 플러그인 카테고리)에 별도 워크스페이스를 할당하면: (1) 플러그인별 비용 추적, (2) 독립적 레이트 리밋 설정, (3) Files/Skills/Batches 리소스 격리가 자동으로 달성된다. Admin API로 플러그인 등록 시 워크스페이스를 자동 프로비저닝하고, 플러그인 삭제 시 아카이브하는 라이프사이클 관리가 필요하다.

> [insight] 2026-02-05부터 프롬프트 캐시가 워크스페이스 격리됨에 따라 하네스에서 공유 캐시 전략을 재검토해야 한다. 동일 플러그인을 여러 워크스페이스에서 사용하는 경우 캐시 히트율이 떨어질 수 있으므로, 공유 시스템 프롬프트는 워크스페이스 단위로 캐시 미러링하거나 캐시 비용 증가를 플러그인 가격 책정에 반영해야 한다.
