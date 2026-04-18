// shared/trace.ts — Trace 타입.

export type TraceKind =
  | 'tool_pre'
  | 'tool_post'
  | 'snapshot'
  | 'prompt'
  | 'prompt_transformed'
  | 'stop'
  | 'hook'
  | 'turn_start'
  | 'turn_end';

export type TraceSource =
  | 'SessionStart'
  | 'UserPromptSubmit'
  | 'PreToolUse'
  | 'PostToolUse'
  | 'Stop';

export interface TraceRecord {
  v: number;
  ts: string;
  session_id: string;
  turn?: number;
  span_id: string;
  parent_span_id: string | null;
  kind: TraceKind;
  source: TraceSource;
  tool?: string | null;
  producer?: string;
  data: Record<string, unknown>;
}
