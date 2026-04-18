// web/api.ts — 브라우저 → /api/* fetch 래퍼. 상대 경로라 Vite dev·prod 모두 동일 origin.

import type {
  SessionSummary,
} from '../shared/session.js';
import type {
  ListSessionsResponse,
  GetSessionResponse,
} from '../shared/protocol.js';

export async function listSessions(): Promise<SessionSummary[]> {
  const res = await fetch('/api/sessions');
  if (!res.ok) throw new Error(`listSessions: ${res.status}`);
  const body = (await res.json()) as ListSessionsResponse;
  return body.sessions;
}

export async function getSession(sessionId: string): Promise<GetSessionResponse> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`);
  if (!res.ok) throw new Error(`getSession(${sessionId}): ${res.status}`);
  return (await res.json()) as GetSessionResponse;
}
