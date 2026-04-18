// components/TabBar.tsx — 탭 스위처. pure, 상태는 부모가 보유.

import { TAB_DEFS, type TabId } from '../tabs.js';

interface TabBarProps {
  active: TabId;
  onChange(id: TabId): void;
}

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div role="tablist" className="flex border-b border-slate-800 bg-slate-950">
      {TAB_DEFS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={
              'px-4 py-2 text-xs font-medium transition-colors ' +
              (isActive
                ? 'border-b-2 border-sky-400 text-slate-100'
                : 'text-slate-500 hover:text-slate-300')
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
