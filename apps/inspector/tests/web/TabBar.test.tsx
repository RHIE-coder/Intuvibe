import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TabBar } from '../../src/web/components/TabBar';
import { TAB_DEFS } from '../../src/web/tabs';

describe('<TabBar />', () => {
  it('5개 탭을 모두 렌더하고 active 탭에 aria-selected=true', () => {
    render(<TabBar active="timeline" onChange={() => {}} />);
    expect(screen.getAllByRole('tab')).toHaveLength(TAB_DEFS.length);
    const active = screen.getByRole('tab', { name: /timeline/i });
    expect(active).toHaveAttribute('aria-selected', 'true');
  });

  it('탭 클릭 시 onChange(id) 호출', async () => {
    const onChange = vi.fn();
    render(<TabBar active="timeline" onChange={onChange} />);
    await userEvent.click(screen.getByRole('tab', { name: /lifecycle/i }));
    expect(onChange).toHaveBeenCalledWith('lifecycle');
  });
});
