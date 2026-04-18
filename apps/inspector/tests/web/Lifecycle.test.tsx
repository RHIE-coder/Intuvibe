import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Lifecycle } from '../../src/web/components/Lifecycle';
import type { TraceRecord } from '../../src/shared/trace';

function rec(overrides: Partial<TraceRecord> = {}): TraceRecord {
  return {
    v: 1,
    ts: '2026-04-19T10:00:00.000Z',
    session_id: 'sess-1',
    span_id: 'sp-1',
    parent_span_id: null,
    kind: 'snapshot',
    source: 'SessionStart',
    data: {},
    ...overrides,
  };
}

describe('<Lifecycle />', () => {
  it('lifecycle event 없음 → empty state', () => {
    render(<Lifecycle records={[]} />);
    expect(screen.getByText(/no lifecycle/i)).toBeInTheDocument();
  });

  it('snapshot(SessionStart) + stop 이벤트만 필터링', () => {
    render(
      <Lifecycle
        records={[
          rec({ span_id: 's1', kind: 'snapshot' }),
          rec({ span_id: 'sp-tool', kind: 'tool_pre', source: 'PreToolUse' }),
          rec({ span_id: 'sp-stop', kind: 'stop', source: 'Stop' }),
        ]}
      />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText(/SessionStart/)).toBeInTheDocument();
    expect(screen.getByText(/Stop/)).toBeInTheDocument();
  });

  it('turn_start, turn_end 도 포함', () => {
    render(
      <Lifecycle
        records={[
          rec({ span_id: 't1', kind: 'turn_start', source: 'UserPromptSubmit' }),
          rec({ span_id: 't2', kind: 'turn_end', source: 'Stop' }),
        ]}
      />,
    );
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText(/turn_start/)).toBeInTheDocument();
    expect(screen.getByText(/turn_end/)).toBeInTheDocument();
  });
});
