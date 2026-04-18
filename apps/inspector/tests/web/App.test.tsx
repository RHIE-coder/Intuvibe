import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '../../src/web/App';

// 스모크 테스트 — jsdom + @testing-library/react + React plugin 파이프라인
// 이 정상 동작하는지 검증. M3 에서 실제 컴포넌트·훅 추가 시 TDD 로 확장.
describe('<App />', () => {
  it('헤더에 Harness Inspector 텍스트를 렌더한다', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /harness inspector/i })).toBeInTheDocument();
  });
});
