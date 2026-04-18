import { defineConfig } from 'vitest/config';

// Project 분할은 vitest.workspace.ts 참조.
// 이 파일은 모든 project 에 공통 적용되는 커버리지·리포터 설정만 담당.
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/web/main.tsx', 'src/server/index.ts', 'src/config.ts'],
    },
  },
});
