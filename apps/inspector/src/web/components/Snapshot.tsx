// components/Snapshot.tsx — SessionStart snapshot record 렌더.

import type { TraceRecord } from '../../shared/trace.js';

interface SnapshotProps {
  records: TraceRecord[];
}

export function Snapshot({ records }: SnapshotProps) {
  const snap = records.find((r) => r.kind === 'snapshot');
  if (!snap) {
    return <p className="p-4 italic text-slate-600">no snapshot</p>;
  }
  const rules = asStringArray(snap.data.rules);
  const skills = asStringArray(snap.data.skills);
  const mcp = asStringArray(snap.data.mcp_servers);
  return (
    <div className="space-y-4 p-4 text-xs">
      <Section label="rules" items={rules} />
      <Section label="skills" items={skills} />
      <Section label="mcp_servers" items={mcp} />
    </div>
  );
}

function Section({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      {items.length === 0 ? (
        <p className="italic text-slate-600">(empty)</p>
      ) : (
        <ul className="space-y-0.5 font-mono text-slate-300">
          {items.map((i) => <li key={i}>{i}</li>)}
        </ul>
      )}
    </div>
  );
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}
