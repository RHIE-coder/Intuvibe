# Fast Mode — 고속 Opus 응답

---

**리서치 프리뷰**. 동일한 Opus 4.6를 **2.5배 빠르게** 실행하는 API 설정.
모델 품질/기능 동일, 지연 시간만 감소, 토큰 비용 증가.

---

## 1. 핵심 정리

| | 표준 Opus 4.6 | Fast Mode |
|---|---|---|
| **모델** | 동일 | 동일 |
| **속도** | 기본 | ~2.5x 빠름 |
| **비용** | 표준 가격 | $30/$150 MTok (입력/출력) |
| **과금** | 구독 포함 | **extra usage에서만** (구독 사용량 미차감) |

---

## 2. 토글

```
/fast          # ON/OFF 토글
```

- ON 시 현재 모델이 Opus 4.6이 아니면 **자동 전환**
- OFF 시 Opus 4.6에 **잔류** (이전 모델로 안 돌아감)
- `↯` 아이콘으로 활성 상태 표시
- 기본적으로 **세션 간 유지**

---

## 3. 비용 주의사항

- 1M 토큰 전체에 동일한 fast 가격 적용 (flat)
- **세션 중간에 켜면** 전체 대화 컨텍스트에 fast 미캐시 입력 가격 적용 → 처음부터 켠 것보다 비쌈
- 구독 포함 사용량과 **별도 과금** — 첫 토큰부터 extra usage 요금

---

## 4. 언제 쓰나

| Fast Mode | 표준 모드 |
|-----------|---------|
| 빠른 코드 이터레이션 | 긴 자율 작업 |
| 라이브 디버깅 | 배치 처리 / CI/CD |
| 시간 압박 작업 | 비용 민감 워크로드 |

### Fast Mode vs Effort Level

| 설정 | 효과 |
|------|------|
| **Fast Mode** | 같은 품질, 낮은 지연, 높은 비용 |
| **낮은 Effort** | 적은 사고, 빠른 응답, 복잡한 작업에서 품질 저하 가능 |

둘 다 조합 가능: fast + low effort = 단순 작업 최고 속도.

---

## 5. 요구사항

- **Anthropic 직접만** — Bedrock, Vertex, Foundry 미지원
- **Extra usage 활성화** 필수 (Console billing 또는 조직 admin)
- **Team/Enterprise** — admin이 명시 활성화해야 사용 가능

비활성화: `CLAUDE_CODE_DISABLE_FAST_MODE=1`

---

## 6. 조직 관리

### 활성화

- Console: [Claude Code preferences](https://platform.claude.com/claude-code/preferences)
- Claude AI: [Admin Settings > Claude Code](https://claude.ai/admin-settings/claude-code)

### 세션별 옵트인 강제

```json
{ "fastModePerSessionOptIn": true }
```

→ 매 세션 fast mode OFF로 시작. 사용자가 `/fast`로 수동 활성화해야 함.
다중 동시 세션의 비용 제어에 유용.

---

## 7. Rate Limit 동작

Fast mode 전용 rate limit 존재. 한도 도달 시:

1. 자동으로 표준 Opus 4.6으로 폴백
2. `↯` 아이콘 회색으로 변경 (쿨다운)
3. 표준 속도/가격으로 계속 작업
4. 쿨다운 만료 시 자동 재활성화

수동 비활성화: 쿨다운 대기 대신 `/fast`로 끄기.

> [insight] Fast mode는 세션 중간에 켜면 전체 컨텍스트에 fast 미캐시 가격이 적용되어 처음부터 켠 것보다 비싸다. 하네스에서 fast mode를 사용하려면 **세션 시작 시** 활성화하는 것이 비용 최적.

> [insight] Fast mode 토큰은 구독 포함 사용량에서 **차감되지 않는다**. 첫 토큰부터 extra usage로 과금. 구독 사용량을 아끼는 효과는 없고 순수 추가 비용이다. 조직에서 `fastModePerSessionOptIn: true`로 무의식적 사용을 방지하는 것이 비용 관리에 효과적.
