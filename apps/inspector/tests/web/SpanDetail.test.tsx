import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SpanDetail } from '../../src/web/components/SpanDetail';
import type { TraceRecord } from '../../src/shared/trace';

function rec(overrides: Partial<TraceRecord> = {}): TraceRecord {
  return {
    v: 1,
    ts: '2026-04-19T10:00:00.000Z',
    session_id: 'sess-1',
    span_id: 'span-xyz',
    parent_span_id: null,
    kind: 'tool_pre',
    source: 'PreToolUse',
    tool: 'Read',
    data: { path: '/tmp/a.txt' },
    ...overrides,
  };
}

describe('<SpanDetail />', () => {
  it('null record → empty state 메시지', () => {
    render(<SpanDetail record={null} />);
    expect(screen.getByText(/select a span/i)).toBeInTheDocument();
  });

  it('record 필드 표시 — kind, source, tool, span_id', () => {
    render(<SpanDetail record={rec()} />);
    expect(screen.getByText(/tool_pre/i)).toBeInTheDocument();
    expect(screen.getByText(/PreToolUse/)).toBeInTheDocument();
    expect(screen.getByText(/Read/)).toBeInTheDocument();
    expect(screen.getByText(/span-xyz/)).toBeInTheDocument();
  });

  it('data 를 JSON 으로 렌더', () => {
    render(<SpanDetail record={rec({ data: { path: '/tmp/foo.txt', n: 7 } })} />);
    const code = screen.getByTestId('span-detail-data');
    expect(code.textContent).toContain('/tmp/foo.txt');
    expect(code.textContent).toContain('7');
  });

  it('parent_span_id 가 있으면 표시', () => {
    render(<SpanDetail record={rec({ parent_span_id: 'parent-1' })} />);
    expect(screen.getByText(/parent-1/)).toBeInTheDocument();
  });
});
