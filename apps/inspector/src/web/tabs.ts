// web/tabs.ts — 중앙 패널 5탭 정의.

export type TabId = 'timeline' | 'prompt' | 'snapshot' | 'subagents' | 'lifecycle';

export interface TabDef {
  id: TabId;
  label: string;
}

export const TAB_DEFS: readonly TabDef[] = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'prompt', label: 'Prompt Diff' },
  { id: 'snapshot', label: 'Snapshot' },
  { id: 'subagents', label: 'Subagents' },
  { id: 'lifecycle', label: 'Lifecycle' },
] as const;
