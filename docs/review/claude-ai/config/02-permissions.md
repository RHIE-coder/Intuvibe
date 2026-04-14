# Permissions — 권한 규칙 시스템

---

Claude Code가 무엇에 접근하고 무엇을 할 수 있는지를 세밀하게 제어하는 규칙 시스템.
deny → ask → allow 순서로 평가하며, deny가 항상 우선.

---

## 1. 도구별 기본 승인

| 도구 타입 | 예시 | 승인 필요 | "다시 묻지 않기" 범위 |
|----------|------|----------|-------------------|
| 읽기 전용 | File reads, Grep | X | - |
| Bash 명령 | Shell 실행 | O | 프로젝트 디렉토리 + 명령별 영구 |
| 파일 수정 | Edit/Write | O | 세션 종료까지 |

---

## 2. 규칙 평가 순서

```
deny (최우선) → ask → allow → 기본 동작
```

첫 번째 매칭 규칙이 적용. deny가 어디서든 걸리면 다른 레벨에서 allow해도 차단.

---

## 3. Permission Rule 문법

### 기본 형식

`Tool` 또는 `Tool(specifier)`

| 규칙 | 매칭 |
|------|------|
| `Bash` | 모든 Bash 명령 |
| `Bash(npm run build)` | 정확히 `npm run build` |
| `Bash(npm run *)` | `npm run `으로 시작하는 모든 명령 |
| `Read(./.env)` | 현재 디렉토리의 .env |
| `WebFetch(domain:example.com)` | example.com 도메인 |

### 와일드카드 (`*`)

- `Bash(ls *)` — `ls ` 뒤에 뭐가 오든 매칭. `lsof`는 매칭 안 됨 (공백 경계)
- `Bash(ls*)` — `ls`로 시작하는 모든 것. `lsof`도 매칭
- `Bash(* --version)` — `--version`으로 끝나는 모든 명령
- `Bash(git * main)` — `git checkout main`, `git merge main` 등

### Read / Edit 경로 패턴 (gitignore 스펙)

| 패턴 | 의미 | 예시 |
|------|------|------|
| `//path` | 파일시스템 **절대경로** | `Read(//Users/alice/secrets/**)` |
| `~/path` | **홈** 디렉토리 상대 | `Read(~/Documents/*.pdf)` |
| `/path` | **프로젝트 루트** 상대 | `Edit(/src/**/*.ts)` |
| `path` / `./path` | **현재 디렉토리** 상대 | `Read(*.env)` |

- `*` = 단일 디렉토리 내 매칭, `**` = 재귀 매칭
- Windows: `C:\Users\alice` → `/c/Users/alice`로 정규화

### 도구별 규칙

| 도구 | 패턴 | 예시 |
|------|------|------|
| **Bash** | 와일드카드 | `Bash(npm run *)` |
| **Read/Edit** | gitignore 패턴 | `Edit(/docs/**)`, `Read(~/.zshrc)` |
| **WebFetch** | domain 지정 | `WebFetch(domain:example.com)` |
| **MCP** | 서버/도구 지정 | `mcp__puppeteer__puppeteer_navigate` |
| **Agent** | 에이전트 이름 | `Agent(Explore)`, `Agent(my-agent)` |

---

## 4. Bash 규칙의 보안 한계

Bash 패턴으로 인자를 제한하는 것은 **취약**하다:

- 옵션 순서 변경: `curl -X GET http://github.com/...`
- 프로토콜 차이: `https://` vs `http://`
- 리다이렉트: `curl -L http://bit.ly/xyz`
- 변수: `URL=http://github.com && curl $URL`
- 여분의 공백

**대안:**
- Bash 네트워크 도구를 deny → WebFetch + domain 규칙으로 대체
- PreToolUse 훅으로 URL 검증
- CLAUDE.md에 허용 패턴 안내

> Read/Edit deny 규칙도 Claude의 빌트인 도구에만 적용. `cat .env` 같은 Bash 명령은 차단 안 됨. OS 레벨 차단이 필요하면 sandbox 사용.

---

## 5. 복합 명령 처리

`git status && npm test`를 "다시 묻지 않기"로 승인하면:
- 전체 문자열이 아닌 **각 서브명령별 규칙** 저장
- `npm test` 규칙이 저장되어 이후 단독 실행 시 인식
- `cd` 서브명령은 해당 경로의 Read 규칙 생성
- 하나의 복합 명령에서 최대 5개 규칙 저장

---

## 6. Hooks와 권한의 상호작용

- PreToolUse 훅은 **권한 규칙 평가 전에** 실행
- 훅 `deny` → allow 규칙이 있어도 차단
- 훅 `allow` → deny/ask 규칙이 있으면 여전히 적용
- **훅은 제한 강화만 가능, 완화 불가**

패턴: `allow: ["Bash"]` + PreToolUse 훅으로 특정 명령만 차단 → 대부분 자동 실행 + 위험한 것만 선별 차단.

---

## 7. Working Directories

```bash
claude --add-dir ../docs     # 시작 시
/add-dir                     # 세션 중
```

또는 `permissions.additionalDirectories` 설정.

### --add-dir의 제한

추가 디렉토리에서 로드되는 설정:

| 설정 | 로드 여부 |
|------|---------|
| `.claude/skills/` | O (라이브 리로드) |
| `enabledPlugins`, `extraKnownMarketplaces` | O |
| CLAUDE.md, `.claude/rules/` | `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD=1` 시만 |
| agents, commands, output-styles, hooks 등 | X |

공유 설정은 `~/.claude/`(user), 플러그인, 또는 해당 디렉토리에서 직접 실행으로 해결.

---

## 8. Permissions + Sandbox = 다중 방어

| 레이어 | 대상 | 역할 |
|--------|------|------|
| **Permissions** | 모든 도구 | Claude가 시도 자체를 차단 |
| **Sandbox** | Bash만 | OS 레벨에서 파일시스템/네트워크 접근 차단 |

- Permission deny → 시도 자체를 막음
- Sandbox → prompt injection이 Claude 판단을 우회해도 OS가 차단
- `autoAllowBashIfSandboxed: true` (기본) → 샌드박스 안이면 Bash 프롬프트 건너뜀

---

## 9. Auto Mode Classifier 설정

### environment (핵심)

```json
{
  "autoMode": {
    "environment": [
      "Source control: github.example.com/acme-corp",
      "Trusted cloud buckets: s3://acme-build-artifacts",
      "Trusted internal domains: *.corp.example.com",
      "Key internal services: Jenkins at ci.example.com"
    ]
  }
}
```

- 자연어 규칙 (regex 아님). 새 엔지니어에게 설명하듯 작성
- classifier가 "외부"를 판단하는 기준 → 목록에 없으면 잠재적 유출 대상

### allow / soft_deny (고급)

- `soft_deny` = 차단 규칙, `allow` = 예외
- **설정 시 기본 목록을 완전 대체** → `claude auto-mode defaults`로 기본 목록 복사 후 수정 필수
- `environment`만 설정하면 기본 allow/soft_deny 유지

```bash
claude auto-mode defaults   # 기본 규칙 확인
claude auto-mode config     # 현재 유효 설정
claude auto-mode critique   # AI가 커스텀 규칙 평가
```

읽기 범위: user settings, local settings, managed settings. **공유 project settings에서는 읽지 않음** (체크인된 레포가 자체 allow 규칙 주입 방지).

---

## 10. Managed-only 설정 키

| 키 | 역할 |
|----|------|
| `allowManagedPermissionRulesOnly` | 사용자/프로젝트 권한 규칙 차단 |
| `allowManagedHooksOnly` | 사용자/프로젝트/플러그인 훅 차단 |
| `allowManagedMcpServersOnly` | managed MCP allowlist만 적용 |
| `sandbox.filesystem.allowManagedReadPathsOnly` | managed allowRead만 적용 |
| `sandbox.network.allowManagedDomainsOnly` | managed allowedDomains만 적용 |

> [insight] deny 규칙은 **어떤 레벨에서도 override 불가**다. managed에서 deny하면 CLI `--allowedTools`로도 풀 수 없고, 훅의 `allow`로도 풀 수 없다. 이것이 권한 시스템의 핵심 보안 속성이다. 하네스에서 "절대 실행되면 안 되는 것"은 deny로, "보통은 막지만 상황에 따라 허용"은 ask로, "항상 허용"은 allow로 설계해야 한다.

> [insight] `autoMode.allow`와 `soft_deny`를 설정하면 기본 목록을 **완전히 대체**한다. `soft_deny`에 항목 하나만 넣으면 force push, curl|bash, 프로덕션 배포 등 모든 기본 차단이 사라진다. 반드시 `claude auto-mode defaults`로 기본 목록을 복사한 뒤 수정해야 한다. `environment`만 설정하면 기본 규칙이 유지되므로 대부분의 경우 이것만으로 충분하다.

> [insight] Read/Edit deny 규칙은 Claude의 빌트인 도구에만 적용된다. `cat .env`나 `grep secret config.json` 같은 Bash 명령은 차단되지 않는다. OS 레벨 차단이 필요하면 sandbox의 `filesystem.denyRead`를 사용해야 한다. 하네스의 보안 설계에서 permissions(Claude 도구 레벨)와 sandbox(OS 레벨) 두 레이어를 모두 활용해야 하는 이유.
