import { defineWorkspace } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// 2-project workspace: node (server + shared) / jsdom (web).
// Vitest 2.x 는 inline `test.projects` 미지원 — 이 파일로 분리.

const alias = {
  '@shared': resolve(__dirname, 'src/shared'),
};

export default defineWorkspace([
  {
    resolve: { alias },
    test: {
      name: 'node',
      environment: 'node',
      include: [
        'tests/shared/**/*.test.ts',
        'tests/server/**/*.test.ts',
      ],
    },
  },
  {
    plugins: [react()],
    resolve: { alias },
    test: {
      name: 'jsdom',
      environment: 'jsdom',
      setupFiles: ['./tests/web/_setup.ts'],
      include: ['tests/web/**/*.test.{ts,tsx}'],
      exclude: ['tests/web/_setup.ts'],
    },
  },
]);
