// shared/summarize.ts — TraceRecord[] → SessionSummary (순수).

import type { SessionSummary } from './session.js';
import type { TraceRecord } from './trace.js';

export function summarize(sessionId: string, records: TraceRecord[]): SessionSummary {
  if (records.length === 0) {
    return emptySummary(sessionId);
  }

  const first = records[0];
  const last = records[records.length - 1];
  const hasStop = records.some((r) => r.kind === 'stop');
  const toolCalls = records.filter((r) => r.kind === 'tool_pre').length;

  return {
    session_id: sessionId,
    started_at: first.ts,
    ended_at: hasStop ? last.ts : null,
    record_count: records.length,
    tool_calls: toolCalls,
    has_stop: hasStop,
  };
}

function emptySummary(sessionId: string): SessionSummary {
  return {
    session_id: sessionId,
    started_at: '',
    ended_at: null,
    record_count: 0,
    tool_calls: 0,
    has_stop: false,
  };
}
