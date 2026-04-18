// routes/stream.ts — GET /api/stream (SSE).
// watcher 에서 들어오는 이벤트를 브라우저로 push. heartbeat 주기로 idle 연결 유지.

import { Router, type Response } from 'express';
import { SSE_HEARTBEAT_MS, type StreamEvent } from '../../shared/protocol.js';
import type { WatcherEvent } from '../../shared/trace-file-watcher.js';
import type { TraceContext } from '../trace-context.js';

export function createStreamRouter(ctx: TraceContext): Router {
  const router = Router();

  router.get('/stream', (req, res) => {
    setupSseHeaders(res);
    sendSse(res, { type: 'heartbeat', ts: new Date().toISOString() });

    const onWatcherEvent = (ev: WatcherEvent) => {
      const streamEv = toStreamEvent(ev, ctx);
      if (streamEv) sendSse(res, streamEv);
    };
    ctx.watcher.on('event', onWatcherEvent);

    const heartbeat = setInterval(() => {
      sendSse(res, { type: 'heartbeat', ts: new Date().toISOString() });
    }, SSE_HEARTBEAT_MS);

    req.on('close', () => {
      clearInterval(heartbeat);
      ctx.watcher.off('event', onWatcherEvent);
    });
  });

  return router;
}

function setupSseHeaders(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
}

function sendSse(res: Response, ev: StreamEvent): void {
  res.write(`data: ${JSON.stringify(ev)}\n\n`);
}

function toStreamEvent(ev: WatcherEvent, ctx: TraceContext): StreamEvent | null {
  if (ev.type === 'record') {
    return { type: 'record', session_id: ev.session_id, record: ev.record };
  }
  if (ev.type === 'session_added') {
    const summary = ctx.store.getSummary(ev.session_id);
    if (!summary) return null;
    return { type: 'session_added', summary };
  }
  return null;
}
