// tests 공용 — 라우터를 격리된 Express 앱으로 띄워 HTTP fetch 로 검증.
// createApp() 전체를 쓰면 Vite 미들웨어까지 끌어오므로, 라우터만 독립 마운트.

import express, { type Express, type Router } from 'express';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { TraceStore } from '../../src/shared/trace-store';
import { TraceFileWatcher } from '../../src/shared/trace-file-watcher';

export interface TestServer {
  baseUrl: string;
  store: TraceStore;
  watcher: TraceFileWatcher;
  close(): Promise<void>;
}

// buildRouter 가 받은 ctx 를 라우터에 주입. router 자체도 function 이라 typeof
// 로 분기할 수 없으므로, 항상 factory 를 받는다.
type BuildRouter = (ctx: { store: TraceStore; watcher: TraceFileWatcher }) => Router;

export async function startTestServer(
  tracesDir: string,
  buildRouter: BuildRouter,
): Promise<TestServer> {
  const store = new TraceStore(tracesDir);
  store.loadAll();
  const watcher = new TraceFileWatcher(tracesDir, store);
  watcher.start();

  const app: Express = express();
  app.use('/api', buildRouter({ store, watcher }));

  const server: Server = createServer(app);
  await new Promise<void>((r) => server.listen(0, r));
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    store,
    watcher,
    close: () =>
      new Promise<void>((resolve) => {
        watcher.stop();
        server.close(() => resolve());
      }),
  };
}
