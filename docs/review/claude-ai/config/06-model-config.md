# Model Configuration — 모델 설정

---

모델 선택, 별칭, effort 레벨, 1M 컨텍스트, 서드파티 프로바이더 핀닝을 다룬다.

---

## 1. 모델 별칭

| 별칭 | 동작 |
|------|------|
| `default` | 모델 오버라이드 해제 → 계정 타입별 기본 모델 |
| `best` | 가장 강력한 모델 (현재 = opus) |
| `sonnet` | 최신 Sonnet (현재 4.6) |
| `opus` | 최신 Opus (현재 4.6) |
| `haiku` | 빠르고 경제적 |
| `sonnet[1m]` | Sonnet + 1M 토큰 컨텍스트 |
| `opus[1m]` | Opus + 1M 토큰 컨텍스트 |
| `opusplan` | plan mode → Opus, 실행 → Sonnet 자동 전환 |

별칭은 항상 최신 버전. 특정 버전 고정은 전체 모델명 사용 (`claude-opus-4-6`).

### default 동작

| 플랜 | 기본 모델 |
|------|---------|
| Max, Team Premium | Opus 4.6 |
| Pro, Team Standard | Sonnet 4.6 |
| Enterprise | Opus 사용 가능하지만 기본 아님 |

Opus 사용량 임계치 도달 시 Sonnet으로 자동 폴백.

---

## 2. 모델 설정 우선순위

```
1. 세션 중: /model <alias|name>
2. 시작 시: claude --model <alias|name>
3. 환경변수: ANTHROPIC_MODEL=<alias|name>
4. settings.json: "model": "opus"
```

---

## 3. Effort Level (적응형 추론)

작업 복잡도에 따라 사고(thinking) 토큰을 동적 할당.

| 레벨 | 설명 | 지속 |
|------|------|------|
| `low` | 단순 작업용. 빠르고 저렴 | 세션 간 유지 |
| `medium` | Pro/Max 기본값 | 세션 간 유지 |
| `high` | API/Team/Enterprise/서드파티 기본값 | 세션 간 유지 |
| `max` | Opus 4.6 전용. 토큰 무제한 심층 추론 | 세션 간 **미유지** (환경변수 제외) |

설정 방법:
- `/effort low|medium|high|max|auto`
- `/model`에서 좌우 화살표로 슬라이더
- `--effort` CLI 플래그
- `CLAUDE_CODE_EFFORT_LEVEL` 환경변수 (최우선)
- `settings.json`의 `effortLevel`
- Skill/Subagent frontmatter의 `effort`

"ultrathink" 프롬프트 키워드 → 해당 턴만 high effort (이미 high/max면 무효).

`CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1` → 적응형 비활성화, 고정 `MAX_THINKING_TOKENS` 사용.

---

## 4. Extended Context (1M 토큰)

Opus 4.6, Sonnet 4.6 지원.

| 플랜 | Opus 1M | Sonnet 1M |
|------|---------|-----------|
| Max, Team, Enterprise | 구독 포함 | extra usage 필요 |
| Pro | extra usage 필요 | extra usage 필요 |
| API, pay-as-you-go | 전체 접근 | 전체 접근 |

- 200K 초과 토큰에 프리미엄 없음 (표준 가격)
- `CLAUDE_CODE_DISABLE_1M_CONTEXT=1` → 1M 옵션 숨김
- `/model opus[1m]` 또는 `claude-opus-4-6[1m]`

---

## 5. 모델 선택 제한 (`availableModels`)

```json
{ "availableModels": ["sonnet", "haiku"] }
```

- `/model`, `--model`, `ANTHROPIC_MODEL`에서 목록 외 모델 선택 불가
- **Default 옵션은 항상 사용 가능** (빈 배열이어도)
- 스코프 간 배열 merge + 중복 제거
- Managed settings에서 strict allowlist 강제

### 완전한 모델 제어

```json
{
  "model": "claude-sonnet-4-5",
  "availableModels": ["claude-sonnet-4-5", "haiku"],
  "env": {
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "claude-sonnet-4-5"
  }
}
```

`env` 없으면 Default 선택 시 최신 Sonnet으로 해석 → 버전 핀 우회.

---

## 6. 서드파티 프로바이더 핀닝

Bedrock/Vertex/Foundry 배포 시 **반드시 모델 버전 고정**:

```bash
export ANTHROPIC_DEFAULT_OPUS_MODEL='us.anthropic.claude-opus-4-6-v1'    # Bedrock
export ANTHROPIC_DEFAULT_SONNET_MODEL='claude-sonnet-4-6'                 # Vertex
export ANTHROPIC_DEFAULT_HAIKU_MODEL='claude-haiku-4-5-20251001'
```

고정하지 않으면 Claude Code 업데이트 시 새 모델 버전이 계정에 없어서 **무경고 중단**.

### 1M 컨텍스트 핀닝

```bash
export ANTHROPIC_DEFAULT_OPUS_MODEL='claude-opus-4-6[1m]'
```

`[1m]` suffix → 프로바이더 전송 전 제거.

### 표시명/기능 선언

```bash
export ANTHROPIC_DEFAULT_OPUS_MODEL='arn:aws:bedrock:...'
export ANTHROPIC_DEFAULT_OPUS_MODEL_NAME='Opus via Bedrock'
export ANTHROPIC_DEFAULT_OPUS_MODEL_DESCRIPTION='Opus 4.6 routed through Bedrock'
export ANTHROPIC_DEFAULT_OPUS_MODEL_SUPPORTED_CAPABILITIES='effort,max_effort,thinking,adaptive_thinking,interleaved_thinking'
```

기능 값: `effort`, `max_effort`, `thinking`, `adaptive_thinking`, `interleaved_thinking`

### `modelOverrides` — 버전별 ID 매핑

```json
{
  "modelOverrides": {
    "claude-opus-4-6": "arn:aws:bedrock:us-east-2:.../opus-prod",
    "claude-sonnet-4-6": "arn:aws:bedrock:us-east-2:.../sonnet-prod"
  }
}
```

- Anthropic 모델 ID → 프로바이더 ID 매핑
- `availableModels`는 Anthropic ID 기준으로 필터 (override 값 아님)
- `ANTHROPIC_MODEL`, `--model` 직접 전달 값은 override 대상 아님

---

## 7. 커스텀 모델 옵션

```bash
export ANTHROPIC_CUSTOM_MODEL_OPTION="my-gateway/claude-opus-4-6"
export ANTHROPIC_CUSTOM_MODEL_OPTION_NAME="Opus via Gateway"
export ANTHROPIC_CUSTOM_MODEL_OPTION_DESCRIPTION="Internal LLM gateway"
```

→ `/model` picker 하단에 추가. 검증 없이 모든 문자열 허용.

---

## 8. 프롬프트 캐싱

기본 활성화. 비활성화:

| 환경변수 | 대상 |
|---------|------|
| `DISABLE_PROMPT_CACHING=1` | 전체 (최우선) |
| `DISABLE_PROMPT_CACHING_HAIKU=1` | Haiku만 |
| `DISABLE_PROMPT_CACHING_SONNET=1` | Sonnet만 |
| `DISABLE_PROMPT_CACHING_OPUS=1` | Opus만 |

---

## 9. 환경변수 요약

| 변수 | 역할 |
|------|------|
| `ANTHROPIC_MODEL` | 모델 직접 지정 |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | opus 별칭 + opusplan(plan) 매핑 |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | sonnet 별칭 + opusplan(실행) 매핑 |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | haiku 별칭 + 백그라운드 기능 |
| `CLAUDE_CODE_SUBAGENT_MODEL` | 서브에이전트 모델 |
| `CLAUDE_CODE_EFFORT_LEVEL` | effort 레벨 (최우선) |
| `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING=1` | 적응형 추론 비활성화 |
| `CLAUDE_CODE_DISABLE_1M_CONTEXT=1` | 1M 옵션 숨김 |

> [insight] `opusplan`은 plan mode에서 Opus(강한 추론), 실행에서 Sonnet(효율)을 자동 전환한다. 하네스에서 "탐색 → 계획 → 구현" 워크플로우를 설계할 때 비용 최적화와 품질의 균형점.

> [insight] 서드파티 프로바이더(Bedrock/Vertex/Foundry)에서 모델 버전을 고정하지 않으면, Claude Code 업데이트 시 새 모델 버전이 계정에 없어서 **무경고로 중단**된다. 3개 환경변수 모두 설정이 초기 셋업의 필수 항목.

> [insight] `availableModels`로 모델을 제한해도 Default 옵션은 항상 사용 가능하다. Default가 최신 모델로 해석되므로, 완전한 버전 제어에는 `ANTHROPIC_DEFAULT_*_MODEL` 환경변수로 Default의 해석까지 고정해야 한다.
