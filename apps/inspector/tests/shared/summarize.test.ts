import { describe, it, expect } from 'vitest';
import { summarize } from '../../src/shared/summarize';
import type { TraceRecord } from '../../src/shared/trace';

function record(overrides: Partial<TraceRecord>): TraceRecord {
  return {
    v: 1,
    ts: '2026-04-19T10:00:00.000Z',
    session_id: 's1',
    span_id: 'sp-x',
    parent_span_id: null,
    kind: 'tool_pre',
    source: 'PreToolUse',
    data: {},
    ...overrides,
  };
}

describe('summarize', () => {
  it('빈 배열 → 모든 필드 기본값', () => {
    const s = summarize('s0', []);
    expect(s).toEqual({
      session_id: 's0',
      started_at: '',
      ended_at: null,
      record_count: 0,
      tool_calls: 0,
      has_stop: false,
    });
  });

  it('첫 레코드 ts = started_at', () => {
    const s = summarize('s1', [record({ ts: '2026-04-19T10:00:00.000Z' })]);
    expect(s.started_at).toBe('2026-04-19T10:00:00.000Z');
  });

  it('stop 이 있으면 마지막 ts = ended_at', () => {
    const s = summarize('s1', [
      record({ ts: '2026-04-19T10:00:00.000Z', kind: 'tool_pre' }),
      record({ ts: '2026-04-19T10:00:05.000Z', kind: 'stop', source: 'Stop' }),
    ]);
    expect(s.ended_at).toBe('2026-04-19T10:00:05.000Z');
    expect(s.has_stop).toBe(true);
  });

  it('stop 이 없으면 ended_at = null', () => {
    const s = summarize('s1', [record({ kind: 'tool_pre' })]);
    expect(s.ended_at).toBeNull();
    expect(s.has_stop).toBe(false);
  });

  it('tool_calls = tool_pre 수 (post 는 세지 않음)', () => {
    const s = summarize('s1', [
      record({ kind: 'tool_pre' }),
      record({ kind: 'tool_post' }),
      record({ kind: 'tool_pre' }),
    ]);
    expect(s.tool_calls).toBe(2);
    expect(s.record_count).toBe(3);
  });

  it('session_id 전파', () => {
    expect(summarize('abc-123', []).session_id).toBe('abc-123');
  });
});
