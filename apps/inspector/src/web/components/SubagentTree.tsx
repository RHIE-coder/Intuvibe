// components/SubagentTree.tsx — parent_span_id 기반 트리 렌더.

import type { TraceRecord } from '../../shared/trace.js';

interface SubagentTreeProps {
  records: TraceRecord[];
}

interface TreeNode {
  record: TraceRecord;
  children: TreeNode[];
}

export function SubagentTree({ records }: SubagentTreeProps) {
  if (records.length === 0) {
    return <p className="p-4 italic text-slate-600">no records</p>;
  }
  const roots = buildTree(records);
  return (
    <ul className="p-4 text-xs">
      {roots.map((n) => <TreeItem key={n.record.span_id} node={n} />)}
    </ul>
  );
}

function TreeItem({ node }: { node: TreeNode }) {
  const { kind, tool, span_id } = node.record;
  return (
    <li className="my-1">
      <div className="flex items-baseline gap-2">
        <span className="text-[10px] uppercase text-slate-500">{kind}</span>
        <span className="font-mono text-slate-200">{tool ?? span_id}</span>
      </div>
      {node.children.length > 0 ? (
        <ul className="ml-4 border-l border-slate-800 pl-3">
          {node.children.map((c) => <TreeItem key={c.record.span_id} node={c} />)}
        </ul>
      ) : null}
    </li>
  );
}

function buildTree(records: TraceRecord[]): TreeNode[] {
  const ids = new Set(records.map((r) => r.span_id));
  const byParent = new Map<string, TreeNode[]>();
  const nodes = new Map<string, TreeNode>();
  for (const r of records) {
    nodes.set(r.span_id, { record: r, children: [] });
  }
  const roots: TreeNode[] = [];
  for (const r of records) {
    const node = nodes.get(r.span_id)!;
    const parentId = r.parent_span_id;
    if (parentId && ids.has(parentId)) {
      const list = byParent.get(parentId) ?? [];
      list.push(node);
      byParent.set(parentId, list);
    } else {
      roots.push(node);
    }
  }
  for (const [parentId, children] of byParent) {
    const parent = nodes.get(parentId);
    if (parent) parent.children = children;
  }
  return roots;
}
