import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Snapshot } from '../../src/web/components/Snapshot';
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

describe('<Snapshot />', () => {
  it('snapshot 없음 → empty state', () => {
    render(<Snapshot records={[]} />);
    expect(screen.getByText(/no snapshot/i)).toBeInTheDocument();
  });

  it('rules, skills, mcp_servers 리스트 렌더', () => {
    render(
      <Snapshot
        records={[
          rec({
            data: {
              rules: ['harness.md', 'other.md'],
              skills: ['harness:init'],
              mcp_servers: ['paper'],
            },
          }),
        ]}
      />,
    );
    expect(screen.getByText(/harness\.md/)).toBeInTheDocument();
    expect(screen.getByText(/other\.md/)).toBeInTheDocument();
    expect(screen.getByText(/harness:init/)).toBeInTheDocument();
    expect(screen.getByText(/paper/)).toBeInTheDocument();
  });

  it('빈 배열 필드도 안전하게 처리', () => {
    render(
      <Snapshot
        records={[rec({ data: { rules: [], skills: [], mcp_servers: [] } })]}
      />,
    );
    // 섹션 라벨은 표시되어야 함
    expect(screen.getByText(/rules/i)).toBeInTheDocument();
    expect(screen.getByText(/skills/i)).toBeInTheDocument();
  });
});
