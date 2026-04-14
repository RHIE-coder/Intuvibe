# Server Tools

---

Anthropic 인프라에서 실행되는 서버 툴의 공통 메커니즘: `server_tool_use` block, `pause_turn` 처리, ZDR, 도메인 필터링.

서버 툴 목록: `web_search`, `web_fetch`, `code_execution`, `tool_search`

---

## 1. server_tool_use block

```json
{
  "type": "server_tool_use",
  "id": "srvtoolu_01A2B3C4D5E6F7G8H9",   // srvtoolu_ 접두사
  "name": "web_search",
  "input": {"query": "latest quantum computing breakthroughs"}
}
```

- 개발자가 `tool_result`를 반환할 필요 없음 → API 내부에서 실행·결과 통합
- 결과 block이 동일한 어시스턴트 턴 내에 즉시 이어서 등장

---

## 2. pause_turn 처리

서버 툴의 장시간 실행 시 `stop_reason: "pause_turn"` 반환:

```python
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "..."}],
    tools=[{"type": "web_search_20250305", "name": "web_search", "max_uses": 10}],
)

if response.stop_reason == "pause_turn":
    # 동일 대화를 그대로 이어서 재전송
    continuation = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=1024,
        messages=[
            {"role": "user", "content": "..."},
            {"role": "assistant", "content": response.content},  # paused 응답 포함
        ],
        tools=[...],  # 동일 툴 유지
    )
```

- **수정 없이 재전송**: Claude가 중단된 지점부터 계속
- **수정 후 재전송**: 대화 방향 변경 가능
- 동일 툴 세트 포함 필수

---

## 3. ZDR 호환성

| 툴 버전 | ZDR 호환 |
|---------|---------|
| `web_search_20250305` | ✅ |
| `web_fetch_20250910` | ✅ |
| `web_search_20260209` (동적 필터링) | ❌ 기본적으로 불가 |
| `web_search_20260209` + `allowed_callers: ["direct"]` | ✅ |

```json
// ZDR + 최신 web_search 버전 사용 시
{"type": "web_search_20260209", "name": "web_search", "allowed_callers": ["direct"]}
```

> web_fetch: 툴 자체는 ZDR 대상이나, 방문 사이트 운영자가 URL 파라미터를 보존할 수 있음.

---

## 4. 도메인 필터링

`allowed_domains` 또는 `blocked_domains` (동시 사용 불가):

```json
{
  "type": "web_search_20250305",
  "name": "web_search",
  "allowed_domains": ["docs.example.com", "example.com/blog"]
}
```

**규칙:**
- HTTP/HTTPS 스킴 제외: `example.com` (O), `https://example.com` (X)
- 서브도메인 자동 포함: `example.com` → `docs.example.com` 포함
- 특정 서브도메인 지정: `docs.example.com` → 해당 서브도메인만
- 서브패스 지원: `example.com/blog` → `example.com/blog/post-1` 매칭
- 와일드카드: 도메인 파트 이후에만, 1개만 허용 (`example.com/*` O, `*.example.com` X)

> **보안 주의**: 유니코드 도메인 이름의 호모그래프 공격 취약성. `аmazon.com`(키릴 문자)과 `amazon.com`이 시각적으로 동일하나 다른 도메인. 가능하면 ASCII 도메인만 사용.

---

## 5. 동적 필터링 (`_20260209` 버전)

내부적으로 code_execution을 사용. 독립적인 `code_execution` 툴과 `_20260209` 웹 툴을 함께 사용하면 **두 실행 환경이 충돌** → 모델 혼란 가능. 두 가지를 함께 쓰거나, 둘 다 동일 버전으로 고정.

---

## 6. 기타

- **스트리밍**: `server_tool_use` block이 일반 SSE 흐름으로 스트리밍
- **배치 처리**: 모든 서버 툴이 Batch API 지원

---

> [insight] `pause_turn`은 서버 툴 통합에서 반드시 처리해야 하는 stop_reason이다. 하네스의 서버 툴 실행 레이어는 `end_turn`만 체크하는 것이 아니라 `pause_turn` → 재전송 루프를 구현해야 한다. 특히 web_search의 `max_uses`가 높은 경우 긴 조사 태스크에서 여러 번 pause될 수 있다.

> [insight] ZDR 요구사항이 있는 하네스에서 최신 web_search 버전(`_20260209`)을 사용하려면 `allowed_callers: ["direct"]`를 명시해야 한다. 하네스의 서버 툴 설정 레이어에서 ZDR 모드를 환경 변수로 토글하고, ZDR 활성화 시 자동으로 이 설정을 적용하는 헬퍼가 필요하다.

> [insight] 도메인 필터링은 하네스의 엔터프라이즈 배포에서 핵심 보안 기능이다. 고객사별 허용 도메인 목록을 에이전트 설정에서 관리하고 web_search/web_fetch에 동적으로 적용하면, 에이전트가 허가된 소스만 참조하도록 강제할 수 있다. 단, 조직 레벨 도메인 설정보다 더 좁게만 설정 가능하다는 계층 구조를 주의해야 한다.

> [insight] `_20260209` 버전과 독립적인 `code_execution` 툴의 충돌 문제는 하네스에서 서버 툴 버전 관리가 중요함을 시사한다. 툴 조합의 호환성을 런타임이 아닌 에이전트 설정 검증 단계에서 체크하는 로직이 필요하다.
