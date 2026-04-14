# Claude in Microsoft Foundry

---

Azure 네이티브 엔드포인트 + 인증으로 Claude 모델 접근.  
청구: Azure 구독 통해 Microsoft Marketplace에서 처리.  
**지원 SDK**: C#, Java, PHP, Python, TypeScript (Go, Ruby 미지원)

---

## 1. 인프라 구조

**2-level 계층**: `Resource` (보안/청구 설정) → `Deployment` (API 호출 단위)

엔드포인트 형식:
```
https://{resource}.services.ai.azure.com/anthropic/v1/*
```

---

## 2. SDK 설치

| 언어 | 패키지 |
|------|--------|
| Python | `pip install -U "anthropic"` |
| TypeScript | `npm install @anthropic-ai/foundry-sdk` |
| C# | `dotnet add package Anthropic.Foundry` |
| Java | `com.anthropic:anthropic-java-foundry:2.20.0` |
| PHP | `composer require anthropic-ai/sdk` |

---

## 3. 프로비저닝 절차

1. [Foundry 포털](https://ai.azure.com/) → 리소스 생성
2. **Models + endpoints** → **Deploy base model** → Claude 모델 선택
3. Deployment 이름 설정 (변경 불가, API `model` 파라미터로 사용)
4. **Keys and Endpoint**에서 엔드포인트 URL + 키 확인

---

## 4. 인증 방법 (2가지)

### API Key 인증

환경변수:
- `ANTHROPIC_FOUNDRY_API_KEY`
- `ANTHROPIC_FOUNDRY_RESOURCE` (또는 `ANTHROPIC_FOUNDRY_BASE_URL`)

```python
from anthropic import AnthropicFoundry

client = AnthropicFoundry(
    api_key=os.environ.get("ANTHROPIC_FOUNDRY_API_KEY"),
    resource="example-resource",
)
message = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello!"}],
)
```

```typescript
import AnthropicFoundry from "@anthropic-ai/foundry-sdk";

const client = new AnthropicFoundry({
    apiKey: process.env.ANTHROPIC_FOUNDRY_API_KEY,
    resource: "example-resource",
});
```

### Entra ID (Azure AD) 인증

```python
from anthropic import AnthropicFoundry
from azure.identity import DefaultAzureCredential, get_bearer_token_provider

token_provider = get_bearer_token_provider(
    DefaultAzureCredential(), "https://cognitiveservices.azure.com/.default"
)

client = AnthropicFoundry(
    resource="example-resource",
    azure_ad_token_provider=token_provider,
)
```

```typescript
import AnthropicFoundry from "@anthropic-ai/foundry-sdk";
import { DefaultAzureCredential, getBearerTokenProvider } from "@azure/identity";

const credential = new DefaultAzureCredential();
const tokenProvider = getBearerTokenProvider(
    credential, "https://cognitiveservices.azure.com/.default"
);

const client = new AnthropicFoundry({
    resource: "example-resource",
    azureADTokenProvider: tokenProvider,
});
```

---

## 5. 지원 모델 및 기본 Deployment 이름

| 모델 | 기본 Deployment 이름 |
|------|---------------------|
| Claude Opus 4.6 | `claude-opus-4-6` |
| Claude Opus 4.5 | `claude-opus-4-5` |
| Claude Sonnet 4.6 | `claude-sonnet-4-6` |
| Claude Sonnet 4.5 | `claude-sonnet-4-5` |
| Claude Opus 4.1 | `claude-opus-4-1` |
| Claude Haiku 4.5 | `claude-haiku-4-5` |

---

## 6. 지원/미지원 기능

| 기능 | 지원 여부 |
|------|----------|
| Messages API | ✅ |
| 대부분의 Claude 기능 | ✅ |
| Context window (Opus 4.6, Sonnet 4.6) | ✅ 1M 토큰 |
| Context window (Sonnet 4.5 등) | ✅ 200k 토큰 |
| Admin API (`/v1/organizations/*`) | ❌ |
| Models API (`/v1/models`) | ❌ |
| Message Batch API | ❌ |
| Rate limit 헤더 (`anthropic-ratelimit-*`) | ❌ |

---

## 7. 모니터링 및 로깅

- **Azure Monitor**: API 사용량, 지연, 오류율
- **Azure Log Analytics**: 요청/응답 로그 쿼리
- **Cost Management**: Claude 사용 비용 추적

Anthropic 권장: **최소 30일 롤링 로그 보존**

---

## 8. 디버깅 헤더

응답 헤더에 `request-id` + `apim-request-id` 포함 → 지원팀에 두 값 모두 제공.

---

> [insight] Foundry의 `resource → deployment` 2-level 계층은 하네스 플러그인의 Azure 배포 설정 모델과 직접 매핑된다. 플러그인 설정 스키마에 `foundry_resource`와 `foundry_deployment` 두 필드를 분리하고, deployment 이름을 `model` 파라미터로 그대로 전달하는 구조가 필요하다. 특히 deployment 이름은 생성 후 변경 불가이므로, 하네스 플러그인 등록 시 deployment 이름 선택을 신중히 안내해야 한다.

> [insight] Foundry에서 `anthropic-ratelimit-*` 헤더가 미지원이므로, 하네스의 레이트 리밋 모니터링 로직은 플랫폼별로 분기해야 한다. Anthropic 직접 API에서는 헤더 기반 모니터링, Foundry에서는 Azure Monitor API 기반 모니터링을 사용하는 플랫폼 어댑터 패턴이 필요하다. Entra ID 토큰(1시간 만료)의 자동 갱신도 하네스 레벨에서 처리해야 한다.
