import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSessions } from '../../src/web/useSessions';
import type { SessionSummary } from '../../src/shared/session';
import type { TraceRecord } from '../../src/shared/trace';

const originalFetch = globalThis.fetch;

function record(overrides: Partial<TraceRecord>): TraceRecord {
  return {
    v: 1, ts: '2026-04-19T10:00:00.000Z',
    session_id: 's1', span_id: 'sp-x', parent_span_id: null,
    kind: 'tool_pre', source: 'PreToolUse', data: {},
    ...overrides,
  };
}

function summary(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    session_id: 's1', started_at: '2026-04-19T10:00:00.000Z',
    ended_at: null, record_count: 0, tool_calls: 0, has_stop: false,
    ...overrides,
  };
}

interface FetchCall { url: string; }

function installFetchRoutes(routes: Record<string, unknown>): FetchCall[] {
  const calls: FetchCall[] = [];
  globalThis.fetch = vi.fn(async (input) => {
    const url = typeof input === 'string' ? input : (input as URL).toString();
    calls.push({ url });
    const body = routes[url];
    if (body === undefined) {
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 });
    }
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  return calls;
}

describe('useSessions', () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { globalThis.fetch = originalFetch; });

  it('마운트 시 /api/sessions 로드', async () => {
    const s = [summary({ session_id: 's1' }), summary({ session_id: 's2' })];
    installFetchRoutes({ '/api/sessions': { sessions: s } });

    const { result } = renderHook(() => useSessions());
    await waitFor(() => expect(result.current.sessions).toHaveLength(2));
    expect(result.current.selectedId).toBeNull();
    expect(result.current.selected).toBeNull();
  });

  it('selectSession(id) → /api/sessions/:id 로드', async () => {
    const s = [summary({ session_id: 's1' })];
    const detail = {
      summary: summary({ session_id: 's1', record_count: 1 }),
      records: [record({ session_id: 's1', span_id: 'sp-1' })],
    };
    installFetchRoutes({
      '/api/sessions': { sessions: s },
      '/api/sessions/s1': detail,
    });

    const { result } = renderHook(() => useSessions());
    await waitFor(() => expect(result.current.sessions).toHaveLength(1));

    act(() => { result.current.selectSession('s1'); });
    await waitFor(() => expect(result.current.selected).not.toBeNull());

    expect(result.current.selectedId).toBe('s1');
    expect(result.current.selected?.records[0].span_id).toBe('sp-1');
  });

  it('listSessions 실패 → error 세팅, sessions 빈 배열', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response('{"error":"boom"}', { status: 500 }),
    ) as typeof fetch;

    const { result } = renderHook(() => useSessions());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.sessions).toEqual([]);
  });
});
