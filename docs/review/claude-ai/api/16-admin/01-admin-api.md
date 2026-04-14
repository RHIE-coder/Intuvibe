# Admin API Overview

---

조직의 멤버, 워크스페이스, API 키를 프로그래밍 방식으로 관리.

**전제 조건**:
- 개인 계정 불가 — 조직(Organization) 필요
- 특수 Admin API 키 필요: `sk-ant-admin...`
- admin 역할 멤버만 Admin API 키 발급 가능

---

## 1. 인증

```bash
x-api-key: $ANTHROPIC_ADMIN_KEY
```

표준 API 키(`sk-ant-api...`)와 완전히 별개.

---

## 2. 조직 역할 (5가지)

| 역할 | 권한 |
|------|------|
| `user` | Workbench 사용 |
| `claude_code_user` | Workbench + Claude Code |
| `developer` | Workbench + API 키 관리 |
| `billing` | Workbench + 결제 관리 |
| `admin` | 모든 권한 + 멤버 관리 |

---

## 3. 관리 대상 리소스 및 엔드포인트

### 조직 멤버 (`/v1/organizations/users`)
```bash
GET    /v1/organizations/users?limit=10       # 목록
POST   /v1/organizations/users/{user_id}      # 역할 변경
DELETE /v1/organizations/users/{user_id}      # 제거
```

### 초대 (`/v1/organizations/invites`)
```bash
POST   /v1/organizations/invites              # 초대 생성 (email, role)
GET    /v1/organizations/invites?limit=10     # 목록
DELETE /v1/organizations/invites/{invite_id} # 취소
```
> 초대 유효기간: **21일** (변경 불가)

### 워크스페이스 멤버 (`/v1/organizations/workspaces/{id}/members`)
```bash
POST   .../members                            # 멤버 추가 (workspace_role)
GET    .../members?limit=10                   # 목록
POST   .../members/{user_id}                  # 역할 변경
DELETE .../members/{user_id}                  # 제거
```

### API 키 (`/v1/organizations/api_keys`)
```bash
GET    /v1/organizations/api_keys?status=active&workspace_id=...  # 목록
POST   /v1/organizations/api_keys/{api_key_id}                   # 상태/이름 변경
```
> 신규 API 키 생성은 Console에서만 가능 (API 불가)

### 조직 정보
```bash
GET /v1/organizations/me
```

---

## 4. 제약 사항 (FAQ)

| 항목 | 내용 |
|------|------|
| Admin API로 API 키 생성 | ❌ Console에서만 가능 |
| 멤버 제거 시 API 키 처리 | 키는 조직 스코프 → 그대로 유지 |
| admin 역할 멤버 API 제거 | ❌ 보안상 불가 |
| 초대 유효기간 변경 | ❌ 21일 고정 |

---

> [insight] Admin API는 하네스의 멀티테넌시 아키텍처에서 핵심 관리 레이어다. 조직별 워크스페이스를 자동으로 프로비저닝하고, 플러그인 개발자에게 `developer` 역할을, 플러그인 사용자에게 `user` 역할을 자동으로 부여하는 온보딩 파이프라인을 Admin API로 구현할 수 있다. 특히 사용자 오프보딩 시 워크스페이스에서 자동 제거하는 로직이 하네스의 보안 컴플라이언스에 필요하다.

> [insight] API 키가 조직 스코프(사용자 스코프 아님)인 점은 하네스의 키 관리 설계에 중요하다. 플러그인별 격리를 위해 워크스페이스를 활용하고, 각 워크스페이스에 별도의 API 키를 할당하는 패턴이 하네스의 플러그인 레이트 리밋 격리와 비용 추적에 유리하다.
