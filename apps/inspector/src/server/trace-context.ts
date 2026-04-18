// server/trace-context.ts — store + watcher 싱글톤 컨테이너.
// 라우트가 공유해야 하는 상태를 한 곳에서 생성하고, app.ts 가 주입.

import { TRACES_DIR } from '../config.js';
import { TraceStore } from '../shared/trace-store.js';
import { TraceFileWatcher } from '../shared/trace-file-watcher.js';

export interface TraceContext {
  store: TraceStore;
  watcher: TraceFileWatcher;
}

export function createTraceContext(): TraceContext {
  const store = new TraceStore(TRACES_DIR);
  store.loadAll();
  const watcher = new TraceFileWatcher(TRACES_DIR, store);
  watcher.start();
  return { store, watcher };
}
