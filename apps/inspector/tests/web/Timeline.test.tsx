import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Timeline } from '../../src/web/components/Timeline';
import type { TraceRecord } from '../../src/shared/trace';

function rec(overrides: Partial<TraceRecord> = {}): TraceRecord {
  return {
    v: 1,
    ts: '2026-04-19T10:00:00.000Z',
    session_id: 'sess-1',
    span_id: 'span-1',
    parent_span_id: null,
    kind: 'tool_pre',
    source: 'PreToolUse',
    tool: 'Read',
    data: {},
    ...overrides,
  };
}

describe('<Timeline />', () => {
  it('빈 records → "no records" 메시지', () => {
    render(<Timeline records={[]} selectedSpanId={null} onSelectSpan={() => {}} />);
    expect(screen.getByText(/no records/i)).toBeInTheDocument();
  });

  it('각 record 를 row 로 렌더하고 kind / tool 표시', () => {
    render(
      <Timeline
        records={[
          rec({ span_id: 's1', kind: 'tool_pre', tool: 'Read' }),
          rec({ span_id: 's2', kind: 'prompt', tool: null }),
        ]}
        selectedSpanId={null}
        onSelectSpan={() => {}}
      />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByText(/tool_pre/i)).toBeInTheDocument();
    expect(screen.getByText(/Read/)).toBeInTheDocument();
    expect(screen.getByText(/prompt/i)).toBeInTheDocument();
  });

  it('selectedSpanId 일치 → aria-current="true"', () => {
    render(
      <Timeline
        records={[rec({ span_id: 's1' }), rec({ span_id: 's2' })]}
        selectedSpanId="s2"
        onSelectSpan={() => {}}
      />,
    );
    const rows = screen.getAllByRole('button');
    expect(rows[0]).toHaveAttribute('aria-current', 'false');
    expect(rows[1]).toHaveAttribute('aria-current', 'true');
  });

  it('row 클릭 → onSelectSpan(span_id)', async () => {
    const onSelectSpan = vi.fn();
    render(
      <Timeline
        records={[rec({ span_id: 'abc' })]}
        selectedSpanId={null}
        onSelectSpan={onSelectSpan}
      />,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onSelectSpan).toHaveBeenCalledWith('abc');
  });
});
