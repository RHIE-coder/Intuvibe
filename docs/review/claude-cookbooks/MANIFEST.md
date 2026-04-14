# Claude Cookbooks Review Manifest

---

## 소스

https://github.com/anthropics/claude-cookbooks

Anthropic 공식 쿡북 — Jupyter 노트북 78개, 11개 카테고리.
하네스 설계 관점에서 연구 분석.

---

## 리뷰 규칙

- 하네스 엔지니어링 관점에서 패턴, 아키텍처, 기법 추출
- `> [insight]` 태그로 하네스 설계 관련 관찰 기록
- 쿡북은 실행 가능한 예제 — 공식 문서와 달리 구현 패턴에 초점
- SDK 기반 쿡북은 참고용 (현재 하네스는 CLI 기반 설계)

---

## 하네스 관련도 분류

### A. 핵심 (Core) — 하네스 설계 직접 참조

| # | 파일 | 카테고리 | 주제 |
|---|------|----------|------|
| A-01 | `patterns/agents/basic_workflows.ipynb` | Agent Patterns | Chain, Parallel, Router 패턴 |
| A-02 | `patterns/agents/evaluator_optimizer.ipynb` | Agent Patterns | 생성-평가 루프 |
| A-03 | `patterns/agents/orchestrator_workers.ipynb` | Agent Patterns | 오케스트레이터-워커 |
| A-04 | `claude_agent_sdk/00_The_one_liner_research_agent.ipynb` | Agent SDK | query() 기본, stateless/stateful |
| A-05 | `claude_agent_sdk/01_The_chief_of_staff_agent.ipynb` | Agent SDK | CLAUDE.md, hooks, subagents, commands, output styles, plan mode |
| A-06 | `claude_agent_sdk/02_The_observability_agent.ipynb` | Agent SDK | MCP 연결, CI 워크플로우 |
| A-07 | `claude_agent_sdk/03_The_site_reliability_agent.ipynb` | Agent SDK | MCP read-write, 인시던트 대응 |
| A-08 | `claude_agent_sdk/04_migrating_from_openai_agents_sdk.ipynb` | Agent SDK | OpenAI→Claude 매핑 |
| A-09 | `claude_agent_sdk/05_Building_a_session_browser.ipynb` | Agent SDK | 세션 탐색, 태깅, 포크 |
| A-10 | `tool_use/context_engineering/context_engineering_tools.ipynb` | Context | Compaction, Tool Clearing, Memory 3종 비교 |
| A-11 | `tool_use/memory_cookbook.ipynb` | Context | 크로스세션 메모리, 컨텍스트 편집 |
| A-12 | `tool_use/automatic-context-compaction.ipynb` | Context | SDK/채팅 루프 컴팩션 |
| A-13 | `misc/session_memory_compaction.ipynb` | Context | 즉시 컴팩션 (백그라운드 스레드) |
| A-14 | `misc/building_evals.ipynb` | Evals | 3종 그레이딩 (코드/인간/모델) |
| A-15 | `tool_evaluation/tool_evaluation.ipynb` | Evals | 병렬 에이전트 도구 평가 |
| A-16 | `skills/notebooks/03_skills_custom_development.ipynb` | Skills | 커스텀 스킬 수명주기 |

### B. 참고 (Reference) — 기법/패턴 차용 가능

| # | 파일 | 카테고리 | 주제 |
|---|------|----------|------|
| B-01 | `managed_agents/CMA_iterate_fix_failing_tests.ipynb` | Managed Agents | Agent/Environment/Session 3자원, 스트리밍 |
| B-02 | `managed_agents/CMA_gate_human_in_the_loop.ipynb` | Managed Agents | 커스텀 도구, HITL, requires_action |
| B-03 | `managed_agents/CMA_orchestrate_issue_to_pr.ipynb` | Managed Agents | 멀티턴, GitHub 리소스 마운트 |
| B-04 | `managed_agents/CMA_operate_in_production.ipynb` | Managed Agents | Vault, MCP, 웹훅 |
| B-05 | `managed_agents/CMA_prompt_versioning_and_rollback.ipynb` | Managed Agents | 프롬프트 버전 관리, 롤백 |
| B-06 | `managed_agents/CMA_explore_unfamiliar_codebase.ipynb` | Managed Agents | 실행 중 리소스 추가/제거 |
| B-07 | `managed_agents/data_analyst_agent.ipynb` | Managed Agents | 데이터 분석 에이전트 |
| B-08 | `managed_agents/slack_data_bot.ipynb` | Managed Agents | Slack 통합 |
| B-09 | `managed_agents/sre_incident_responder.ipynb` | Managed Agents | SRE 인시던트 + Skill |
| B-10 | `skills/notebooks/01_skills_introduction.ipynb` | Skills | 빌트인 스킬 소개 |
| B-11 | `skills/notebooks/02_skills_financial_applications.ipynb` | Skills | 금융 스킬 응용 |
| B-12 | `misc/building_moderation_filter.ipynb` | Safety | 콘텐츠 모더레이션 필터 |
| B-13 | `misc/metaprompt.ipynb` | Prompt Eng | 메타프롬프트 생성기 |
| B-14 | `misc/prompt_caching.ipynb` | Performance | 프롬프트 캐싱 |
| B-15 | `misc/speculative_prompt_caching.ipynb` | Performance | 투기적 캐시 워밍 |
| B-16 | `coding/prompting_for_frontend_aesthetics.ipynb` | Prompt Eng | 프론트엔드 미학 프롬프팅 |
| B-17 | `misc/generate_test_cases.ipynb` | Evals | 합성 테스트 데이터 생성 |
| B-18 | `observability/usage_cost_api.ipynb` | Observability | 사용량/비용 API |

### C. 배경 (Background) — 도메인 지식

| # | 파일 | 카테고리 |
|---|------|----------|
| C-01 | `capabilities/classification/guide.ipynb` | Classification |
| C-02 | `capabilities/retrieval_augmented_generation/guide.ipynb` | RAG |
| C-03 | `capabilities/contextual-embeddings/guide.ipynb` | Contextual RAG |
| C-04 | `capabilities/summarization/guide.ipynb` | Summarization |
| C-05 | `capabilities/text_to_sql/guide.ipynb` | Text-to-SQL |
| C-06 | `capabilities/knowledge_graph/guide.ipynb` | Knowledge Graph |
| C-07 | `extended_thinking/extended_thinking.ipynb` | Extended Thinking |
| C-08 | `extended_thinking/extended_thinking_with_tool_use.ipynb` | Thinking + Tools |
| C-09~C-20 | `tool_use/*.ipynb` (나머지) | Tool Use 기본 |
| C-21~C-26 | `multimodal/*.ipynb` | Multimodal |
| C-27~C-38 | `third_party/**/*.ipynb` | Third-party 통합 |
| C-39 | `finetuning/finetuning_on_bedrock.ipynb` | Fine-tuning |
| C-40~C-44 | `misc/*.ipynb` (나머지) | 기타 |

---

## 리뷰 파일 매핑

- [x] `analysis.md` — 전체 연구 분석 (A그룹 + B그룹 핵심 패턴)

---

## 통계

- 전체 노트북: 78개
- 핵심 (A): 16개
- 참고 (B): 18개
- 배경 (C): 44개
