// components/Timeline.tsx — 세션 record 를 시간순으로 렌더. pure.

import type { TraceRecord } from '../../shared/trace.js';

interface TimelineProps {
  records: TraceRecord[];
  selectedSpanId: string | null;
  onSelectSpan(spanId: string): void;
}

export function Timeline({ records, selectedSpanId, onSelectSpan }: TimelineProps) {
  if (records.length === 0) {
    return <p className="italic text-slate-600">no records</p>;
  }
  return (
    <ul className="divide-y divide-slate-900">
      {records.map((r) => (
        <li key={r.span_id}>
          <TimelineRow
            record={r}
            active={selectedSpanId === r.span_id}
            onSelect={onSelectSpan}
          />
        </li>
      ))}
    </ul>
  );
}

interface RowProps {
  record: TraceRecord;
  active: boolean;
  onSelect(spanId: string): void;
}

function TimelineRow({ record, active, onSelect }: RowProps) {
  const { ts, kind, tool, span_id } = record;
  return (
    <button
      type="button"
      aria-current={active}
      onClick={() => onSelect(span_id)}
      className={
        'block w-full px-3 py-2 text-left text-xs transition-colors ' +
        (active ? 'bg-slate-800 text-slate-100' : 'text-slate-300 hover:bg-slate-900')
      }
    >
      <div className="flex items-baseline gap-3">
        <span className="w-20 shrink-0 font-mono text-[10px] text-slate-500">
          {formatTime(ts)}
        </span>
        <span className={'shrink-0 text-[10px] font-semibold uppercase ' + kindColor(kind)}>
          {kind}
        </span>
        {tool ? (
          <span className="truncate font-mono text-slate-200">{tool}</span>
        ) : null}
        <span className="ml-auto shrink-0 truncate font-mono text-[10px] text-slate-600">
          {span_id.slice(0, 8)}
        </span>
      </div>
    </button>
  );
}

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function kindColor(kind: string): string {
  switch (kind) {
    case 'tool_pre': return 'text-sky-400';
    case 'tool_post': return 'text-emerald-400';
    case 'prompt': return 'text-violet-400';
    case 'prompt_transformed': return 'text-fuchsia-400';
    case 'snapshot': return 'text-slate-400';
    case 'stop': return 'text-rose-400';
    default: return 'text-slate-500';
  }
}
