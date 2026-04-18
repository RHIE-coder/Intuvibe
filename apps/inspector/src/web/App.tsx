// App.tsx — 3-pane 셸 + 탭 스위처. 세션/스팬 선택 상태를 소유.

import { useEffect, useState } from 'react';
import { TabBar } from './components/TabBar.js';
import { SessionList } from './components/SessionList.js';
import { Timeline } from './components/Timeline.js';
import { SpanDetail } from './components/SpanDetail.js';
import { useSessions } from './useSessions.js';
import type { TabId } from './tabs.js';
import type { TraceRecord } from '../shared/trace.js';

export function App() {
  const { sessions, selectedId, selected, selectSession } = useSessions();
  const [tab, setTab] = useState<TabId>('timeline');
  const [selectedSpanId, setSelectedSpanId] = useState<string | null>(null);

  // 세션 바뀌면 span 선택 리셋.
  useEffect(() => { setSelectedSpanId(null); }, [selectedId]);

  const records = selected?.records ?? [];
  const selectedRecord = records.find((r) => r.span_id === selectedSpanId) ?? null;

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h1 className="text-sm font-semibold tracking-wide">Harness Inspector</h1>
        <span className="text-xs text-slate-500">{sessions.length} sessions</span>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          aria-label="sessions"
          className="w-72 shrink-0 overflow-y-auto border-r border-slate-800"
        >
          <SessionList
            sessions={sessions}
            selectedId={selectedId}
            onSelect={selectSession}
          />
        </aside>

        <main className="flex flex-1 flex-col overflow-hidden">
          <TabBar active={tab} onChange={setTab} />
          <div className="flex-1 overflow-auto">
            {renderTabBody(tab, records, selectedSpanId, setSelectedSpanId)}
          </div>
        </main>

        <aside
          aria-label="span-detail"
          className="w-96 shrink-0 overflow-y-auto border-l border-slate-800 p-4"
        >
          <SpanDetail record={selectedRecord} />
        </aside>
      </div>
    </div>
  );
}

function renderTabBody(
  tab: TabId,
  records: TraceRecord[],
  selectedSpanId: string | null,
  onSelectSpan: (id: string) => void,
) {
  const stub = (name: string) => (
    <p className="p-4 text-xs italic text-slate-600">{name} (slice pending)</p>
  );
  switch (tab) {
    case 'timeline':
      return (
        <Timeline
          records={records}
          selectedSpanId={selectedSpanId}
          onSelectSpan={onSelectSpan}
        />
      );
    case 'prompt': return stub('Prompt Diff');
    case 'snapshot': return stub('Snapshot');
    case 'subagents': return stub('Subagents');
    case 'lifecycle': return stub('Lifecycle');
  }
}
