// components/Lifecycle.tsx — 세션 경계 이벤트 (snapshot/turn_*/stop) 시간순 렌더.

import type { TraceRecord, TraceKind } from '../../shared/trace.js';

interface LifecycleProps {
  records: TraceRecord[];
}

const LIFECYCLE_KINDS: readonly TraceKind[] = ['snapshot', 'turn_start', 'turn_end', 'stop'];

export function Lifecycle({ records }: LifecycleProps) {
  const events = records.filter((r) => LIFECYCLE_KINDS.includes(r.kind));
  if (events.length === 0) {
    return <p className="p-4 italic text-slate-600">no lifecycle events</p>;
  }
  return (
    <ul className="divide-y divide-slate-900">
      {events.map((e) => (
        <li key={e.span_id} className="flex items-baseline gap-3 px-4 py-2 text-xs">
          <span className="w-20 shrink-0 font-mono text-[10px] text-slate-500">
            {formatTime(e.ts)}
          </span>
          <span className="shrink-0 text-[10px] font-semibold uppercase text-slate-400">
            {e.kind}
          </span>
          <span className="font-mono text-slate-300">{e.source}</span>
        </li>
      ))}
    </ul>
  );
}

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
