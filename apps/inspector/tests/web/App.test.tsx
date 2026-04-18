import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/web/App';

const originalFetch = globalThis.fetch;

beforeEach(() => {
  // 기본 fetch mock — useSessions 가 실패하지 않도록 빈 세션 반환.
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify({ sessions: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  ) as typeof fetch;
});

afterEach(() => { globalThis.fetch = originalFetch; });

describe('<App />', () => {
  it('헤더, 3-pane, 탭바를 렌더', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /harness inspector/i })).toBeInTheDocument();
    // 탭바 — 5개 탭
    await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(5));
    // 기본 탭은 Timeline
    expect(screen.getByRole('tab', { name: /timeline/i })).toHaveAttribute('aria-selected', 'true');
    // 좌/우 사이드 영역이 존재 (complementary role)
    expect(screen.getAllByRole('complementary').length).toBeGreaterThanOrEqual(2);
  });

  it('탭 클릭 → active 탭 변경', async () => {
    render(<App />);
    await waitFor(() => expect(screen.getAllByRole('tab')).toHaveLength(5));
    await userEvent.click(screen.getByRole('tab', { name: /lifecycle/i }));
    expect(screen.getByRole('tab', { name: /lifecycle/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /timeline/i })).toHaveAttribute('aria-selected', 'false');
  });
});
