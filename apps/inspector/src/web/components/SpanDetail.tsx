// components/SpanDetail.tsx — 선택된 span 상세. pure.

import type { TraceRecord } from '../../shared/trace.js';

interface SpanDetailProps {
  record: TraceRecord | null;
}

export function SpanDetail({ record }: SpanDetailProps) {
  if (!record) {
    return <p className="italic text-slate-600">select a span</p>;
  }
  return (
    <div className="space-y-3 text-xs">
      <Field label="kind" value={record.kind} mono />
      <Field label="source" value={record.source} mono />
      <Field label="ts" value={record.ts} mono />
      <Field label="span_id" value={record.span_id} mono />
      {record.parent_span_id ? (
        <Field label="parent_span_id" value={record.parent_span_id} mono />
      ) : null}
      {record.tool ? <Field label="tool" value={record.tool} mono /> : null}
      {typeof record.turn === 'number' ? (
        <Field label="turn" value={String(record.turn)} mono />
      ) : null}
      <div>
        <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">data</div>
        <pre
          data-testid="span-detail-data"
          className="overflow-x-auto rounded bg-slate-900 p-2 font-mono text-[11px] text-slate-300"
        >
          {JSON.stringify(record.data, null, 2)}
        </pre>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  mono?: boolean;
}

function Field({ label, value, mono }: FieldProps) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={'text-slate-200 ' + (mono ? 'font-mono break-all' : '')}>{value}</div>
    </div>
  );
}
