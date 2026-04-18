import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionList } from '../../src/web/components/SessionList';
import type { SessionSummary } from '../../src/shared/session';

function s(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    session_id: 'sess-1',
    started_at: '2026-04-19T10:00:00.000Z',
    ended_at: null,
    record_count: 5,
    tool_calls: 2,
    has_stop: false,
    ...overrides,
  };
}

describe('<SessionList />', () => {
  it('빈 배열 → "no sessions" 메시지', () => {
    render(<SessionList sessions={[]} selectedId={null} onSelect={() => {}} />);
    expect(screen.getByText(/no sessions/i)).toBeInTheDocument();
  });

  it('각 세션을 button 으로 렌더하고 session_id 표시', () => {
    render(
      <SessionList
        sessions={[s({ session_id: 'a' }), s({ session_id: 'b' })]}
        selectedId={null}
        onSelect={() => {}}
      />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
  });

  it('summary 정보 — record_count, tool_calls, has_stop', () => {
    render(
      <SessionList
        sessions={[s({ session_id: 'a', record_count: 7, tool_calls: 3, has_stop: true })]}
        selectedId={null}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText(/7 rec/i)).toBeInTheDocument();
    expect(screen.getByText(/3 tools/i)).toBeInTheDocument();
    expect(screen.getByText(/done/i)).toBeInTheDocument();
  });

  it('running 표시 (has_stop=false)', () => {
    render(
      <SessionList
        sessions={[s({ has_stop: false })]}
        selectedId={null}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText(/running/i)).toBeInTheDocument();
  });

  it('selectedId 일치 → aria-current="true"', () => {
    render(
      <SessionList
        sessions={[s({ session_id: 'a' }), s({ session_id: 'b' })]}
        selectedId="b"
        onSelect={() => {}}
      />,
    );
    const bBtn = screen.getByRole('button', { name: /b/ });
    expect(bBtn).toHaveAttribute('aria-current', 'true');
    const aBtn = screen.getByRole('button', { name: /^a/ });
    expect(aBtn).toHaveAttribute('aria-current', 'false');
  });

  it('row 클릭 → onSelect(id)', async () => {
    const onSelect = vi.fn();
    render(
      <SessionList
        sessions={[s({ session_id: 'x' })]}
        selectedId={null}
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /x/ }));
    expect(onSelect).toHaveBeenCalledWith('x');
  });
});
