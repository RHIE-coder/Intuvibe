import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PromptDiff } from '../../src/web/components/PromptDiff';
import type { TraceRecord } from '../../src/shared/trace';

function rec(overrides: Partial<TraceRecord> = {}): TraceRecord {
  return {
    v: 1,
    ts: '2026-04-19T10:00:00.000Z',
    session_id: 'sess-1',
    span_id: 'sp-1',
    parent_span_id: null,
    kind: 'prompt',
    source: 'UserPromptSubmit',
    data: {},
    ...overrides,
  };
}

describe('<PromptDiff />', () => {
  it('prompt 없음 → empty state', () => {
    render(<PromptDiff records={[]} />);
    expect(screen.getByText(/no prompt/i)).toBeInTheDocument();
  });

  it('prompt → original 표시', () => {
    render(
      <PromptDiff
        records={[
          rec({ span_id: 'p1', kind: 'prompt', data: { original: '안녕' } }),
        ]}
      />,
    );
    expect(screen.getByText(/안녕/)).toBeInTheDocument();
  });

  it('prompt + prompt_transformed (parent=prompt.span_id) → before/after 모두 표시', () => {
    render(
      <PromptDiff
        records={[
          rec({ span_id: 'p1', kind: 'prompt', data: { original: 'orig-text' } }),
          rec({
            span_id: 'p2',
            kind: 'prompt_transformed',
            parent_span_id: 'p1',
            data: { final: 'final-text' },
          }),
        ]}
      />,
    );
    expect(screen.getByText(/orig-text/)).toBeInTheDocument();
    expect(screen.getByText(/final-text/)).toBeInTheDocument();
  });
});
