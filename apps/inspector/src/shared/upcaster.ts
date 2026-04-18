// shared/upcaster.ts — JSON → TraceRecord (스키마 버전 변환).
// 현재는 v=1 identity. harness trace schema 버전이 오르면 chain 추가.

import type { TraceRecord, TraceKind, TraceSource } from './trace.js';

export const CURRENT_VERSION = 1;

export function upcastRecord(raw: unknown): TraceRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  if (typeof r.kind !== 'string' || typeof r.source !== 'string') return null;
  if (typeof r.ts !== 'string' || typeof r.span_id !== 'string') return null;

  return {
    v: typeof r.v === 'number' ? r.v : 1,
    ts: r.ts,
    session_id: typeof r.session_id === 'string' ? r.session_id : '_unknown',
    turn: typeof r.turn === 'number' ? r.turn : undefined,
    span_id: r.span_id,
    parent_span_id: typeof r.parent_span_id === 'string' ? r.parent_span_id : null,
    kind: r.kind as TraceKind,
    source: r.source as TraceSource,
    tool: typeof r.tool === 'string' ? r.tool : null,
    producer: typeof r.producer === 'string' ? r.producer : undefined,
    data: (r.data && typeof r.data === 'object' ? (r.data as Record<string, unknown>) : {}),
  };
}
