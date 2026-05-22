"use client";

// Interactive animated schema flowchart. Uses React Flow (xyflow) with
// dagre for auto-layout. Each node = Convex table colored by feature,
// edges = FK relationships with dotted-line animation showing direction
// of data flow. Click node → highlight all connected edges + neighbors.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  MarkerType,
} from "@xyflow/react";
import dagre from "dagre";
import { Database, ArrowRight, AlertTriangle, Layers2, Maximize2, RotateCcw } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

import "@xyflow/react/dist/style.css";

type FkField = { field: string; target: string; typed: boolean; note?: string };
type IncomingRef = { from: string; field: string };
type LooseField = { field: string; reason: string };
type TableSpec = {
  name: string;
  feature: string;
  fk: FkField[];
  incoming: IncomingRef[];
  denormalized?: string[];
  loose?: LooseField[];
};

// ── Color palette per feature ──────────────────────────────
const FEATURE_PALETTE: Record<string, { bg: string; border: string; text: string; accent: string }> = {
  masterData:           { bg: "#fffbeb", border: "#fde68a", text: "#78350f", accent: "#f59e0b" },
  transactions:         { bg: "#f5f3ff", border: "#ddd6fe", text: "#4c1d95", accent: "#8b5cf6" },
  payables:             { bg: "#fff1f2", border: "#fecdd3", text: "#881337", accent: "#f43f5e" },
  closing:              { bg: "#eff6ff", border: "#bfdbfe", text: "#1e3a8a", accent: "#3b82f6" },
  sales:                { bg: "#ecfdf5", border: "#a7f3d0", text: "#064e3b", accent: "#10b981" },
  expenses:             { bg: "#fff7ed", border: "#fed7aa", text: "#7c2d12", accent: "#f97316" },
  inventory:            { bg: "#f0fdfa", border: "#99f6e4", text: "#134e4a", accent: "#14b8a6" },
  reports:              { bg: "#f8fafc", border: "#cbd5e1", text: "#0f172a", accent: "#64748b" },
  pettyCash:            { bg: "#fdf2f8", border: "#fbcfe8", text: "#831843", accent: "#ec4899" },
  audit:                { bg: "#fafafa", border: "#d4d4d8", text: "#18181b", accent: "#71717a" },
  dailyReportValidation:{ bg: "#ecfeff", border: "#a5f3fc", text: "#164e63", accent: "#06b6d4" },
  auth:                 { bg: "#faf5ff", border: "#e9d5ff", text: "#581c87", accent: "#a855f7" },
  ai:                   { bg: "#fdf4ff", border: "#f5d0fe", text: "#701a75", accent: "#d946ef" },
};

const DEFAULT_PALETTE = FEATURE_PALETTE.reports;

// ── Custom table node ──────────────────────────────────────
type TableNodeData = {
  table: TableSpec;
  isFocused: boolean;
  isNeighbor: boolean;
  isDimmed: boolean;
};

function TableNode({ data, selected }: NodeProps<Node<TableNodeData>>) {
  const { table, isFocused, isNeighbor, isDimmed } = data;
  const palette = FEATURE_PALETTE[table.feature] ?? DEFAULT_PALETTE;
  const fkCount = table.fk.length;
  const inCount = table.incoming.length;
  const looseCount = table.loose?.length ?? 0;

  return (
    <div
      className={cn(
        "rounded-xl border-2 px-3 py-2 text-xs font-mono shadow-md transition-all min-w-[160px]",
        selected && "ring-4 ring-primary/40",
        isFocused && "ring-4 ring-primary/60 shadow-lg scale-105",
        isNeighbor && "ring-2 ring-primary/30",
        isDimmed && "opacity-25",
      )}
      style={{
        background: palette.bg,
        borderColor: palette.border,
        color: palette.text,
      }}
    >
      <Handle type="target" position={Position.Left} className="!bg-transparent !border-0 !w-1.5 !h-1.5" />
      <Handle type="source" position={Position.Right} className="!bg-transparent !border-0 !w-1.5 !h-1.5" />

      <div
        className="text-[9px] uppercase tracking-wider font-semibold mb-0.5 opacity-70"
        style={{ color: palette.accent }}
      >
        {table.feature}
      </div>
      <div className="font-bold text-[12px] truncate" title={table.name}>
        {table.name}
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-[10px] opacity-80">
        <span title="FK keluar">→{fkCount}</span>
        <span title="FK masuk">←{inCount}</span>
        {looseCount > 0 && (
          <span className="text-amber-700 font-semibold" title="Loose string IDs">
            ⚠{looseCount}
          </span>
        )}
      </div>
    </div>
  );
}

const nodeTypes = { tableNode: TableNode };

// ── Dagre auto-layout ──────────────────────────────────────
function autoLayout(nodes: Node[], edges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 110, marginx: 30, marginy: 30 });

  const W = 200;
  const H = 80;
  for (const n of nodes) g.setNode(n.id, { width: W, height: H });
  for (const e of edges) g.setEdge(e.source, e.target);
  dagre.layout(g);

  const laidOut = nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      ...n,
      position: { x: pos.x - W / 2, y: pos.y - H / 2 },
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
    };
  });
  return { nodes: laidOut, edges };
}

// ── Main view ──────────────────────────────────────────────
export function SchemaFlowchart() {
  const data = useQuery(api.features.schemaGraph.queries.getSchemaGraph);
  const tables = useMemo(() => (data?.tables as TableSpec[] | undefined) ?? [], [data]);

  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [features, setFeatures] = useState<Set<string>>(new Set());

  const allFeatures = useMemo(() => {
    const s = new Set<string>();
    tables.forEach((t) => s.add(t.feature));
    return Array.from(s).sort();
  }, [tables]);

  // Build node + edge graph
  const baseGraph = useMemo(() => {
    const tableSet = new Set(tables.map((t) => t.name));
    const tableFeatureMap = Object.fromEntries(tables.map((t) => [t.name, t.feature]));
    const visibleTables = features.size === 0
      ? tables
      : tables.filter((t) => features.has(t.feature));
    const visibleNames = new Set(visibleTables.map((t) => t.name));

    const nodes: Node[] = visibleTables.map((t) => ({
      id: t.name,
      type: "tableNode",
      position: { x: 0, y: 0 },
      data: {
        table: t,
        isFocused: false,
        isNeighbor: false,
        isDimmed: false,
      },
    }));

    const edges: Edge[] = [];
    for (const t of tables) {
      if (!visibleNames.has(t.name)) continue;
      for (const f of t.fk) {
        if (!tableSet.has(f.target) || !visibleNames.has(f.target)) continue;
        edges.push({
          id: `${t.name}.${f.field}->${f.target}`,
          source: t.name,
          target: f.target,
          label: f.field,
          animated: true,
          type: "smoothstep",
          style: {
            stroke: FEATURE_PALETTE[tableFeatureMap[t.name]]?.accent ?? "#94a3b8",
            strokeWidth: 1.5,
          },
          labelStyle: { fontSize: 9, fill: "#475569" },
          labelBgStyle: { fill: "#fff", fillOpacity: 0.7 },
          labelBgPadding: [2, 2],
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 14,
            height: 14,
            color: FEATURE_PALETTE[tableFeatureMap[t.name]]?.accent ?? "#94a3b8",
          },
        });
      }
    }
    return autoLayout(nodes, edges);
  }, [tables, features]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(baseGraph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(baseGraph.edges);

  // Re-apply layout when graph rebuilds
  useEffect(() => {
    setNodes(baseGraph.nodes);
    setEdges(baseGraph.edges);
    setFocusedId(null);
  }, [baseGraph.nodes, baseGraph.edges, setNodes, setEdges]);

  // Highlight focused + neighbors + dim others
  useEffect(() => {
    if (!focusedId) {
      setNodes((curr) => curr.map((n) => ({
        ...n,
        data: { ...(n.data as TableNodeData), isFocused: false, isNeighbor: false, isDimmed: false },
      })));
      setEdges((curr) => curr.map((e) => ({
        ...e,
        style: { ...e.style, opacity: 1 },
      })));
      return;
    }
    const neighbors = new Set<string>();
    for (const e of baseGraph.edges) {
      if (e.source === focusedId) neighbors.add(e.target);
      if (e.target === focusedId) neighbors.add(e.source);
    }
    setNodes((curr) => curr.map((n) => ({
      ...n,
      data: {
        ...(n.data as TableNodeData),
        isFocused: n.id === focusedId,
        isNeighbor: neighbors.has(n.id),
        isDimmed: n.id !== focusedId && !neighbors.has(n.id),
      },
    })));
    setEdges((curr) => curr.map((e) => {
      const connected = e.source === focusedId || e.target === focusedId;
      return {
        ...e,
        animated: connected,
        style: {
          ...e.style,
          opacity: connected ? 1 : 0.15,
          strokeWidth: connected ? 2.5 : 1.5,
        },
      };
    }));
  }, [focusedId, baseGraph.edges, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, n: Node) => {
    setFocusedId((curr) => (curr === n.id ? null : n.id));
  }, []);

  const toggleFeature = (f: string) => {
    setFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  const resetFilters = () => {
    setFeatures(new Set());
    setFocusedId(null);
  };

  const focusedTable = useMemo(
    () => tables.find((t) => t.name === focusedId) ?? null,
    [tables, focusedId],
  );

  if (!data) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Memuat schema graph...</p>;
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-sm space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Layers2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">Filter feature:</span>
          {allFeatures.map((f) => {
            const palette = FEATURE_PALETTE[f] ?? DEFAULT_PALETTE;
            const active = features.size === 0 || features.has(f);
            return (
              <button
                key={f}
                onClick={() => toggleFeature(f)}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border transition-all",
                  active ? "" : "opacity-40",
                )}
                style={{
                  background: palette.bg,
                  borderColor: palette.border,
                  color: palette.text,
                }}
              >
                {f}
              </button>
            );
          })}
          {(features.size > 0 || focusedId) && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-border hover:bg-muted/50"
            >
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <ArrowRight className="h-3 w-3" />
          Klik node = focus + highlight neighbors. Drag = atur posisi. Scroll = zoom. Garis ber-animasi = FK relationship.
        </p>
      </div>

      {/* Flow */}
      <div className="rounded-xl border border-border bg-muted/10 overflow-hidden" style={{ height: 680 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={() => setFocusedId(null)}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15, duration: 400 }}
          minZoom={0.2}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="#e2e8f0" />
          <Controls position="bottom-right" />
          <MiniMap
            nodeColor={(n) => {
              const t = (n.data as TableNodeData)?.table;
              return t ? FEATURE_PALETTE[t.feature]?.accent ?? "#94a3b8" : "#94a3b8";
            }}
            maskColor="rgba(0, 0, 0, 0.05)"
            pannable
            zoomable
            position="bottom-left"
          />
        </ReactFlow>
      </div>

      {/* Focused detail panel */}
      {focusedTable && (
        <div className="rounded-xl border border-primary/30 bg-card p-4 shadow-sm">
          <header className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <Database className="h-4 w-4 text-primary shrink-0" />
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase"
                style={{
                  background: FEATURE_PALETTE[focusedTable.feature]?.bg,
                  color: FEATURE_PALETTE[focusedTable.feature]?.text,
                }}
              >
                {focusedTable.feature}
              </span>
              <code className="font-mono text-sm font-bold">{focusedTable.name}</code>
            </div>
            <button
              onClick={() => setFocusedId(null)}
              className="text-[10px] px-2 py-1 rounded border border-border hover:bg-muted/50"
            >
              Tutup
            </button>
          </header>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <DetailBlock label={`→ FK keluar (${focusedTable.fk.length})`}>
              {focusedTable.fk.length === 0 && <span className="text-muted-foreground">—</span>}
              <ul className="space-y-0.5">
                {focusedTable.fk.map((f) => (
                  <li key={f.field}>
                    <code className="text-[11px]">{f.field}</code>
                    <span className="text-muted-foreground"> → </span>
                    <button
                      onClick={() => setFocusedId(f.target)}
                      className="text-primary hover:underline font-mono text-[11px]"
                    >
                      {f.target}
                    </button>
                  </li>
                ))}
              </ul>
            </DetailBlock>
            <DetailBlock label={`← FK masuk (${focusedTable.incoming.length})`}>
              {focusedTable.incoming.length === 0 && <span className="text-muted-foreground">—</span>}
              <ul className="space-y-0.5 max-h-40 overflow-y-auto">
                {focusedTable.incoming.map((r, i) => (
                  <li key={i}>
                    <button
                      onClick={() => setFocusedId(r.from)}
                      className="text-primary hover:underline font-mono text-[11px]"
                    >
                      {r.from}
                    </button>
                    <span className="text-muted-foreground">.{r.field}</span>
                  </li>
                ))}
              </ul>
            </DetailBlock>
            {(focusedTable.loose && focusedTable.loose.length > 0) ? (
              <DetailBlock label={`⚠ Loose IDs (${focusedTable.loose.length})`} variant="warn">
                <ul className="space-y-0.5">
                  {focusedTable.loose.map((l) => (
                    <li key={l.field}>
                      <code className="text-[11px]">{l.field}</code>
                      <span className="text-amber-800 italic"> — {l.reason}</span>
                    </li>
                  ))}
                </ul>
              </DetailBlock>
            ) : focusedTable.denormalized && focusedTable.denormalized.length > 0 ? (
              <DetailBlock label="Denormalized">
                <div className="flex flex-wrap gap-1">
                  {focusedTable.denormalized.map((f) => (
                    <code key={f} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted">{f}</code>
                  ))}
                </div>
              </DetailBlock>
            ) : (
              <DetailBlock label="Catatan">
                <span className="text-muted-foreground">Tidak ada loose / denorm.</span>
              </DetailBlock>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailBlock({
  label, children, variant,
}: {
  label: string;
  children: React.ReactNode;
  variant?: "warn";
}) {
  return (
    <section
      className={cn(
        "rounded-lg border p-2",
        variant === "warn" ? "border-amber-200 bg-amber-50" : "border-border bg-muted/10",
      )}
    >
      <h4 className={cn(
        "text-[10px] uppercase font-semibold tracking-wider mb-1",
        variant === "warn" ? "text-amber-900 flex items-center gap-1" : "text-muted-foreground",
      )}>
        {variant === "warn" && <AlertTriangle className="h-3 w-3" />}
        {label}
      </h4>
      {children}
    </section>
  );
}

// Re-export for build (some toolchains tree-shake unused imports too aggressively).
export const _devIcons = { Maximize2 };
