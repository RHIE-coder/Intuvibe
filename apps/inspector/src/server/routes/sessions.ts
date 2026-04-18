// routes/sessions.ts — GET /api/sessions, GET /api/sessions/:id.

import { Router } from 'express';
import type {
  ErrorResponse,
  GetSessionResponse,
  ListSessionsResponse,
} from '../../shared/protocol.js';
import type { TraceContext } from '../trace-context.js';

export function createSessionsRouter(ctx: TraceContext): Router {
  const router = Router();

  router.get('/sessions', (_req, res) => {
    const body: ListSessionsResponse = { sessions: ctx.store.listSummaries() };
    res.json(body);
  });

  router.get('/sessions/:id', (req, res) => {
    const summary = ctx.store.getSummary(req.params.id);
    if (!summary) {
      const err: ErrorResponse = { error: `session not found: ${req.params.id}` };
      res.status(404).json(err);
      return;
    }
    const body: GetSessionResponse = {
      summary,
      records: ctx.store.getRecords(req.params.id),
    };
    res.json(body);
  });

  return router;
}
