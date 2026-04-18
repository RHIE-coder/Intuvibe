import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubagentTree } from '../../src/web/components/SubagentTree';
import type { TraceRecord } from '../../src/shared/trace';

function rec(overrides: Partial<TraceRecord> = {}): TraceRecord {
  return {
    v: 1,
    ts: '2026-04-19T10:00:00.000Z',
    session_id: 'sess-1',
    span_id: 'sp-1',
    parent_span_id: null,
    kind: 'tool_pre',
    source: 'PreToolUse',
    tool: 'Bash',
    data: {},
    ...overrides,
  };
}

describe('<SubagentTree />', () => {
  it('records 없음 → empty state', () => {
    render(<SubagentTree records={[]} />);
    expect(screen.getByText(/no records/i)).toBeInTheDocument();
  });

  it('parent→child 트리 렌더 (중첩 list item)', () => {
    render(
      <SubagentTree
        records={[
          rec({ span_id: 'root', parent_span_id: null, tool: 'RootTool' }),
          rec({ span_id: 'child', parent_span_id: 'root', tool: 'ChildTool' }),
        ]}
      />,
    );
    expect(screen.getByText(/RootTool/)).toBeInTheDocument();
    expect(screen.getByText(/ChildTool/)).toBeInTheDocument();
    // child 는 root 의 중첩 <ul> 안에 있어야 함
    const childItem = screen.getByText(/ChildTool/).closest('li');
    expect(childItem?.parentElement?.parentElement?.tagName).toBe('LI');
  });

  it('orphan (parent_span_id 가 존재하지 않는 경우) 도 최상위에 렌더', () => {
    render(
      <SubagentTree
        records={[
          rec({ span_id: 'a', parent_span_id: null, tool: 'A' }),
          rec({ span_id: 'b', parent_span_id: 'ghost', tool: 'B' }),
        ]}
      />,
    );
    expect(screen.getByText(/^A$/)).toBeInTheDocument();
    expect(screen.getByText(/^B$/)).toBeInTheDocument();
  });

  it('Task 도구 → subagent_type 표시 + 배지 강조', () => {
    render(
      <SubagentTree
        records={[
          rec({
            span_id: 't1',
            kind: 'tool_pre',
            tool: 'Task',
            data: { input: { subagent_type: 'Explore', prompt: '...' } },
          }),
          rec({
            span_id: 'child',
            parent_span_id: 't1',
            tool: 'Bash',
          }),
        ]}
      />,
    );
    // subagent_type 표시
    expect(screen.getByText(/Explore/)).toBeInTheDocument();
    // "Task" 라벨이 subagent badge 로 구분됨
    expect(screen.getByTestId('task-badge-t1')).toBeInTheDocument();
  });

  it('Task 도구 subagent_type 없어도 "Task" 자체는 표시', () => {
    render(
      <SubagentTree
        records={[
          rec({ span_id: 't1', kind: 'tool_pre', tool: 'Task', data: {} }),
        ]}
      />,
    );
    expect(screen.getByText(/^Task$/)).toBeInTheDocument();
  });
});
