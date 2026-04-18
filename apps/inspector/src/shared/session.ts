// shared/session.ts — Session summary 타입.

export interface SessionSummary {
  session_id: string;
  started_at: string;
  ended_at: string | null;
  record_count: number;
  tool_calls: number;
  has_stop: boolean;
}
