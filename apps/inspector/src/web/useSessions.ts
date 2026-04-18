// useSessions — 세션 목록 + 선택 세션의 상세(summary+records) 상태.
// SSE 실시간 tail 은 M4 에서 추가.

import { useCallback, useEffect, useState } from 'react';
import type { SessionSummary } from '../shared/session.js';
import type { GetSessionResponse } from '../shared/protocol.js';
import { listSessions, getSession } from './api.js';

export interface UseSessionsResult {
  sessions: SessionSummary[];
  selectedId: string | null;
  selected: GetSessionResponse | null;
  error: Error | null;
  selectSession(id: string): void;
}

export function useSessions(): UseSessionsResult {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<GetSessionResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    listSessions()
      .then((s) => { if (!cancelled) setSessions(s); })
      .catch((e: Error) => { if (!cancelled) setError(e); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedId) { setSelected(null); return; }
    let cancelled = false;
    getSession(selectedId)
      .then((d) => { if (!cancelled) setSelected(d); })
      .catch((e: Error) => { if (!cancelled) setError(e); });
    return () => { cancelled = true; };
  }, [selectedId]);

  const selectSession = useCallback((id: string) => setSelectedId(id), []);
  return { sessions, selectedId, selected, error, selectSession };
}
