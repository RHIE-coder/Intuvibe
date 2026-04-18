// components/PromptDiff.tsx — prompt / prompt_transformed 쌍 + lexicon 매치 하이라이트.

import type { TraceRecord } from '../../shared/trace.js';

interface PromptDiffProps {
  records: TraceRecord[];
}

interface LexiconMatch {
  keyword: string;
  bypass_flag: string;
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
  const matches = transformed ? asMatches(transformed.data.matches) : [];
  return (
    <li className="p-4 text-xs">
      {matches.length > 0 ? <MatchBadges matches={matches} /> : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Block label="original" text={origText} matches={matches} />
        {finalText !== null ? <Block label="transformed" text={finalText} matches={matches} /> : null}
      </div>
    </li>
  );
}

function MatchBadges({ matches }: { matches: LexiconMatch[] }) {
  return (
    <div className="mb-3">
      <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">matches</div>
      <div className="flex flex-wrap gap-1">
        {matches.map((m, i) => (
          <span
            key={`${m.keyword}:${m.bypass_flag}:${i}`}
            className="rounded bg-amber-900/40 px-2 py-0.5 font-mono text-[10px] text-amber-300"
          >
            {m.keyword} → {m.bypass_flag}
          </span>
        ))}
      </div>
    </div>
  );
}

function Block({ label, text, matches }: { label: string; text: string; matches: LexiconMatch[] }) {
  return (
    <div>
      <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-slate-900 p-2 font-mono text-[11px] text-slate-300">
        {highlight(text, matches)}
      </pre>
    </div>
  );
}

function highlight(text: string, matches: LexiconMatch[]): React.ReactNode {
  if (matches.length === 0) return text;
  const keywords = Array.from(new Set(matches.map((m) => m.keyword))).filter(Boolean);
  if (keywords.length === 0) return text;
  const pattern = new RegExp(`(${keywords.map(escapeRegex).join('|')})`, 'g');
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    keywords.includes(part)
      ? <mark key={i} className="bg-amber-500/30 text-amber-200">{part}</mark>
      : <span key={i}>{part}</span>,
  );
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function asText(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v == null) return '';
  return JSON.stringify(v, null, 2);
}

function asMatches(v: unknown): LexiconMatch[] {
  if (!Array.isArray(v)) return [];
  return v.flatMap((m) => {
    if (m && typeof m === 'object' && 'keyword' in m && 'bypass_flag' in m) {
      const kw = (m as { keyword: unknown }).keyword;
      const flag = (m as { bypass_flag: unknown }).bypass_flag;
      if (typeof kw === 'string' && typeof flag === 'string') {
        return [{ keyword: kw, bypass_flag: flag }];
      }
    }
    return [];
  });
}
