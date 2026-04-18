// App.tsx — M1 스켈레톤. M3 에서 3-pane 레이아웃 + 탭 뷰로 확장.

export function App() {
  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h1 className="text-sm font-semibold tracking-wide text-slate-200">
          Harness Inspector
        </h1>
        <span className="text-xs text-slate-500">M1 bootstrap</span>
      </header>
      <main className="flex flex-1 items-center justify-center text-slate-400">
        <div className="text-center">
          <p className="text-sm">server 연결 대기 중</p>
          <p className="mt-2 text-xs text-slate-600">
            M2 에서 <code className="text-slate-400">/api/sessions</code> 구현
          </p>
        </div>
      </main>
    </div>
  );
}
