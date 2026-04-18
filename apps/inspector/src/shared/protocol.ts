// shared/protocol.ts — server ↔ web API 계약.

import type { SessionSummary } from './session.js';
import type { TraceRecord } from './trace.js';

// -------- REST --------

export interface ListSessionsResponse {
  sessions: SessionSummary[];
}

export interface GetSessionResponse {
  summary: SessionSummary;
  records: TraceRecord[];
}

export interface ErrorResponse {
  error: string;
}

// -------- SSE (/api/stream) --------

export type StreamEvent =
  | { type: 'record'; session_id: string; record: TraceRecord }
  | { type: 'session_added'; summary: SessionSummary }
  | { type: 'heartbeat'; ts: string };

export const SSE_HEARTBEAT_MS = 15_000;
