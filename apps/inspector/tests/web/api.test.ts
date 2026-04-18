import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { listSessions, getSession } from '../../src/web/api';
import type { ListSessionsResponse, GetSessionResponse } from '../../src/shared/protocol';

const originalFetch = globalThis.fetch;

function mockFetchOk(body: unknown): void {
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  ) as typeof fetch;
}

function mockFetchStatus(status: number, body: unknown = {}): void {
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    }),
  ) as typeof fetch;
}

describe('web/api', () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  afterEach(() => { globalThis.fetch = originalFetch; });

  describe('listSessions', () => {
    it('/api/sessions 호출 후 sessions 배열 반환', async () => {
      const body: ListSessionsResponse = {
        sessions: [
          { session_id: 's1', started_at: '2026-04-19T10:00:00.000Z', ended_at: null,
            record_count: 3, tool_calls: 1, has_stop: false },
        ],
      };
      mockFetchOk(body);
      const result = await listSessions();
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/sessions');
      expect(result).toEqual(body.sessions);
    });

    it('non-2xx → throw', async () => {
      mockFetchStatus(500, { error: 'boom' });
      await expect(listSessions()).rejects.toThrow(/500/);
    });
  });

  describe('getSession', () => {
    it('/api/sessions/:id 호출 + encodeURIComponent', async () => {
      const body: GetSessionResponse = {
        summary: { session_id: 'a b', started_at: '', ended_at: null,
          record_count: 0, tool_calls: 0, has_stop: false },
        records: [],
      };
      mockFetchOk(body);
      await getSession('a b');
      expect(globalThis.fetch).toHaveBeenCalledWith('/api/sessions/a%20b');
    });

    it('404 → throw', async () => {
      mockFetchStatus(404, { error: 'not found' });
      await expect(getSession('x')).rejects.toThrow(/404/);
    });
  });
});
