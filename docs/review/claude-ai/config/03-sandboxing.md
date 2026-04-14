# Sandboxing — OS 레벨 격리

---

Bash 명령과 그 하위 프로세스를 **OS 레벨**에서 파일시스템/네트워크 격리하는 장치.
Permission 시스템(Claude 도구 레벨)과 별개로, 모든 subprocess에 적용된다.

---

## 1. 왜 필요한가

Permission만으로는:
- **승인 피로** — 반복 클릭으로 주의력 하락
- **생산성 저하** — 매번 중단
- **Bash 우회** — `Read(./.env)` deny가 `cat .env`를 못 막음

Sandbox는:
- 명확한 경계 정의 → 그 안에서 자유롭게 실행
- OS 레벨 강제 → prompt injection이 Claude 판단을 우회해도 OS가 차단
- 승인 프롬프트 감소 → 샌드박스 내 명령은 자동 허용 가능

---

## 2. 격리 2축

### 파일시스템 격리

- **기본 쓰기**: 현재 작업 디렉토리 + 하위만
- **기본 읽기**: 전체 (특정 경로 deny 가능)
- `sandbox.filesystem.allowWrite` → 추가 쓰기 경로
- `sandbox.filesystem.denyRead` → 읽기 차단 경로
- `sandbox.filesystem.allowRead` → denyRead 내에서 재허용
- OS 레벨 강제 → `kubectl`, `terraform`, `npm` 등 모든 subprocess에 적용

### 네트워크 격리

- 프록시 서버를 통해 도메인 단위 제한
- 미허용 도메인 접근 시 → 프롬프트 (또는 `allowManagedDomainsOnly` 시 자동 차단)
- 모든 스크립트/프로그램/하위 프로세스에 적용

### OS 구현

| 플랫폼 | 기술 |
|--------|------|
| macOS | Seatbelt (빌트인) |
| Linux / WSL2 | bubblewrap + socat (설치 필요) |
| WSL1 | 미지원 |
| Windows 네이티브 | 계획 중 |

---

## 3. 활성화

```
/sandbox
```

또는 settings:

```json
{
  "sandbox": {
    "enabled": true,
    "autoAllowBashIfSandboxed": true
  }
}
```

`sandbox.failIfUnavailable: true` → 샌드박스 시작 실패 시 CLI 종료 (managed 배포용).

---

## 4. 두 가지 모드

| 모드 | 동작 |
|------|------|
| **Auto-allow** (기본) | 샌드박스 내 Bash 자동 허용. 샌드박스 밖 필요 시 일반 권한 플로우 |
| **Regular permissions** | 샌드박스 안에서도 표준 권한 프롬프트 |

Auto-allow는 permission mode 설정과 **독립적으로 동작** — acceptEdits 모드가 아니어도 샌드박스 내 Bash는 자동 실행.

---

## 5. 파일시스템 설정

```json
{
  "sandbox": {
    "enabled": true,
    "filesystem": {
      "allowWrite": ["/tmp/build", "~/.kube"],
      "denyWrite": ["/etc", "/usr/local/bin"],
      "denyRead": ["~/"],
      "allowRead": ["."]
    }
  }
}
```

### 경로 접두사

| 접두사 | 의미 |
|--------|------|
| `/` | 파일시스템 절대경로 |
| `~/` | 홈 디렉토리 상대 |
| `./` / 없음 | project settings에서는 프로젝트 루트, user settings에서는 `~/.claude` 상대 |

### 병합 규칙

- `allowWrite`, `denyWrite`, `denyRead`, `allowRead` 모두 **스코프 간 concat** (대체 아님)
- Permission 규칙의 `Edit(...)` allow/deny, `Read(...)` deny도 sandbox에 **병합**
- `allowRead`는 `denyRead`보다 우선
- `allowManagedReadPathsOnly: true` → managed의 allowRead만 적용 (사용자 것 무시)

---

## 6. 네트워크 설정

```json
{
  "sandbox": {
    "network": {
      "allowedDomains": ["github.com", "*.npmjs.org"],
      "allowUnixSockets": ["/var/run/docker.sock"],
      "allowLocalBinding": true
    }
  }
}
```

- `allowedDomains` — 와일드카드 지원 (`*.example.com`)
- `allowManagedDomainsOnly: true` → managed의 도메인만 허용, 사용자 것 무시, 미허용 도메인 자동 차단 (프롬프트 없음)
- 커스텀 프록시: `httpProxyPort`, `socksProxyPort`

---

## 7. 보안 효과

### Prompt Injection 방어

파일시스템: `~/.bashrc` 수정 불가, `/bin/` 수정 불가, denied 파일 읽기 불가
네트워크: 데이터 유출 불가, 비인가 스크립트 다운로드 불가, 미허용 API 호출 불가

### 공격 표면 축소

악성 의존성, 취약한 빌드 스크립트, 소셜 엔지니어링, prompt injection 모두 샌드박스 경계에서 차단.

---

## 8. 보안 한계

| 한계 | 설명 |
|------|------|
| **네트워크 필터링** | 도메인 제한만. 트래픽 내용은 검사 안 함. `github.com` 같은 넓은 도메인 허용 시 유출 가능 |
| **Domain fronting** | 네트워크 필터링 우회 가능 |
| **Unix Socket** | `allowUnixSockets`로 `/var/run/docker.sock` 허용 시 호스트 시스템 접근 가능 (사실상 샌드박스 무효화) |
| **파일시스템 권한 확대** | PATH 내 실행 파일, 셸 설정 파일에 쓰기 허용 시 권한 확대 위험 |
| **Linux 약화 모드** | `enableWeakerNestedSandbox` = Docker 내부용. 보안 대폭 약화 |

---

## 9. 탈출 장치 (Escape Hatch)

샌드박스 제한으로 명령 실패 시 Claude가 `dangerouslyDisableSandbox`로 재시도 가능. 이 경우 일반 권한 플로우를 거침.

비활성화: `"allowUnsandboxedCommands": false` → 모든 명령이 샌드박스 또는 `excludedCommands` 내에서만 실행.

---

## 10. 샌드박스가 커버하지 않는 것

| 도구 | 격리 방식 |
|------|---------|
| **Bash** | 샌드박스 (OS 레벨) |
| **Read, Edit, Write** | Permission 시스템 (Claude 도구 레벨) |
| **Computer Use** | 실제 데스크톱에서 실행 (격리 없음, 앱별 권한 프롬프트) |

---

## 11. 오픈소스

샌드박스 런타임은 npm 패키지로 공개:

```bash
npx @anthropic-ai/sandbox-runtime <command-to-sandbox>
```

자체 에이전트 프로젝트나 MCP 서버 격리에도 사용 가능.

> [insight] 샌드박스는 Permission과 **상호 보완적**이다. Permission = Claude 도구 레벨 제어 (시도 자체를 막음), Sandbox = OS 레벨 강제 (모든 subprocess 포함). 두 레이어를 함께 써야 defense-in-depth가 완성된다. 특히 `Read(./.env)` deny는 `cat .env`를 못 막으므로, sandbox의 `denyRead`가 필수 보완.

> [insight] `allowUnixSockets`에 `/var/run/docker.sock`을 허용하면 docker socket을 통해 호스트 시스템에 접근 가능 → 사실상 샌드박스 무효화. 하네스에서 Docker 연동이 필요하면 `excludedCommands: ["docker *"]`로 Docker를 샌드박스 밖에서 실행하되, 일반 권한 플로우를 거치게 하는 것이 더 안전.

> [insight] 샌드박스 런타임이 오픈소스 npm 패키지(`@anthropic-ai/sandbox-runtime`)로 공개되어 있다. 하네스에서 자체 에이전트나 MCP 서버를 격리하는 데 직접 활용할 수 있다.

> [insight] `autoAllowBashIfSandboxed: true`(기본)는 permission mode 설정과 독립적으로 동작한다. 즉 default permission mode에서도 샌드박스 내 Bash는 프롬프트 없이 실행된다. 이는 편의성 극대화이지만, 어떤 명령이 샌드박스 안에서 실행되는지 인지하지 못할 위험이 있다.
