// config.ts — server/web 공용 상수.

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const APP_ROOT = resolve(__dirname, '..');
export const WEB_ROOT = resolve(APP_ROOT, 'src/web');
export const DIST_DIR = resolve(APP_ROOT, 'dist');
export const VITE_CONFIG = resolve(APP_ROOT, 'vite.config.ts');

export const PORT = Number(process.env.PORT ?? 3030);
export const IS_PROD = process.env.NODE_ENV === 'production';

// 하네스 trace 디렉토리. Inspector 대상 프로젝트의 .harness/state/traces/
// 환경변수 HARNESS_PROJECT_DIR 로 다른 프로젝트를 가리키게 할 수 있다.
export const HARNESS_PROJECT_DIR = resolve(
  process.env.HARNESS_PROJECT_DIR ?? resolve(APP_ROOT, '../..'),
);
export const TRACES_DIR = resolve(HARNESS_PROJECT_DIR, '.harness/state/traces');
