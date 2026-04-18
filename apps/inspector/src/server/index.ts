// index.ts — HTTP 부팅.
// app 조립은 app.ts, 라우트는 routes/, 미들웨어는 vite-middleware/static-middleware.
// 여기서는 listen 만 담당한다.

import { createServer } from 'node:http';
import { createApp } from './app.js';
import { IS_PROD, PORT } from '../config.js';

async function main() {
  const app = await createApp();
  const server = createServer(app);
  server.listen(PORT, () => {
    console.log(`[inspector] http://localhost:${PORT}  (${IS_PROD ? 'prod' : 'dev'})`);
  });
}

main().catch((e) => {
  console.error('[inspector] boot failed:', e);
  process.exit(1);
});
