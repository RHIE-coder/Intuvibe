// app.ts — Express 앱 조립.
// 부팅(index.ts) 과 분리: 테스트·재사용이 쉽도록 Express app 만 반환.

import express, { type Express } from 'express';
import { IS_PROD } from '../config.js';
import { healthRouter } from './routes/health.js';
import { createSessionsRouter } from './routes/sessions.js';
import { createStreamRouter } from './routes/stream.js';
import { createStaticRouter } from './static-middleware.js';
import { createTraceContext } from './trace-context.js';
import { createViteMiddleware } from './vite-middleware.js';

export async function createApp(): Promise<Express> {
  const app = express();
  const trace = createTraceContext();

  app.use('/api', healthRouter);
  app.use('/api', createSessionsRouter(trace));
  app.use('/api', createStreamRouter(trace));

  if (IS_PROD) {
    app.use(createStaticRouter());
  } else {
    app.use(await createViteMiddleware());
  }

  return app;
}
