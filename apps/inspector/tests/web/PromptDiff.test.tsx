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

  it('matches[] 있으면 keyword → bypass_flag badge 표시', () => {
    render(
      <PromptDiff
        records={[
          rec({ span_id: 'p1', kind: 'prompt', data: { original: '빨리 구현 도와줘' } }),
          rec({
            span_id: 'p2',
            kind: 'prompt_transformed',
            parent_span_id: 'p1',
            data: {
              final: '빨리 구현 도와줘',
              matches: [{ keyword: '빨리', bypass_flag: '--no-spec' }],
            },
          }),
        ]}
      />,
    );
    // badge 는 "빨리 → --no-spec" 단일 span
    expect(screen.getByText(/빨리\s*→\s*--no-spec/)).toBeInTheDocument();
  });

  it('matches keyword → original 텍스트에서 <mark> 로 하이라이트', () => {
    render(
      <PromptDiff
        records={[
          rec({ span_id: 'p1', kind: 'prompt', data: { original: '빨리 해줘' } }),
          rec({
            span_id: 'p2',
            kind: 'prompt_transformed',
            parent_span_id: 'p1',
            data: {
              final: '빨리 해줘',
              matches: [{ keyword: '빨리', bypass_flag: '--no-spec' }],
            },
          }),
        ]}
      />,
    );
    const marks = document.querySelectorAll('mark');
    expect(marks.length).toBeGreaterThan(0);
    expect(Array.from(marks).some((m) => m.textContent === '빨리')).toBe(true);
  });

  it('빈 matches → badge 섹션 없음', () => {
    render(
      <PromptDiff
        records={[
          rec({ span_id: 'p1', kind: 'prompt', data: { original: '안녕' } }),
          rec({
            span_id: 'p2',
            kind: 'prompt_transformed',
            parent_span_id: 'p1',
            data: { final: '안녕', matches: [] },
          }),
        ]}
      />,
    );
    // badge 섹션의 헤딩/라벨이 렌더되지 않아야 함
    expect(screen.queryByText(/matches/i)).not.toBeInTheDocument();
  });
});
