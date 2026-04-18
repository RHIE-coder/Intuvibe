// routes/health.ts — GET /api/health.

import { Router } from 'express';
import { IS_PROD } from '../../config.js';

export const healthRouter: Router = Router();

healthRouter.get('/health', (_req, res) => {
  res.json({ ok: true, mode: IS_PROD ? 'prod' : 'dev' });
});
