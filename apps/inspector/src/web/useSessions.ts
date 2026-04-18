// useSessions — 세션 목록 + 선택 세션의 상세(summary+records) + 실시간 tail.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SessionSummary } from '../shared/session.js';
import type { GetSessionResponse } from '../shared/protocol.js';
import { listSessions, getSession } from './api.js';
import { openStream as defaultOpenStream, type OpenStream } from './stream.js';

export interface UseSessionsResult {
  sessions: SessionSummary[];
  selectedId: string | null;
  selected: GetSessionResponse | null;
  error: Error | null;
  selectSession(id: string): void;
}

export function useSessions(openStreamFn: OpenStream = defaultOpenStream): UseSessionsResult {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<GetSessionResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // selectedId 를 ref 로 들고 있어 stream effect 가 재구독하지 않게 한다.
  const selectedIdRef = useRef<string | null>(selectedId);
  useEffect(() => { selectedIdRef.current = selectedId; }, [selectedId]);

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

  useEffect(() => {
    const handle = openStreamFn((ev) => {
      if (ev.type === 'heartbeat') return;
      if (ev.type === 'session_added') {
        setSessions((prev) =>
          prev.some((s) => s.session_id === ev.summary.session_id)
            ? prev
            : [ev.summary, ...prev],
        );
        return;
      }
      if (ev.type === 'record') {
        if (ev.session_id !== selectedIdRef.current) return;
        setSelected((prev) =>
          prev ? { ...prev, records: [...prev.records, ev.record] } : prev,
        );
      }
    });
    return () => handle.close();
  }, [openStreamFn]);

  const selectSession = useCallback((id: string) => setSelectedId(id), []);
  return { sessions, selectedId, selected, error, selectSession };
}
