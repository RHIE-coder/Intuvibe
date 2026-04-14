# Bash Tool

---

셸 명령을 영속적인 bash 세션에서 실행하는 클라이언트 툴. 시스템 작업, 스크립트 실행, 자동화 지원.

- 타입: `bash_20250124` (클라이언트 툴, 스키마리스)
- ZDR: ✅ 지원
- 추가 비용: **245 입력 토큰** (명령 출력은 별도)

---

## 1. 파라미터

| 파라미터 | 필수 | 설명 |
|---------|------|------|
| `command` | ✅ | 실행할 bash 명령 |
| `restart` | ❌ | `true`로 설정 시 bash 세션 재시작 |

스키마리스 툴: 입력 스키마를 별도로 제공하지 않아도 됨. Claude 모델에 내장.

---

## 2. 세션 특성

- **영속성**: 환경 변수, 작업 디렉토리가 명령 간 유지됨
- **클라이언트 사이드**: API는 무상태. 애플리케이션이 세션 관리 책임
- **인터랙티브 불가**: `vim`, `less`, 비밀번호 프롬프트 처리 불가
- **GUI 없음**: CLI 전용

---

## 3. 구현 핵심

### 세션 관리
```python
# subprocess.Popen으로 bash 프로세스 유지
process = subprocess.Popen(["/bin/bash"], stdin=PIPE, stdout=PIPE, stderr=PIPE)
```

### 타임아웃 처리
```python
result = subprocess.run(command, shell=True, capture_output=True, timeout=30)
# 타임아웃 시 is_error: true로 반환
```

### 출력 절단
```python
# 대용량 출력 절단 (토큰 초과 방지)
lines[:100] + "\n\n... Output truncated ..."
```

---

## 4. 보안

**핵심 원칙**: 블락리스트보다 얼로우리스트. 셸 연산자(&&, ||, |, ;, &, >, <) 차단으로 체이닝 방지.

```python
ALLOWED_COMMANDS = {"ls", "cat", "echo", "pwd", "grep", "find", "wc", "head", "tail"}

# 추가 강화: shell=False + shlex.split()으로 실행
subprocess.run(shlex.split(command), shell=False)
```

**필수 조치**:
- Docker/VM 격리 환경에서 실행
- `ulimit`으로 CPU·메모리·디스크 제한
- 최소 권한 사용자로 실행
- 모든 명령 감사 로그 기록
- 출력에서 민감 정보(AWS 키 등) 제거

---

## 5. Git 기반 체크포인팅 패턴

장기 에이전트 워크플로우에서 Git을 구조적 복구 메커니즘으로 활용:

1. **베이스라인 커밋**: 작업 시작 전 현재 상태 커밋
2. **기능별 커밋**: 완료된 기능마다 롤백 포인트 생성
3. **세션 시작 시 상태 복원**: `git log` + 진행 파일로 완료/잔여 파악
4. **실패 시 복구**: `git checkout`으로 마지막 정상 커밋으로 롤백

---

## 6. 에러 처리

| 에러 상황 | `is_error` | content |
|----------|-----------|---------|
| 타임아웃 | `true` | `"Error: Command timed out after 30 seconds"` |
| 명령 없음 | (stderr 그대로) | `"bash: cmd: command not found"` |
| 권한 없음 | (stderr 그대로) | `"bash: /path: Permission denied"` |

---

## 7. code_execution 툴과의 차이

| | bash_tool | code_execution |
|--|-----------|---------------|
| 실행 환경 | 클라이언트 로컬 | Anthropic 샌드박스 |
| 인터넷 | 로컬 네트워크 | 완전 차단 |
| 상태 공유 | ❌ 공유 안 됨 | ❌ 공유 안 됨 |
| 비용 | 245 토큰 | 시간당 과금 |

동시 사용 시 시스템 프롬프트에 환경 구분 명시 필수.

---

> [insight] Bash 툴의 스키마리스 특성은 하네스 등록 시 입력 스키마 없이 `{"type": "bash_20250124", "name": "bash"}`만 넣으면 된다는 의미다. 하네스의 툴 레지스트리에서 스키마리스 툴을 별도 카테고리로 관리하면 동적 스키마 검증 로직을 건너뛸 수 있다.

> [insight] Git 기반 체크포인팅 패턴은 하네스의 장기 코딩 에이전트 설계에서 핵심이다. 에이전트가 기능 완료 시마다 `git commit`을 실행하면, 세션 중단이나 컨텍스트 압축 후에도 `git log` 파싱으로 완료 상태를 정확히 복원할 수 있다.

> [insight] 얼로우리스트 + `shell=False + shlex.split()` 조합은 하네스의 bash 툴 보안 구현 표준으로 삼아야 한다. 블락리스트(rm -rf 등 금지)는 우회 가능하지만, 얼로우리스트는 명시적으로 허용된 명령만 실행되도록 강제한다.

> [insight] API 무상태 + 클라이언트 세션 관리 특성은 하네스 아키텍처에서 중요한 설계 결정 포인트다. 멀티턴 대화에서 bash 세션을 어디서 관리할지 (인메모리 vs 재연결) 선택이 필요하며, 세션 재시작 시 `restart: true` 명령으로 Claude가 상태 리셋을 인지하게 해야 한다.
