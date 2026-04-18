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
  it('모든 hook 노드를 렌더 (관측+미관측 모두)', () => {
    render(<Lifecycle records={[]} />);
    // 관측 가능한 6개 노드
    expect(screen.getByText(/SessionStart/)).toBeInTheDocument();
    expect(screen.getByText(/UserPromptSubmit/)).toBeInTheDocument();
    expect(screen.getByText(/PreToolUse/)).toBeInTheDocument();
    expect(screen.getByText(/PostToolUse/)).toBeInTheDocument();
    expect(screen.getByText(/\bStop\b/)).toBeInTheDocument();
    // async (미관측) 노드들
    expect(screen.getByText(/PermissionRequest/)).toBeInTheDocument();
    expect(screen.getByText(/SubagentStart/)).toBeInTheDocument();
    expect(screen.getByText(/SubagentStop/)).toBeInTheDocument();
    expect(screen.getByText(/Notification/)).toBeInTheDocument();
  });

  it('empty records → 모든 노드가 "not observed"', () => {
    render(<Lifecycle records={[]} />);
    const notObserved = screen.getAllByText(/not observed/i);
    // 최소 9개 (각 노드당 1개)
    expect(notObserved.length).toBeGreaterThanOrEqual(9);
  });

  it('snapshot 있음 → SessionStart 노드가 observed 상태 (count ≥1)', () => {
    render(<Lifecycle records={[rec({ kind: 'snapshot', source: 'SessionStart' })]} />);
    const node = screen.getByTestId('lifecycle-node-SessionStart');
    expect(node).toHaveAttribute('data-observed', 'true');
    expect(node).toHaveTextContent(/1 event/i);
  });

  it('prompt 있음 → UserPromptSubmit 노드 observed', () => {
    render(<Lifecycle records={[rec({ kind: 'prompt', source: 'UserPromptSubmit' })]} />);
    const node = screen.getByTestId('lifecycle-node-UserPromptSubmit');
    expect(node).toHaveAttribute('data-observed', 'true');
  });

  it('tool_pre / tool_post → PreToolUse / PostToolUse observed', () => {
    render(
      <Lifecycle
        records={[
          rec({ span_id: 'a', kind: 'tool_pre', source: 'PreToolUse' }),
          rec({ span_id: 'b', kind: 'tool_post', source: 'PostToolUse' }),
        ]}
      />,
    );
    expect(screen.getByTestId('lifecycle-node-PreToolUse')).toHaveAttribute('data-observed', 'true');
    expect(screen.getByTestId('lifecycle-node-PostToolUse')).toHaveAttribute('data-observed', 'true');
  });

  it('stop → Stop observed', () => {
    render(<Lifecycle records={[rec({ kind: 'stop', source: 'Stop' })]} />);
    expect(screen.getByTestId('lifecycle-node-Stop')).toHaveAttribute('data-observed', 'true');
  });

  it('async 노드(PermissionRequest 등) 는 기본적으로 not observed', () => {
    render(<Lifecycle records={[rec({ kind: 'snapshot' })]} />);
    expect(screen.getByTestId('lifecycle-node-PermissionRequest')).toHaveAttribute('data-observed', 'false');
  });
});
