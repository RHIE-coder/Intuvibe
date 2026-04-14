# Claude on Amazon Bedrock (Legacy — InvokeModel)

---

기존 Bedrock `InvokeModel` API + ARN 버전 모델 ID + AWS event-stream 인코딩 방식.  
신규 bedrock-mantle 엔드포인트와 **별개**. 두 통합 방식이 공존.

---

## 1. SDK 설치

| 언어 | 패키지 |
|------|--------|
| Python | `pip install -U "anthropic[bedrock]"` |
| TypeScript | `npm install @anthropic-ai/bedrock-sdk` |
| C# | `dotnet add package Anthropic.Bedrock` |
| Go | `go get github.com/anthropics/anthropic-sdk-go/bedrock` |
| Java | `com.anthropic:anthropic-java-bedrock:2.20.0` |
| PHP | `anthropic-ai/sdk` + `aws/aws-sdk-php` |
| Ruby | `anthropic` + `aws-sdk-bedrockruntime` |
| Boto3 | `pip install boto3>=1.28.59` |

---

## 2. 모델 ID 구조

### 글로벌 엔드포인트 (권장, Claude Sonnet 4.5+ 대상)
```
global.anthropic.claude-opus-4-6-v1
```
- 최대 가용성, 동적 라우팅
- 추가 요금 없음

### 리전 엔드포인트 (CRIS)
```
anthropic.claude-opus-4-6-v1       # 리전 prefix 없음
us.anthropic.claude-opus-4-6-v1    # US prefix
eu.anthropic.claude-opus-4-6-v1    # EU prefix
```
- 특정 리전 고정 라우팅 (데이터 레지던시/컴플라이언스)
- **10% 가격 프리미엄**

> **주의**: Claude Sonnet 4.5 이상 모델에만 글로벌/리전 엔드포인트 이분법 적용. 이전 모델(Sonnet 4, Opus 4 등)은 기존 요금 구조 유지.

---

## 3. 주요 모델 ID 목록 (일부)

| 모델 | Base Bedrock Model ID | Global | US | EU |
|------|----------------------|--------|----|----|
| Claude Opus 4.6 | `anthropic.claude-opus-4-6-v1` | ✅ | ✅ | ✅ |
| Claude Sonnet 4.6 | `anthropic.claude-sonnet-4-6` | ✅ | ✅ | ✅ |
| Claude Sonnet 4.5 | `anthropic.claude-sonnet-4-5-20250929-v1:0` | ✅ | ✅ | ✅ |
| Claude Haiku 4.5 | `anthropic.claude-haiku-4-5-20251001-v1:0` | ✅ | ✅ | ✅ |

---

## 4. 기본 사용 패턴

### Python (`AnthropicBedrock`)
```python
from anthropic import AnthropicBedrock

client = AnthropicBedrock(
    aws_access_key="<access key>",
    aws_secret_key="<secret key>",
    aws_session_token="<session_token>",  # 임시 자격증명
    aws_region="us-west-2",
)

message = client.messages.create(
    model="global.anthropic.claude-opus-4-6-v1",
    max_tokens=256,
    messages=[{"role": "user", "content": "Hello, world"}],
)
```

### TypeScript (`AnthropicBedrock`)
```typescript
import AnthropicBedrock from "@anthropic-ai/bedrock-sdk";

const client = new AnthropicBedrock({
    awsAccessKey: "<access key>",
    awsSecretKey: "<secret key>",
    awsSessionToken: "<session_token>",
    awsRegion: "us-west-2",
});

const message = await client.messages.create({
    model: "global.anthropic.claude-opus-4-6-v1",
    max_tokens: 256,
    messages: [{ role: "user", content: "Hello, world" }],
});
```

### Boto3 (Python, 로우레벨)
```python
import boto3, json

bedrock = boto3.client(service_name="bedrock-runtime")
body = json.dumps({
    "max_tokens": 256,
    "messages": [{"role": "user", "content": "Hello, world"}],
    "anthropic_version": "bedrock-2023-05-31",
})
response = bedrock.invoke_model(body=body, modelId="global.anthropic.claude-opus-4-6-v1")
print(json.loads(response["body"].read())["content"])
```

---

## 5. Bearer Token 인증

AWS SigV4 서명 대신 Bearer 토큰 사용 가능 (C#, Go, Java SDK만 지원).  
Python, TypeScript, Ruby, PHP는 SigV4 전용.

```bash
# 환경변수 방식 (자동 감지)
AWS_BEARER_TOKEN_BEDROCK=<token>
```

---

## 6. 컨텍스트 윈도우

| 모델 | 컨텍스트 윈도우 |
|------|---------------|
| Claude Opus 4.6, Sonnet 4.6 | **1M 토큰** |
| Sonnet 4.5, Sonnet 4 등 | 200k 토큰 |

**Bedrock 페이로드 한계**: 요청 크기 최대 **20MB** (토큰 한계 전에 도달 가능).

---

## 7. PDF 지원

- Converse API + InvokeModel API 모두 지원
- **Converse API에서 시각적 PDF 분석(차트/레이아웃)은 Citations 활성화 필요**
- Citations 없이는 텍스트 추출만 가능
- 완전한 제어가 필요하면 InvokeModel API 사용

---

## 8. 활동 로깅

Bedrock invocation logging 서비스 → 프롬프트/완성 로깅.  
Anthropic 권장: **최소 30일 롤링 로그 보존** (오용 조사용).  
AWS/Anthropic은 이 서비스를 통해 콘텐츠에 접근 불가.

---

> [insight] `global.` vs 리전 prefix(CRIS)의 모델 ID 분기는 하네스의 플러그인 Bedrock 배포 설정에서 중요한 의미를 가진다. 플러그인이 글로벌 엔드포인트를 기본으로 사용하되, 데이터 레지던시 컴플라이언스가 필요한 엔터프라이즈 고객은 리전 prefix로 전환할 수 있어야 한다. 하네스 플러그인 설정 스키마에 `bedrock_endpoint: "global" | "us" | "eu" | "jp" | "apac"` 필드를 추가하고, 이를 모델 ID prefix로 자동 매핑하는 유틸리티가 필요하다.

> [insight] Bedrock 20MB 페이로드 한도는 1M 컨텍스트 윈도우를 활용하는 플러그인에서 실제 병목이 될 수 있다. 대용량 문서를 처리하는 플러그인은 페이로드 크기를 사전에 추정하고, 20MB 초과 시 자동으로 청크 분할하거나 사용자에게 경고하는 로직이 필요하다.
