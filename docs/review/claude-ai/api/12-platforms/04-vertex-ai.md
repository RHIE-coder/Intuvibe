# Claude on Vertex AI (Google Cloud)

---

Messages API와 거의 동일하되 2가지 차이점:
1. `model`은 요청 바디가 아닌 **GCP 엔드포인트 URL**에 포함
2. `anthropic_version`은 요청 바디에 `"vertex-2023-10-16"`으로 전달

**지원 SDK**: Python, TypeScript, C#, Go, Java, PHP, Ruby (모든 주요 언어 지원)

---

## 1. SDK 설치

| 언어 | 패키지 |
|------|--------|
| Python | `pip install -U google-cloud-aiplatform "anthropic[vertex]"` |
| TypeScript | `npm install @anthropic-ai/vertex-sdk` |
| C# | `dotnet add package Anthropic.Vertex` |
| Go | `go get github.com/anthropics/anthropic-sdk-go` |
| Java | `com.anthropic:anthropic-java-vertex:2.20.0` |
| PHP | `composer require anthropic-ai/sdk google/auth` |
| Ruby | `anthropic` + `googleauth` gem |

---

## 2. 모델 ID 목록

| 모델 | Vertex AI model ID |
|------|-------------------|
| Claude Opus 4.6 | `claude-opus-4-6` |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` |
| Claude Sonnet 4.5 | `claude-sonnet-4-5@20250929` |
| Claude Sonnet 4 | `claude-sonnet-4@20250514` |
| Claude Opus 4.5 | `claude-opus-4-5@20251101` |
| Claude Opus 4 | `claude-opus-4@20250514` |
| Claude Haiku 4.5 | `claude-haiku-4-5@20251001` |

---

## 3. 엔드포인트 타입 (3가지)

| 타입 | `region` 값 예시 | 설명 | 가격 프리미엄 |
|------|----------------|------|-------------|
| **글로벌** | `"global"` | 최대 가용성, 동적 라우팅 | 없음 (기본) |
| **멀티리전** | `"us"` | 특정 지역 내 동적 라우팅 | +10% |
| **리전** | `"us-east1"` | 단일 리전 고정, 프로비저닝 처리량 지원 | +10% |

> **주의**: 글로벌/멀티리전은 pay-as-you-go만. 프로비저닝 처리량은 리전 엔드포인트 필수.  
> 가격 프리미엄은 Sonnet 4.5 이상 모델에만 적용.

---

## 4. 기본 사용 패턴

### Python
```python
from anthropic import AnthropicVertex

client = AnthropicVertex(project_id="MY_PROJECT_ID", region="global")

message = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=100,
    messages=[{"role": "user", "content": "Hey Claude!"}],
)
```

### TypeScript
```typescript
import { AnthropicVertex } from "@anthropic-ai/vertex-sdk";

const client = new AnthropicVertex({ projectId: "MY_PROJECT_ID", region: "global" });

const result = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 100,
    messages: [{ role: "user", content: "Hey Claude!" }],
});
```

### cURL (raw)
```bash
MODEL_ID=claude-opus-4-6
LOCATION=global
PROJECT_ID=MY_PROJECT_ID

curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  https://$LOCATION-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/anthropic/models/${MODEL_ID}:streamRawPredict \
  -d '{
    "anthropic_version": "vertex-2023-10-16",
    "messages": [{"role": "user", "content": "Hey Claude!"}],
    "max_tokens": 100
  }'
```

---

## 5. 리전별 엔드포인트 전환

```python
# 글로벌
client = AnthropicVertex(project_id="...", region="global")

# 멀티리전 (미국 내 동적 분산)
client = AnthropicVertex(project_id="...", region="us")

# 단일 리전 고정
client = AnthropicVertex(project_id="...", region="us-east1")
```

---

## 6. 컨텍스트 윈도우 및 페이로드 한도

| 모델 | 컨텍스트 윈도우 |
|------|---------------|
| Opus 4.6, Sonnet 4.6 | 1M 토큰 |
| Sonnet 4.5, Sonnet 4 등 | 200k 토큰 |

**페이로드 한도**: **30MB** (Bedrock의 20MB보다 여유 있음)

---

## 7. 활동 로깅

Vertex의 request-response logging 서비스 활용.  
Anthropic 권장: **최소 30일 롤링 로그 보존**.  
로깅 활성화해도 Google/Anthropic이 콘텐츠에 접근 불가.

---

> [insight] Vertex AI의 3-tier 엔드포인트 구조(글로벌/멀티리전/리전)는 하네스 플러그인의 GCP 배포 설정에서 중요한 분기 포인트다. 하네스는 `vertex_region` 설정값을 `"global"`, `"us"`, `"eu"`, `"us-east1"` 등으로 받아 AnthropicVertex 클라이언트의 `region` 파라미터로 직접 전달하면 된다. 프로비저닝 처리량이 필요한 엔터프라이즈 플러그인은 반드시 리전 엔드포인트를 사용해야 한다는 점을 플러그인 설정 UI에서 명시해야 한다.

> [insight] Vertex는 Bedrock(20MB)보다 넉넉한 30MB 페이로드 한도를 제공한다. 1M 컨텍스트 윈도우를 활용하는 대용량 문서 처리 플러그인의 경우 GCP 배포가 AWS 배포보다 유리할 수 있다. 하네스의 플랫폼 선택 가이드에서 이 차이를 사용 사례별 고려 요소로 포함해야 한다.
