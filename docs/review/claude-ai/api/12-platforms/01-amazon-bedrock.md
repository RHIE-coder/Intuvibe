# Claude in Amazon Bedrock (New — bedrock-mantle)

---

**리서치 프리뷰** — `us-east-1` 전용, 신규 AWS 계정 필요 (기존 Bedrock 계정과 별도).  
기존 Bedrock `InvokeModel` API와 다른 **별도 엔드포인트**: `bedrock-mantle`.

---

## 1. 엔드포인트

```
https://bedrock-mantle.{region}.api.aws/anthropic/v1/messages
```

현재 `region`: `us-east-1` 고정.

---

## 2. 인증 방법 (3가지)

| 방법 | 설명 | 권장 |
|------|------|------|
| **Bedrock Service Role** | 역할 ARN 지정, SDK가 자동 자격증명 갱신 | ✅ 권장 |
| **IAM Assumed Roles** | `assume_role`로 임시 자격증명 취득 | - |
| **Bearer Tokens** | 직접 AWS 자격증명 관리 | ❌ 비선호 |

### Python — Service Role
```python
from anthropic import AnthropicBedrockMantle

client = AnthropicBedrockMantle(
    aws_region="us-east-1",
    aws_bedrock_service_role_arn="arn:aws:iam::123456789012:role/MyRole",
)
```

### TypeScript — Service Role
```typescript
import AnthropicBedrockMantle from "@anthropic-ai/sdk/bedrock-mantle";

const client = new AnthropicBedrockMantle({
  awsRegion: "us-east-1",
  awsBedrockServiceRoleArn: "arn:aws:iam::123456789012:role/MyRole",
});
```

### Python — IAM Assumed Role
```python
client = AnthropicBedrockMantle(
    aws_region="us-east-1",
    aws_assumed_role_arn="arn:aws:iam::123456789012:role/MyRole",
    aws_assumed_role_session_name="my-session",
)
```

---

## 3. 지원 기능

| 기능 | 지원 여부 |
|------|----------|
| Messages API | ✅ |
| 프롬프트 캐싱 | ✅ |
| Extended Thinking | ✅ |
| Tool Use | ✅ |
| Citations | ✅ |
| Structured Outputs | ✅ |
| In-region Inference | ✅ |
| Anthropic 정의 툴 (Web Search, Files API, Computer Use, Skills 등) | ❌ |
| Agent API | ❌ |
| Message Batches | ❌ |
| ZDR (Zero Data Retention) | ❌ |

---

## 4. 데이터 정책

- **보존 기간**: 30일
- **ZDR**: 미지원
- **Select 티어**: AWS 전용 검사 (Anthropic 검사 불가)

---

## 5. 기본 쿼터

| 항목 | 기본값 |
|------|--------|
| 입력 TPM | 2M |

---

## 6. 기본 사용 패턴

```python
message = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Hello"}],
)
```

---

> [insight] bedrock-mantle는 기존 Bedrock `InvokeModel`과 완전히 분리된 엔드포인트다. 하네스가 AWS 환경에 배포될 경우 두 Bedrock 경로를 동시에 지원해야 할 수 있으므로, 클라이언트 팩토리에서 `AnthropicBedrockMantle` vs `AnthropicBedrock`을 명확히 구분해야 한다. 특히 신규 계정 요구사항 때문에 기존 Bedrock 사용자가 자동으로 이전할 수 없으므로, 하네스 플러그인의 AWS 배포 설정에서 Bedrock 타입을 `legacy` / `mantle`로 분기하는 설계가 필요하다.

> [insight] Anthropic 정의 툴(Web Search, Files API, Computer Use, Skills)이 bedrock-mantle에서 미지원인 점은 하네스 플러그인 호환성 매트릭스에 직접 영향을 미친다. AWS 배포 플러그인은 이들 툴에 의존하지 않도록 제약해야 하며, 플러그인 마켓플레이스에서 "Bedrock 호환" 뱃지를 부여할 때 이 제약 목록을 체크리스트로 포함해야 한다.
