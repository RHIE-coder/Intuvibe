# Data Residency

---

데이터 처리 및 저장 위치를 지리적으로 제어하는 2가지 독립적 설정.

---

## 1. 두 가지 설정

| 설정 | 범위 | 제어 대상 |
|------|------|---------|
| **Inference geo** | 요청별 또는 워크스페이스 기본값 | 모델 추론 실행 위치 |
| **Workspace geo** | 워크스페이스 생성 시 고정 | 데이터 저장 위치 + 엔드포인트 처리 |

---

## 2. Inference Geo (`inference_geo` 파라미터)

### 값

| 값 | 설명 |
|----|------|
| `"global"` | 기본값. 최적 성능을 위해 어느 리전에서나 실행 가능 |
| `"us"` | 미국 인프라에서만 실행 |

### 사용 예시

```python
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    inference_geo="us",
    messages=[{"role": "user", "content": "..."}],
)
# 실제 실행 위치 확인
print(f"Inference geo: {response.usage.inference_geo}")
```

### 응답 usage 필드
```json
{ "usage": { "input_tokens": 25, "output_tokens": 150, "inference_geo": "us" } }
```

### 지원 범위
- **지원**: Claude Opus 4.6 이상 (구모델 → 400 에러)
- **미지원**: AWS Bedrock, Google Vertex AI (리전은 엔드포인트 URL로 결정), OpenAI 호환 엔드포인트
- **Batch API**: 지원 (요청별 개별 설정 가능)

---

## 3. 워크스페이스 레벨 제한

| 설정 | 설명 |
|------|------|
| `allowed_inference_geos` | 허용 지역 목록 (외 요청 → 에러) |
| `default_inference_geo` | `inference_geo` 미지정 시 기본값 |

Admin API의 `data_residency` 필드 또는 Console에서 설정.

---

## 4. Workspace Geo

- 워크스페이스 생성 시 선택, **이후 변경 불가**
- 현재 `"us"`만 지원

---

## 5. 가격

| 설정 | 가격 |
|------|------|
| `inference_geo: "global"` (또는 미지정) | 표준 가격 |
| `inference_geo: "us"` (Opus 4.6+) | **표준 × 1.1** |
| 구모델 | 기존 가격 유지 |

Priority Tier 사용 시: `"us"` 인퍼런스는 토큰당 1.1배로 TPM 소진.

---

## 6. 현재 제한사항

- 레이트 리밋은 모든 리전 공유
- `inference_geo`: `"us"`, `"global"` 2개만 지원 (추가 리전 예정)
- Workspace geo: `"us"`만 가능

---

> [insight] 하네스가 엔터프라이즈 고객에게 데이터 레지던시 보장을 제공하려면 워크스페이스별 `allowed_inference_geos: ["us"]`와 `default_inference_geo: "us"` 설정을 자동으로 적용하는 온보딩 플로우가 필요하다. 특히 금융/의료/공공 부문 플러그인은 US-only 추론을 기본으로 강제하고, 이에 따른 1.1x 가격 프리미엄을 플러그인 비용 견적에 반영해야 한다.

> [insight] `inference_geo`가 응답의 `usage.inference_geo` 필드로 확인 가능하다는 점은 하네스의 컴플라이언스 감사(audit)에 활용할 수 있다. 플러그인 실행 로그에 `inference_geo` 필드를 기록하고, US-only 정책을 가진 워크스페이스에서 `"global"` 값이 반환되는 경우를 감지하는 알림 시스템을 구축할 수 있다.
