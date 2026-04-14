# Secure Deployment of Agent SDK

---

에이전트는 동적으로 행동을 생성 → **프롬프트 인젝션** 리스크. 기본 원칙: **격리 + 최소 권한 + 심층 방어**.

---

## 1. Claude Code 내장 보안 기능

| 기능 | 설명 |
|------|------|
| 권한 시스템 | 툴/Bash 명령별 allow/block/prompt 설정, glob 패턴 지원 |
| 정적 분석 | Bash 명령 실행 전 위험 작업 감지 (시스템 파일 수정, 민감 디렉토리 접근) |
| 웹 검색 요약 | 원본 HTML 대신 요약 전달 → 프롬프트 인젝션 감소 |
| 샌드박스 모드 | Bash 명령을 파일시스템/네트워크 제한 환경에서 실행 |

---

## 2. 격리 기술 비교

| 기술 | 격리 강도 | 성능 오버헤드 | 복잡도 |
|------|----------|------------|--------|
| sandbox-runtime | 양호 (보안 기본값) | 매우 낮음 | 낮음 |
| Docker (표준) | 설정 의존 | 낮음 | 중간 |
| gVisor | 우수 | 중간-높음 | 중간 |
| VM (Firecracker, QEMU) | 우수 | 높음 | 중-높음 |

### sandbox-runtime
- npm 패키지, OS 프리미티브 사용 (Linux: bubblewrap / macOS: sandbox-exec)
- JSON 설정으로 허용 도메인 + 파일시스템 경로 allowlist
- 단점: 호스트 커널 공유 → 커널 취약점 통한 탈출 가능

### Docker 강화 설정
```bash
docker run \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --security-opt seccomp=/path/to/profile.json \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=100m \
  --network none \
  --memory 2g \
  --pids-limit 100 \
  --user 1000:1000 \
  -v /path/to/code:/workspace:ro \
  -v /var/run/proxy.sock:/var/run/proxy.sock:ro \
  agent-image
```

`--network none` → 외부 통신은 마운트된 Unix 소켓(프록시)을 통해서만 가능.

### gVisor
- 시스템콜을 유저스페이스에서 인터셉트 → 호스트 커널 노출 최소화
- 파일 I/O 집중 작업 시 10-200x 느려질 수 있음
- 멀티테넌트 환경에서 추가 격리 가치 있음

---

## 3. 자격증명 관리: 프록시 패턴

에이전트가 자격증명을 직접 보지 않도록 **보안 경계 외부**의 프록시가 자격증명 주입.

### Claude API 요청 프록시

```bash
# 방법 1: 샘플링 요청만 (평문 HTTP → 검사/수정 가능)
export ANTHROPIC_BASE_URL="http://localhost:8080"

# 방법 2: 시스템 전체 (HTTPS → TLS 터널, 내용 불가시)
export HTTP_PROXY="http://localhost:8080"
export HTTPS_PROXY="http://localhost:8080"
```

### 기타 서비스 자격증명

| 방법 | 설명 | 특징 |
|------|------|------|
| **커스텀 툴 (MCP)** | 에이전트가 툴 호출 → 외부 프록시가 인증 처리 | TLS 인터셉션 불필요, 자격증명 격리 |
| **TLS-terminating 프록시** | 프록시가 TLS 복호화 → 수정 → 재암호화 | 모든 HTTPS 서비스 대응, 인증서 관리 복잡 |

**Node.js 주의**: `fetch()`는 기본적으로 HTTP_PROXY 무시 → Node.js 24+에서 `NODE_USE_ENV_PROXY=1` 필요.

---

## 4. 파일시스템 설정

### 읽기 전용 마운트
```bash
docker run -v /path/to/code:/workspace:ro agent-image
```

### 마운트 전 제외 필수 파일 (자격증명 노출 위험)
`.env`, `~/.aws/credentials`, `~/.kube/config`, `*.pem`, `*.key`,  
`~/.docker/config.json`, `*-service-account.json`, `.npmrc`

### 쓰기 가능 영역 옵션

| 옵션 | 설명 |
|------|------|
| `tmpfs` | 메모리 내 임시 쓰기, 컨테이너 종료 시 삭제 |
| 오버레이 FS | 원본 파일 미수정, 변경 레이어 검토 후 적용/폐기 |
| 전용 볼륨 | 영속적 출력 (민감 디렉토리와 분리 필수) |

---

## 5. 최소 권한 원칙

| 리소스 | 제한 방법 |
|--------|----------|
| 파일시스템 | 필요한 디렉토리만 마운트, 가능하면 읽기 전용 |
| 네트워크 | 프록시를 통해 특정 엔드포인트만 허용 |
| 자격증명 | 프록시에서 주입, 에이전트에 직접 노출 안 함 |
| 시스템 능력 | Linux capabilities drop (`--cap-drop ALL`) |

---

> [insight] Unix 소켓 + 프록시 아키텍처(`--network none` + `/var/run/proxy.sock`)는 하네스의 플러그인 샌드박스 네트워크 설계에서 핵심 패턴이다. 플러그인이 외부 API를 호출할 때 자격증명을 직접 갖지 않고 프록시를 통해서만 인증 요청을 보내도록 강제하면, 악성 플러그인이 자격증명을 탈취해 다른 서비스에 전송하는 공격을 차단할 수 있다. 하네스의 플러그인 실행 환경에서 `allowedDomains` 설정을 플러그인 스펙의 일부로 표준화하면 자동화된 접근 제어가 가능하다.

> [insight] 마운트 전 자격증명 파일 제외 목록(`.env`, `~/.aws`, `~/.kube` 등)은 하네스의 플러그인 실행 환경 설정 가이드에 체크리스트로 포함해야 한다. 특히 사용자의 로컬 디렉토리를 플러그인 작업 공간으로 마운트할 때 이 파일들이 자동으로 제외되도록 하네스 레벨에서 필터링 로직을 구현하면 사용자 실수를 방지할 수 있다.
