import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// @testing-library/react 의 auto-cleanup 은 vitest `globals:true` 상태에서만 동작.
// globals=false 환경이라 명시적으로 afterEach 에 unmount 등록.
afterEach(() => { cleanup(); });
