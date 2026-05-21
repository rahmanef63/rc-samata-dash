"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Database, ArrowRight, AlertTriangle, Link2, Layers, Search, ChevronRight } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { cn } from "@/lib/utils";

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

// Stable color per feature so visual scanning works.
const FEATURE_COLORS: Record<string, string> = {
  masterData: "bg-amber-50 border-amber-200 text-amber-900",
  transactions: "bg-violet-50 border-violet-200 text-violet-900",
  payables: "bg-rose-50 border-rose-200 text-rose-900",
  closing: "bg-blue-50 border-blue-200 text-blue-900",
  sales: "bg-emerald-50 border-emerald-200 text-emerald-900",
  expenses: "bg-orange-50 border-orange-200 text-orange-900",
  inventory: "bg-teal-50 border-teal-200 text-teal-900",
  reports: "bg-slate-50 border-slate-200 text-slate-900",
  pettyCash: "bg-pink-50 border-pink-200 text-pink-900",
  audit: "bg-zinc-50 border-zinc-200 text-zinc-900",
  dailyReportValidation: "bg-cyan-50 border-cyan-200 text-cyan-900",
  auth: "bg-purple-50 border-purple-200 text-purple-900",
  ai: "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-900",
};

export function SchemaGraphView() {
  const data = useQuery(api.features.schemaGraph.queries.getSchemaGraph);
  const [filter, setFilter] = useState("");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const tables = (data?.tables as TableSpec[] | undefined) ?? [];
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return tables;
    return tables.filter((t) =>
      t.name.toLowerCase().includes(q) ||
      t.feature.toLowerCase().includes(q) ||
      t.fk.some((f) => f.target.toLowerCase().includes(q)),
    );
  }, [tables, filter]);

  const selected = useMemo(
    () => tables.find((t) => t.name === selectedTable) ?? null,
    [tables, selectedTable],
  );

  if (!data) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Memuat schema graph...</p>;
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-4">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-6 w-6 text-primary" />
            Schema Graph
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Setiap tabel + PK (semua `_id`) + FK ke tabel lain. Visual SSOT untuk relasi data. Loose IDs (string-typed) disorot di kotak kuning.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <StatBadge icon={<Layers className="h-3 w-3" />} label={`${data.stats.tableCount} tabel`} />
          <StatBadge icon={<Link2 className="h-3 w-3" />} label={`${data.stats.fkCount} FK typed`} />
          <StatBadge icon={<AlertTriangle className="h-3 w-3" />} label={`${data.stats.looseCount} loose`} variant="warn" />
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Cari tabel atau FK target..."
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-card text-sm"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-4">
        <div className="space-y-2">
          {Object.entries(groupByFeature(filtered)).map(([feature, items]) => (
            <FeatureGroup
              key={feature}
              feature={feature}
              items={items}
              selectedTable={selectedTable}
              onSelect={setSelectedTable}
            />
          ))}
        </div>

        <aside className="lg:sticky lg:top-4 lg:self-start">
          <TableDetail
            table={selected}
            allTables={tables}
            onNavigate={setSelectedTable}
          />
        </aside>
      </div>
    </div>
  );
}

function groupByFeature(items: TableSpec[]): Record<string, TableSpec[]> {
  const out: Record<string, TableSpec[]> = {};
  for (const t of items) {
    (out[t.feature] ??= []).push(t);
  }
  return out;
}

function StatBadge({ icon, label, variant }: { icon: React.ReactNode; label: string; variant?: "warn" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
      variant === "warn"
        ? "bg-yellow-50 text-yellow-900 border border-yellow-200"
        : "bg-muted text-foreground border border-border",
    )}>
      {icon}{label}
    </span>
  );
}

function FeatureGroup({
  feature, items, selectedTable, onSelect,
}: {
  feature: string;
  items: TableSpec[];
  selectedTable: string | null;
  onSelect: (name: string) => void;
}) {
  const colorClass = FEATURE_COLORS[feature] ?? "bg-muted border-border text-foreground";
  return (
    <section className={cn("rounded-xl border p-3", colorClass)}>
      <h2 className="text-[10px] uppercase font-semibold tracking-wider mb-2 opacity-70">{feature}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {items.map((t) => (
          <TableCard
            key={t.name}
            table={t}
            selected={selectedTable === t.name}
            onClick={() => onSelect(t.name)}
          />
        ))}
      </div>
    </section>
  );
}

function TableCard({ table, selected, onClick }: { table: TableSpec; selected: boolean; onClick: () => void }) {
  const fkCount = table.fk.length;
  const incomingCount = table.incoming.length;
  const looseCount = table.loose?.length ?? 0;
  return (
    <button
      onClick={onClick}
      className={cn(
        "text-left rounded-lg border p-2.5 bg-card hover:bg-muted/30 transition-all",
        selected ? "ring-2 ring-primary shadow-sm" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs font-semibold truncate">{table.name}</span>
        <ChevronRight className="h-3 w-3 text-muted-foreground" />
      </div>
      <div className="mt-1 flex gap-2 text-[10px] text-muted-foreground">
        <span title="Outbound FK">→ {fkCount}</span>
        <span title="Incoming FK">← {incomingCount}</span>
        {looseCount > 0 && (
          <span className="text-yellow-700" title="Loose string IDs">
            ⚠ {looseCount}
          </span>
        )}
      </div>
    </button>
  );
}

function TableDetail({
  table, allTables, onNavigate,
}: {
  table: TableSpec | null;
  allTables: TableSpec[];
  onNavigate: (name: string) => void;
}) {
  if (!table) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
        Klik tabel di kiri untuk lihat detail PK/FK
      </div>
    );
  }
  const colorClass = FEATURE_COLORS[table.feature] ?? "bg-muted border-border text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <header>
        <span className={cn("inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase", colorClass)}>{table.feature}</span>
        <h2 className="mt-1 font-mono text-base font-bold">{table.name}</h2>
      </header>

      <section>
        <h3 className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">Primary Key</h3>
        <div className="text-xs font-mono bg-muted/30 rounded px-2 py-1">
          _id : Id&lt;&quot;{table.name}&quot;&gt;
        </div>
      </section>

      {table.fk.length > 0 && (
        <section>
          <h3 className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">
            Foreign Keys ({table.fk.length}) →
          </h3>
          <ul className="space-y-1">
            {table.fk.map((f) => (
              <li key={f.field} className="text-xs flex items-center gap-2 group">
                <code className="font-mono">{f.field}</code>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <button
                  onClick={() => allTables.find((t) => t.name === f.target) && onNavigate(f.target)}
                  className="font-mono text-primary hover:underline"
                  disabled={!allTables.find((t) => t.name === f.target)}
                >
                  {f.target}
                </button>
                {f.note && <span className="text-[10px] text-muted-foreground italic">({f.note})</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {table.incoming.length > 0 && (
        <section>
          <h3 className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">
            Incoming refs ({table.incoming.length}) ←
          </h3>
          <ul className="space-y-1 max-h-60 overflow-y-auto">
            {table.incoming.map((r, i) => (
              <li key={i} className="text-xs flex items-center gap-2">
                <button
                  onClick={() => onNavigate(r.from)}
                  className="font-mono text-primary hover:underline"
                >
                  {r.from}
                </button>
                <span className="text-muted-foreground">.{r.field}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {table.denormalized && table.denormalized.length > 0 && (
        <section>
          <h3 className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-1">
            Denormalized
          </h3>
          <div className="flex flex-wrap gap-1">
            {table.denormalized.map((f) => (
              <code key={f} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted">{f}</code>
            ))}
          </div>
        </section>
      )}

      {table.loose && table.loose.length > 0 && (
        <section className="rounded border border-yellow-200 bg-yellow-50 p-2">
          <h3 className="text-[10px] uppercase font-semibold text-yellow-900 tracking-wider mb-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Loose (string-typed) — by design
          </h3>
          <ul className="space-y-1">
            {table.loose.map((l) => (
              <li key={l.field} className="text-xs">
                <code className="font-mono text-yellow-900">{l.field}</code>
                <span className="text-yellow-800 italic"> — {l.reason}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
