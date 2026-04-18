// components/SessionList.tsx — 좌측 세션 목록. pure, 상태는 부모가 보유.

import type { SessionSummary } from '../../shared/session.js';

interface SessionListProps {
  sessions: SessionSummary[];
  selectedId: string | null;
  onSelect(id: string): void;
}

export function SessionList({ sessions, selectedId, onSelect }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <p className="px-3 py-4 text-center text-xs italic text-slate-600">
        no sessions yet
      </p>
    );
  }
  return (
    <ul className="divide-y divide-slate-900">
      {sessions.map((s) => (
        <li key={s.session_id}>
          <SessionRow
            summary={s}
            active={selectedId === s.session_id}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  );
}

interface SessionRowProps {
  summary: SessionSummary;
  active: boolean;
  onSelect(id: string): void;
}

function SessionRow({ summary, active, onSelect }: SessionRowProps) {
  const { session_id, record_count, tool_calls, has_stop, started_at } = summary;
  return (
    <button
      type="button"
      aria-current={active}
      onClick={() => onSelect(session_id)}
      className={
        'block w-full px-3 py-2 text-left text-xs transition-colors ' +
        (active ? 'bg-slate-800 text-slate-100' : 'text-slate-300 hover:bg-slate-900')
      }
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate font-mono text-slate-100">{session_id}</span>
        <span
          className={
            'shrink-0 text-[10px] font-semibold uppercase ' +
            (has_stop ? 'text-emerald-400' : 'text-amber-400')
          }
        >
          {has_stop ? 'done' : 'running'}
        </span>
      </div>
      <div className="mt-1 flex gap-3 text-[10px] text-slate-500">
        <span>{record_count} rec</span>
        <span>{tool_calls} tools</span>
        <span className="ml-auto truncate">{formatTime(started_at)}</span>
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
