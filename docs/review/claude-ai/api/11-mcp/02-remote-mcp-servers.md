# Remote MCP Servers

---

Anthropic MCP Connector API와 연동 가능한 서드파티 원격 MCP 서버 목록 페이지.

**주의**: Anthropic이 소유/운영/보증하지 않는 서드파티 서비스 → 연결 전 보안 정책 및 이용약관 검토 필수.

---

## 연결 절차

1. 해당 서버 문서 검토
2. 인증 자격증명 확보
3. 서버별 연결 지침 따르기

상세 연결 방법: [MCP Connector 문서](01-mcp-connector.md) 참고.

---

## 서버 목록

공식 문서에 서드파티 MCP 서버 테이블 포함 (동적 렌더링으로 본 리뷰에서 추출 불가).  
추가 서버: https://github.com/modelcontextprotocol/servers (수백 개)

---

> [insight] 원격 MCP 서버 생태계는 하네스의 플러그인 마켓플레이스에서 "외부 서비스 연동 플러그인"의 공급 채널이다. Notion, Jira, Salesforce 등 주요 SaaS가 이미 MCP 서버를 운영하고 있으므로, 하네스 플러그인 개발자는 MCP 래퍼 플러그인만 만들어도 풍부한 외부 서비스 연동을 제공할 수 있다. 단, Anthropic이 보증하지 않는 서드파티 서버이므로 하네스의 플러그인 등록 심사 프로세스에서 원격 MCP 서버의 신뢰성/보안 정책 검토를 필수 항목으로 포함해야 한다.
