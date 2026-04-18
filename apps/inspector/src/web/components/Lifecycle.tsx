// components/Lifecycle.tsx — Claude Code hook 생명주기 다이어그램.
// 관측된 노드는 점등(색상+카운트), 미관측 async 노드는 회색.

import type { TraceRecord, TraceKind } from '../../shared/trace.js';

interface LifecycleProps {
  records: TraceRecord[];
}

interface NodeDef {
  name: string;
  kinds: TraceKind[];
  observable: boolean;
  note?: string;
}

const NODES: readonly NodeDef[] = [
  { name: 'SessionStart', kinds: ['snapshot'], observable: true },
  { name: 'UserPromptSubmit', kinds: ['prompt', 'prompt_transformed'], observable: true },
  { name: 'PreToolUse', kinds: ['tool_pre'], observable: true },
  { name: 'PostToolUse', kinds: ['tool_post'], observable: true },
  { name: 'Stop', kinds: ['stop'], observable: true },
  { name: 'PermissionRequest', kinds: [], observable: false, note: 'async hook — 아직 미수집' },
  { name: 'SubagentStart', kinds: [], observable: false, note: 'Task 도구 발동 시' },
  { name: 'SubagentStop', kinds: [], observable: false, note: 'Task 도구 종료 시' },
  { name: 'Notification', kinds: [], observable: false, note: 'async hook — 아직 미수집' },
] as const;

export function Lifecycle({ records }: LifecycleProps) {
  return (
    <ul className="space-y-2 p-4 text-xs">
      {NODES.map((node) => {
        const matched = node.kinds.flatMap((k) => records.filter((r) => r.kind === k));
        const observed = matched.length > 0;
        const firstTs = observed ? matched[0].ts : null;
        return (
          <li key={node.name}>
            <Node node={node} observed={observed} count={matched.length} firstTs={firstTs} />
          </li>
        );
      })}
    </ul>
  );
}

interface NodeProps {
  node: NodeDef;
  observed: boolean;
  count: number;
  firstTs: string | null;
}

function Node({ node, observed, count, firstTs }: NodeProps) {
  const lit = observed && node.observable;
  return (
    <div
      data-testid={`lifecycle-node-${node.name}`}
      data-observed={String(observed)}
      className={
        'flex items-baseline gap-3 rounded border px-3 py-2 transition-colors ' +
        (lit
          ? 'border-emerald-700 bg-emerald-900/20'
          : 'border-slate-800 bg-slate-900/40 opacity-60')
      }
    >
      <span
        className={
          'inline-block h-2 w-2 shrink-0 rounded-full ' +
          (lit ? 'bg-emerald-400' : 'bg-slate-600')
        }
        aria-hidden="true"
      />
      <span className={'font-mono ' + (lit ? 'text-emerald-200' : 'text-slate-400')}>
        {node.name}
      </span>
      <span className="ml-auto text-[10px] text-slate-500">
        {observed ? (
          <>
            {count} event{count !== 1 ? 's' : ''}
            {firstTs ? ` · ${formatTime(firstTs)}` : ''}
          </>
        ) : (
          <>not observed{node.note ? ` — ${node.note}` : ''}</>
        )}
      </span>
    </div>
  );
}

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
