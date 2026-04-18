// vite-middleware.ts — dev 전용.
// Vite 를 library 로 embed 하여 Express 가 소유한 포트 위에서 HMR·React refresh 를
// 그대로 동작시킨다. 프로덕션에서는 로드되지 않음.

import type { RequestHandler } from 'express';
import { createServer as createViteServer } from 'vite';
import { VITE_CONFIG, WEB_ROOT } from '../config.js';

export async function createViteMiddleware(): Promise<RequestHandler> {
  const vite = await createViteServer({
    configFile: VITE_CONFIG,
    root: WEB_ROOT,
    server: { middlewareMode: true },
    appType: 'spa',
  });
  return vite.middlewares;
}
