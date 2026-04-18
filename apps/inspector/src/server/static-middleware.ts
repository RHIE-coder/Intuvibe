// static-middleware.ts — prod 전용.
// `vite build` 가 dist/ 에 내놓은 자산을 serve 한다. SPA fallback 포함.

import type { Router } from 'express';
import express from 'express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { DIST_DIR } from '../config.js';

export function createStaticRouter(): Router {
  if (!existsSync(DIST_DIR)) {
    throw new Error(`[inspector] dist/ 부재 — 'pnpm build' 먼저 실행`);
  }
  const router = express.Router();
  router.use(express.static(DIST_DIR));
  router.get('*', (_req, res) => res.sendFile(resolve(DIST_DIR, 'index.html')));
  return router;
}
