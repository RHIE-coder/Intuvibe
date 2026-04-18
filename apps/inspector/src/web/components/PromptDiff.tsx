// components/PromptDiff.tsx — prompt / prompt_transformed 쌍을 before/after 로 표시.

import type { TraceRecord } from '../../shared/trace.js';

interface PromptDiffProps {
  records: TraceRecord[];
}

export function PromptDiff({ records }: PromptDiffProps) {
  const prompts = records.filter((r) => r.kind === 'prompt');
  if (prompts.length === 0) {
    return <p className="p-4 italic text-slate-600">no prompt records</p>;
  }
  return (
    <ul className="divide-y divide-slate-900">
      {prompts.map((p) => {
        const transformed = records.find(
          (r) => r.kind === 'prompt_transformed' && r.parent_span_id === p.span_id,
        );
        return <PromptPair key={p.span_id} original={p} transformed={transformed} />;
      })}
    </ul>
  );
}

interface PairProps {
  original: TraceRecord;
  transformed: TraceRecord | undefined;
}

function PromptPair({ original, transformed }: PairProps) {
  const origText = asText(original.data.original ?? original.data.text);
  const finalText = transformed ? asText(transformed.data.final ?? transformed.data.text) : null;
  return (
    <li className="p-4 text-xs">
      <Block label="original" text={origText} />
      {finalText !== null ? <Block label="transformed" text={finalText} /> : null}
    </li>
  );
}

function Block({ label, text }: { label: string; text: string }) {
  return (
    <div className="mb-2">
      <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-slate-900 p-2 font-mono text-[11px] text-slate-300">
        {text}
      </pre>
    </div>
  );
}

function asText(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v == null) return '';
  return JSON.stringify(v, null, 2);
}
