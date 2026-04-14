# Scheduled Tasks — 세션 내 스케줄링

---

세션이 열려 있는 동안 프롬프트를 자동 반복 실행하는 장치.
배포 폴링, PR 감시, 빌드 체크, 리마인더 등에 사용. **세션 종료 시 소멸**.

---

## 1. 스케줄링 옵션 비교

| | Cloud | Desktop | `/loop` |
|---|---|---|---|
| **실행 위치** | Anthropic 클라우드 | 내 머신 | 내 머신 |
| **머신 켜야 함** | X | O | O |
| **세션 필요** | X | X | O |
| **재시작 후 유지** | O | O | **X (세션 스코프)** |
| **로컬 파일 접근** | X (fresh clone) | O | O |
| **MCP** | 작업별 커넥터 | 설정 파일 + 커넥터 | 세션에서 상속 |
| **최소 간격** | 1시간 | 1분 | 1분 |

---

## 2. `/loop` — 빠른 반복 스케줄

```
/loop 5m check if the deployment finished and tell me what happened
/loop check the build                    # 기본 10분
/loop check the build every 2 hours      # trailing 형식
/loop 20m /review-pr 1234                # 다른 스킬/커맨드 반복 실행
```

간격 단위: `s`(초, 분 단위로 올림), `m`(분), `h`(시간), `d`(일).

---

## 3. 일회성 리마인더

```
remind me at 3pm to push the release branch
in 45 minutes, check whether the integration tests passed
```

자연어로 요청. Claude가 cron 표현식으로 변환, 실행 후 자동 삭제.

---

## 4. 관리

```
what scheduled tasks do I have?     # 목록
cancel the deploy check job         # 취소
```

| 도구 | 용도 |
|------|------|
| `CronCreate` | 새 작업 생성. 5필드 cron, 프롬프트, 반복/일회 |
| `CronList` | 전체 작업 목록 (ID, 스케줄, 프롬프트) |
| `CronDelete` | ID로 작업 취소 |

세션당 최대 50개.

---

## 5. 실행 방식

- 매초 체크, 저우선순위로 대기열에 추가
- Claude가 **응답 중이 아닐 때** 실행 (턴 사이에 발화)
- Claude가 바쁘면 현재 턴 완료 후 발화
- 시간대: **로컬 타임존** (UTC 아님)

### Jitter

- 반복 작업: 주기의 10% 이내 지연 (최대 15분). 예: 시간당 → :00~:06
- 일회 작업: 정시/반시 기준 최대 90초 조기 발화
- 오프셋은 task ID 기반 결정론적 → 같은 작업은 항상 같은 오프셋

### 7일 만료

반복 작업은 생성 7일 후 자동 만료. 마지막 한 번 실행 후 삭제.
→ 잊혀진 루프의 무한 실행 방지. 더 긴 주기는 Cloud/Desktop 스케줄 사용.

---

## 6. Cron 표현식

`분 시 일 월 요일` (5필드)

| 표현식 | 의미 |
|--------|------|
| `*/5 * * * *` | 5분마다 |
| `0 * * * *` | 매 시 정각 |
| `0 9 * * *` | 매일 오전 9시 |
| `0 9 * * 1-5` | 평일 오전 9시 |

와일드카드, 단일값, 스텝, 범위, 쉼표 리스트 지원. `L`, `W`, `?`, 이름 별칭(`MON`) 미지원.

---

## 7. 비활성화

`CLAUDE_CODE_DISABLE_CRON=1` → 스케줄러 전체 비활성화. `/loop`과 cron 도구 사용 불가.

---

## 8. 제한사항

- 세션 열려 있고 Claude가 idle일 때만 발화
- 놓친 발화 시 보충 없음 (busy 중 지나간 건 idle 시 1회만 발화)
- 재시작 시 모든 작업 소멸
- 이벤트 반응형이 필요하면 [Channels](/en/channels) 사용

> [insight] `/loop`은 세션 스코프라 종료 시 사라진다. 7일 만료도 있다. "항상 돌아야 하는" 작업에는 부적합하고, "지금 이 세션에서 잠깐 감시"하는 용도다. 하네스에서 영구 스케줄링이 필요하면 Cloud/Desktop scheduled tasks나 GitHub Actions를 사용해야 한다.

> [insight] `/loop`은 다른 스킬/커맨드를 반복 실행할 수 있다 (`/loop 20m /review-pr 1234`). 이는 기존 워크플로우를 재사용하면서 주기적 감시를 추가하는 패턴. 하네스에서 스킬을 만들어 놓으면 `/loop`으로 별도 설정 없이 반복 실행 가능.
