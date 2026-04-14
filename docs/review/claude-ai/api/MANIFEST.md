# API Docs Review Manifest

---

## 리뷰 규칙 (context 복구용)

- 웹 문서를 fetch → 하네스 구축 레퍼런스로 압축 정리
- `> [insight]` 태그로 하네스 설계 관련 관찰 기록
- 내용 누락 없이 압축 (암시적 포함 가능)
- 공식 문서에 없는 내용 지어내지 않음
- "Learn More" 섹션 무시
- 정리 기준: 빠른 이해, 핵심 파악, 원본 구조와 무관하게 재구성 가능

---

## 진행 방법

사용자가 "다음" → MANIFEST에서 다음 `[ ]` 항목의 URL을 fetch → 리뷰 파일 작성 → `[x]`로 갱신

---

## 파일 매핑 (사이트 네비게이션 순서)

### First steps

- [x] `01-intro.md` — https://platform.claude.com/docs/en/intro
- [x] `02-quickstart.md` — https://platform.claude.com/docs/en/get-started

### 03-build-with-claude/

- [x] `01-overview.md` — https://platform.claude.com/docs/en/build-with-claude/overview
- [x] `02-messages-api.md` — https://platform.claude.com/docs/en/build-with-claude/working-with-messages
- [x] `03-stop-reasons.md` — https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons
- [x] `04-prompting-best-practices.md` — https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices

### 04-model-capabilities/

- [x] `01-extended-thinking.md` — https://platform.claude.com/docs/en/build-with-claude/extended-thinking
- [x] `02-adaptive-thinking.md` — https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking
- [x] `03-effort.md` — https://platform.claude.com/docs/en/build-with-claude/effort
- [x] `04-fast-mode.md` — https://platform.claude.com/docs/en/build-with-claude/fast-mode
- [x] `05-structured-outputs.md` — https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- [x] `06-citations.md` — https://platform.claude.com/docs/en/build-with-claude/citations
- [x] `07-streaming.md` — https://platform.claude.com/docs/en/build-with-claude/streaming
- [x] `08-batch-processing.md` — https://platform.claude.com/docs/en/build-with-claude/batch-processing
- [x] `09-pdf-support.md` — https://platform.claude.com/docs/en/build-with-claude/pdf-support
- [x] `10-search-results.md` — https://platform.claude.com/docs/en/build-with-claude/search-results
- [x] `11-multilingual.md` — https://platform.claude.com/docs/en/build-with-claude/multilingual-support
- [x] `12-embeddings.md` — https://platform.claude.com/docs/en/build-with-claude/embeddings
- [ ] `13-vision.md` — https://platform.claude.com/docs/en/build-with-claude/vision

### 05-tools/

- [x] `01-overview.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- [x] `02-how-tool-use-works.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/how-tool-use-works
- [x] `03-tutorial-agent.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/build-a-tool-using-agent
- [x] `04-define-tools.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/define-tools
- [x] `05-handle-tool-calls.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
- [x] `06-parallel-tool-use.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/parallel-tool-use
- [x] `07-tool-runner.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-runner
- [x] `08-strict-tool-use.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/strict-tool-use
- [x] `09-tool-use-caching.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-use-with-prompt-caching
- [x] `10-server-tools.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/server-tools
- [x] `11-troubleshooting.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/troubleshooting-tool-use
- [x] `12-tool-reference.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-reference
- [x] `13-web-search.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool
- [x] `14-web-fetch.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-fetch-tool
- [x] `15-code-execution.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/code-execution-tool
- [x] `16-memory-tool.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool
- [x] `17-bash-tool.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/bash-tool
- [x] `18-computer-use.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool
- [x] `19-text-editor.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/text-editor-tool

### 06-tool-infrastructure/

- [x] `01-manage-tool-context.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/manage-tool-context
- [x] `02-tool-combinations.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-combinations
- [x] `03-tool-search.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool
- [x] `04-programmatic-tool-calling.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/programmatic-tool-calling
- [x] `05-fine-grained-streaming.md` — https://platform.claude.com/docs/en/agents-and-tools/tool-use/fine-grained-tool-streaming

### 07-context-management/

- [x] `01-context-windows.md` — https://platform.claude.com/docs/en/build-with-claude/context-windows
- [x] `02-compaction.md` — https://platform.claude.com/docs/en/build-with-claude/compaction
- [x] `03-context-editing.md` — https://platform.claude.com/docs/en/build-with-claude/context-editing
- [x] `04-prompt-caching.md` — https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- [x] `05-token-counting.md` — https://platform.claude.com/docs/en/build-with-claude/token-counting

### 08-files-assets/

- [x] `01-files-api.md` — https://platform.claude.com/docs/en/build-with-claude/files

### 09-agent-skills/

- [x] `01-overview.md` — https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
- [x] `02-quickstart.md` — https://platform.claude.com/docs/en/agents-and-tools/agent-skills/quickstart
- [x] `03-best-practices.md` — https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- [x] `04-enterprise.md` — https://platform.claude.com/docs/en/agents-and-tools/agent-skills/enterprise
- [x] `05-claude-api-skill.md` — https://platform.claude.com/docs/en/agents-and-tools/agent-skills/claude-api-skill
- [x] `06-skills-guide.md` — https://platform.claude.com/docs/en/build-with-claude/skills-guide

### 10-agent-sdk/

- [x] `01-overview.md` — https://platform.claude.com/docs/en/agent-sdk/overview
- [x] `02-quickstart.md` — https://platform.claude.com/docs/en/agent-sdk/quickstart
- [x] `03-agent-loop.md` — https://platform.claude.com/docs/en/agent-sdk/agent-loop
- [x] `04-claude-code-features.md` — https://platform.claude.com/docs/en/agent-sdk/claude-code-features
- [x] `05-sessions.md` — https://platform.claude.com/docs/en/agent-sdk/sessions
- [x] `06-streaming-input.md` — https://platform.claude.com/docs/en/agent-sdk/streaming-vs-single-mode
- [x] `07-streaming-output.md` — https://platform.claude.com/docs/en/agent-sdk/streaming-output
- [x] `08-mcp.md` — https://platform.claude.com/docs/en/agent-sdk/mcp
- [x] `09-custom-tools.md` — https://platform.claude.com/docs/en/agent-sdk/custom-tools
- [x] `10-tool-search.md` — https://platform.claude.com/docs/en/agent-sdk/tool-search
- [x] `11-permissions.md` — https://platform.claude.com/docs/en/agent-sdk/permissions
- [x] `12-user-input.md` — https://platform.claude.com/docs/en/agent-sdk/user-input
- [x] `13-hooks.md` — https://platform.claude.com/docs/en/agent-sdk/hooks
- [x] `14-file-checkpointing.md` — https://platform.claude.com/docs/en/agent-sdk/file-checkpointing
- [x] `15-structured-outputs.md` — https://platform.claude.com/docs/en/agent-sdk/structured-outputs
- [x] `16-hosting.md` — https://platform.claude.com/docs/en/agent-sdk/hosting
- [x] `17-secure-deployment.md` — https://platform.claude.com/docs/en/agent-sdk/secure-deployment
- [x] `18-system-prompts.md` — https://platform.claude.com/docs/en/agent-sdk/modifying-system-prompts
- [x] `19-subagents.md` — https://platform.claude.com/docs/en/agent-sdk/subagents
- [x] `20-slash-commands.md` — https://platform.claude.com/docs/en/agent-sdk/slash-commands
- [x] `21-skills.md` — https://platform.claude.com/docs/en/agent-sdk/skills
- [x] `22-cost-tracking.md` — https://platform.claude.com/docs/en/agent-sdk/cost-tracking
- [x] `23-todo-tracking.md` — https://platform.claude.com/docs/en/agent-sdk/todo-tracking
- [x] `24-plugins.md` — https://platform.claude.com/docs/en/agent-sdk/plugins
- [x] `25-typescript.md` — https://platform.claude.com/docs/en/agent-sdk/typescript
- [x] `26-typescript-v2.md` — https://platform.claude.com/docs/en/agent-sdk/typescript-v2-preview
- [x] `27-python.md` — https://platform.claude.com/docs/en/agent-sdk/python
- [x] `28-migration-guide.md` — https://platform.claude.com/docs/en/agent-sdk/migration-guide

### 11-mcp/

- [x] `01-mcp-connector.md` — https://platform.claude.com/docs/en/agents-and-tools/mcp-connector
- [x] `02-remote-mcp-servers.md` — https://platform.claude.com/docs/en/agents-and-tools/remote-mcp-servers

### 12-platforms/

- [x] `01-amazon-bedrock.md` — https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock
- [x] `02-bedrock-legacy.md` — https://platform.claude.com/docs/en/build-with-claude/claude-on-amazon-bedrock
- [x] `03-microsoft-foundry.md` — https://platform.claude.com/docs/en/build-with-claude/claude-in-microsoft-foundry
- [x] `04-vertex-ai.md` — https://platform.claude.com/docs/en/build-with-claude/claude-on-vertex-ai

### 13-prompt-engineering/

- [x] `01-overview.md` — https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview
- [x] `02-prompting-tools.md` — https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-tools

### 14-test-evaluate/

- [x] `01-develop-tests.md` — https://platform.claude.com/docs/en/test-and-evaluate/develop-tests
- [x] `02-eval-tool.md` — https://platform.claude.com/docs/en/test-and-evaluate/eval-tool
- [x] `03-reduce-latency.md` — https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-latency

### 15-strengthen-guardrails/

- [x] `01-reduce-hallucinations.md` — https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
- [x] `02-increase-consistency.md` — https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/increase-consistency
- [x] `03-mitigate-jailbreaks.md` — https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks
- [x] `04-streaming-refusals.md` — https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/handle-streaming-refusals
- [x] `05-reduce-prompt-leak.md` — https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-prompt-leak

### 16-admin/

- [x] `01-admin-api.md` — https://platform.claude.com/docs/en/build-with-claude/administration-api
- [x] `02-data-residency.md` — https://platform.claude.com/docs/en/build-with-claude/data-residency
- [x] `03-workspaces.md` — https://platform.claude.com/docs/en/build-with-claude/workspaces
- [x] `04-usage-cost-api.md` — https://platform.claude.com/docs/en/build-with-claude/usage-cost-api
- [x] `05-analytics-api.md` — https://platform.claude.com/docs/en/build-with-claude/claude-code-analytics-api
- [x] `06-data-retention.md` — https://platform.claude.com/docs/en/build-with-claude/api-and-data-retention

---

## 통계

- **총 페이지**: 105 (models-pricing 6개 제거)
- **완료**: 105
- **현재 위치**: 완료 🎉
