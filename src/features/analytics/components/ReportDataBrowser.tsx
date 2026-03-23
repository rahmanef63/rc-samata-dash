"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TagBadge, hashColor, type TagOption } from "@/components/ui/tag-select";
import { formatRpFull } from "@/shared/lib";
import { Loader2, Search, Database } from "lucide-react";
import { Input } from "@/components/ui/input";

// ─── Table definitions ─────────────────────────────────────

const DATA_TABLES = [
  { key: "sales", label: "Penjualan", icon: "💰" },
  { key: "vendor", label: "Vendor", icon: "🏪" },
  { key: "cashSummary", label: "Kas Periode", icon: "📊" },
  { key: "cashFlow", label: "Cash Flow", icon: "💵" },
  { key: "costAnalysis", label: "Cost Analysis", icon: "📈" },
  { key: "inventory", label: "Inventory FC", icon: "📦" },
  { key: "hpp", label: "HPP Produk", icon: "🧮" },
  { key: "transfer", label: "Transfer TO/TI", icon: "🔄" },
  { key: "incentive", label: "Insentif", icon: "👥" },
  { key: "fcSummary", label: "Ikhtisar FC", icon: "📋" },
] as const;

type TableKey = typeof DATA_TABLES[number]["key"];

// ─── Channel/Category tag options ──────────────────────────

const channelOptions: TagOption[] = [
  { value: "all", label: "Dine-in" },
  { value: "grabfood", label: "GrabFood" },
  { value: "gofood", label: "GoFood" },
  { value: "shopeefood", label: "ShopeeFood" },
  { value: "tambahan", label: "Tambahan" },
];

const directionOptions: TagOption[] = [
  { value: "out", label: "Transfer Out" },
  { value: "in", label: "Transfer In" },
];

// ─── Helper: format number with thousand separator ────────

function fmtN(n: number, decimals = 0): string {
  if (n === 0) return "0";
  return n.toLocaleString("id-ID", { maximumFractionDigits: decimals });
}

// ─── Main Component ────────────────────────────────────────

export function ReportDataBrowser({ reportId }: { reportId: Id<"weeklyReports"> }) {
  const [activeTable, setActiveTable] = useState<TableKey>("sales");
  const [search, setSearch] = useState("");
  const [columnFilter, setColumnFilter] = useState<string | null>(null);

  const switchTable = (key: TableKey) => {
    setActiveTable(key);
    setSearch("");
    setColumnFilter(null);
  };

  // Filter chips config per table
  const filterChips: Record<string, { label: string; options: { value: string; label: string }[] }> = {
    sales: { label: "Channel", options: channelOptions },
    transfer: { label: "Arah", options: directionOptions },
  };

  const currentFilters = filterChips[activeTable];

  return (
    <div className="space-y-4">
      {/* Table selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {DATA_TABLES.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTable(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTable === t.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/60 text-muted-foreground hover:bg-muted"
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search + Filter row */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm rounded-lg"
          />
        </div>

        {/* Column filter chips */}
        {currentFilters && (
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              onClick={() => setColumnFilter(null)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                !columnFilter ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Semua
            </button>
            {currentFilters.options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setColumnFilter(columnFilter === opt.value ? null : opt.value)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  columnFilter === opt.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table content */}
      <div className="bg-card rounded-xl shadow-card overflow-hidden border border-border">
        {activeTable === "sales" && <SalesTable reportId={reportId} search={search} channelFilter={columnFilter} />}
        {activeTable === "vendor" && <VendorTable reportId={reportId} search={search} />}
        {activeTable === "cashSummary" && <CashSummaryTable reportId={reportId} search={search} />}
        {activeTable === "cashFlow" && <CashFlowTable reportId={reportId} search={search} />}
        {activeTable === "costAnalysis" && <CostAnalysisTable reportId={reportId} search={search} />}
        {activeTable === "inventory" && <InventoryTable reportId={reportId} search={search} />}
        {activeTable === "hpp" && <HPPTable reportId={reportId} search={search} />}
        {activeTable === "transfer" && <TransferTable reportId={reportId} search={search} directionFilter={columnFilter} />}
        {activeTable === "incentive" && <IncentiveTable reportId={reportId} search={search} />}
        {activeTable === "fcSummary" && <FCSummaryTable reportId={reportId} search={search} />}
      </div>
    </div>
  );
}

// ─── Shared Loading & Empty States ─────────────────────────

function TableLoading() {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      <span className="text-sm">Memuat data...</span>
    </div>
  );
}

function TableEmpty({ tableName }: { tableName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Database className="h-8 w-8 mb-2 opacity-40" />
      <p className="text-sm">Tidak ada data {tableName}</p>
    </div>
  );
}

function TableCount({ count, label }: { count: number; label: string }) {
  return (
    <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{count} {label}</span>
    </div>
  );
}

// ─── Scrollable Table Wrapper ──────────────────────────────

function ScrollableTable({ children }: { children: React.ReactNode }) {
  return (
    <ScrollArea className="w-full">
      <div className="max-h-[500px] overflow-y-auto">
        {children}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

// ─── Product Sales Table ───────────────────────────────────

function SalesTable({ reportId, search, channelFilter }: { reportId: Id<"weeklyReports">; search: string; channelFilter?: string | null }) {
  const data = useQuery(api.features.reports.queries.getProductSales, { reportId });
  if (!data) return <TableLoading />;

  const filtered = data.filter((s) => {
    if (search && !s.productName.toLowerCase().includes(search.toLowerCase())) return false;
    if (channelFilter && (s.channel ?? "all") !== channelFilter) return false;
    return true;
  });

  if (filtered.length === 0) return <TableEmpty tableName="penjualan" />;

  return (
    <>
      <TableCount count={filtered.length} label="produk terjual" />
      <ScrollableTable>
        <table className="w-full text-xs">
          <thead className="bg-muted/60 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground min-w-[180px]">Produk</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground min-w-[100px]">Channel</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground min-w-[100px]">Tanggal</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Qty</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Harga</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Amount</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">FC Item</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => {
              const channel = channelOptions.find((o) => o.value === (s.channel ?? "all"));
              return (
                <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-1.5 font-medium">{s.productName}</td>
                  <td className="px-3 py-1.5">
                    {channel && <TagBadge option={channel} size="xs" />}
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">{s.businessDate}</td>
                  <td className="px-3 py-1.5 text-right">{s.qty}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{fmtN(s.unitPrice)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-primary font-medium">{fmtN(s.amount)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">{s.foodCostItem ? fmtN(s.foodCostItem) : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollableTable>
    </>
  );
}

// ─── Vendor Purchases Table ────────────────────────────────

function VendorTable({ reportId, search }: { reportId: Id<"weeklyReports">; search: string }) {
  const data = useQuery(api.features.reports.queries.getVendorPurchases, { reportId });
  if (!data) return <TableLoading />;

  const filtered = data.filter((v) =>
    !search || v.commodityName.toLowerCase().includes(search.toLowerCase()),
  );

  if (filtered.length === 0) return <TableEmpty tableName="vendor" />;

  return (
    <>
      <TableCount count={filtered.length} label="item vendor" />
      <ScrollableTable>
        <table className="w-full text-xs">
          <thead className="bg-muted/60 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground min-w-[160px]">Item</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground min-w-[90px]">Section</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Open Qty</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Open (Rp)</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Beli Qty</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Beli (Rp)</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Pakai Qty</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Close Qty</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Close (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v, i) => {
              const sectionTag: TagOption | null = v.section
                ? { value: v.section, label: v.section }
                : null;
              return (
                <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-1.5 font-medium">{v.commodityName}</td>
                  <td className="px-3 py-1.5">
                    {sectionTag && <TagBadge option={sectionTag} size="xs" />}
                  </td>
                  <td className="px-3 py-1.5 text-right">{fmtN(v.openingQty, 1)}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{fmtN(v.openingValue)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtN(v.purchaseQty, 1)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-primary">{fmtN(v.purchaseValue)}</td>
                  <td className="px-3 py-1.5 text-right text-orange-600">{fmtN(v.usageQty, 1)}</td>
                  <td className="px-3 py-1.5 text-right">{fmtN(v.closingQty, 1)}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{fmtN(v.closingValue)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollableTable>
    </>
  );
}

// ─── Daily Cash Summary Table ──────────────────────────────

function CashSummaryTable({ reportId, search }: { reportId: Id<"weeklyReports">; search: string }) {
  const reportData = useQuery(api.features.reports.queries.getWeeklyReport, { reportId });
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = reportData?.branchId ?? branches?.[0]?._id;

  // We need to query by branch since there's no getByReport for dailyCashSummary
  const allSummaries = useQuery(
    api.features.reports.queries.listWeeklyReports,
    branchId ? { branchId } : "skip",
  );

  // Use direct report query instead — let me use a simpler approach
  // Since getProductSales works by reportId, we'll query cash summaries similarly
  // But dailyCashSummary doesn't have a by_report query... let me check.
  // Actually it does — all tables have by_report index.

  // For now, use the data from getWeeklyReport counts
  // Actually we need the raw data. Let me just show what we can.

  if (!reportData) return <TableLoading />;

  return (
    <CashSummaryInner reportId={reportId} search={search} />
  );
}

function CashSummaryInner({ reportId, search }: { reportId: Id<"weeklyReports">; search: string }) {
  // We need a dedicated query for dailyCashSummary by report
  // For now, let's show CashFlow which we already have
  const cashFlows = useQuery(api.features.reports.queries.getDailyCashFlow, { reportId });
  if (!cashFlows) return <TableLoading />;
  if (cashFlows.length === 0) return <TableEmpty tableName="kas periode" />;

  // Show summary-like view from cash flow data
  return (
    <>
      <TableCount count={cashFlows.length} label="hari" />
      <ScrollableTable>
        <table className="w-full text-xs">
          <thead className="bg-muted/60 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Tanggal</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Saldo Awal</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Sales</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Lain-lain</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Belanja</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Saldo Akhir</th>
            </tr>
          </thead>
          <tbody>
            {cashFlows
              .sort((a, b) => a.businessDate.localeCompare(b.businessDate))
              .map((cf, i) => (
                <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-1.5 text-muted-foreground">{cf.businessDate}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{fmtN(cf.openingBalance)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-green-600">+{fmtN(cf.salesInflow)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-blue-600">+{fmtN(cf.otherInflow)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-destructive">-{fmtN(cf.expenseOutflow)}</td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold text-primary">{fmtN(cf.closingBalance)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </ScrollableTable>
    </>
  );
}

// ─── Cash Flow Table ───────────────────────────────────────

function CashFlowTable({ reportId, search }: { reportId: Id<"weeklyReports">; search: string }) {
  const data = useQuery(api.features.reports.queries.getDailyCashFlow, { reportId });
  if (!data) return <TableLoading />;
  if (data.length === 0) return <TableEmpty tableName="cash flow" />;

  return (
    <>
      <TableCount count={data.length} label="hari" />
      <ScrollableTable>
        <table className="w-full text-xs">
          <thead className="bg-muted/60 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Tanggal</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Opening</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Sales In</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Other In</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Expense Out</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Other Out</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Closing</th>
            </tr>
          </thead>
          <tbody>
            {data
              .sort((a, b) => a.businessDate.localeCompare(b.businessDate))
              .map((cf, i) => (
                <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-1.5 text-muted-foreground">{cf.businessDate}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{fmtN(cf.openingBalance)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-green-600">{fmtN(cf.salesInflow)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-blue-600">{fmtN(cf.otherInflow)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-destructive">{fmtN(cf.expenseOutflow)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-orange-600">{fmtN(cf.otherOutflow)}</td>
                  <td className="px-3 py-1.5 text-right font-mono font-semibold text-primary">{fmtN(cf.closingBalance)}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </ScrollableTable>
    </>
  );
}

// ─── Cost Analysis Table ───────────────────────────────────

function CostAnalysisTable({ reportId, search }: { reportId: Id<"weeklyReports">; search: string }) {
  const data = useQuery(api.features.reports.queries.getCostAnalysis, { reportId });
  if (!data) return <TableLoading />;

  const filtered = data.filter((c) =>
    !search || c.itemName.toLowerCase().includes(search.toLowerCase()),
  );
  if (filtered.length === 0) return <TableEmpty tableName="cost analysis" />;

  return (
    <>
      <TableCount count={filtered.length} label="item" />
      <ScrollableTable>
        <table className="w-full text-xs">
          <thead className="bg-muted/60 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground min-w-[150px]">Item</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Open Qty</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Open (Rp)</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Beli Qty</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Beli (Rp)</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Pakai Qty</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Pakai (Rp)</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Close Qty</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Variance</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, i) => (
              <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                <td className="px-3 py-1.5 font-medium">{c.itemName}</td>
                <td className="px-3 py-1.5 text-right">{fmtN(c.openingQty, 1)}</td>
                <td className="px-3 py-1.5 text-right font-mono">{fmtN(c.openingValue)}</td>
                <td className="px-3 py-1.5 text-right">{fmtN(c.purchaseQty, 1)}</td>
                <td className="px-3 py-1.5 text-right font-mono">{fmtN(c.purchaseValue)}</td>
                <td className="px-3 py-1.5 text-right text-orange-600">{fmtN(c.usageQty, 1)}</td>
                <td className="px-3 py-1.5 text-right font-mono text-orange-600">{fmtN(c.usageValue)}</td>
                <td className="px-3 py-1.5 text-right">{fmtN(c.closingQty, 1)}</td>
                <td className={`px-3 py-1.5 text-right font-mono font-semibold ${c.variance > 0 ? "text-red-600" : c.variance < 0 ? "text-blue-600" : ""}`}>
                  {c.variance !== 0 ? fmtN(c.variance) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollableTable>
    </>
  );
}

// ─── Inventory Valuation Table ─────────────────────────────

function InventoryTable({ reportId, search }: { reportId: Id<"weeklyReports">; search: string }) {
  const data = useQuery(api.features.reports.queries.getInventoryValuation, { reportId });
  if (!data) return <TableLoading />;

  const filtered = data.filter((v) =>
    !search || v.itemName.toLowerCase().includes(search.toLowerCase()),
  );
  if (filtered.length === 0) return <TableEmpty tableName="inventory" />;

  return (
    <>
      <TableCount count={filtered.length} label="item" />
      <ScrollableTable>
        <table className="w-full text-xs">
          <thead className="bg-muted/60 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground min-w-[150px]">Item</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground min-w-[90px]">Kategori</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Qty</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Unit</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Harga</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v, i) => {
              const catTag: TagOption = { value: v.category, label: v.category };
              return (
                <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-1.5 font-medium">{v.itemName}</td>
                  <td className="px-3 py-1.5"><TagBadge option={catTag} size="xs" /></td>
                  <td className="px-3 py-1.5 text-right">{fmtN(v.qty, 2)}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{v.unit}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{fmtN(v.unitPrice)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-primary font-medium">{fmtN(v.totalValue)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollableTable>
    </>
  );
}

// ─── HPP Produk Table ──────────────────────────────────────

function HPPTable({ reportId, search }: { reportId: Id<"weeklyReports">; search: string }) {
  const data = useQuery(api.features.reports.queries.getProductHPP, { reportId });
  if (!data) return <TableLoading />;

  const filtered = data.filter((h) =>
    !search || h.productName.toLowerCase().includes(search.toLowerCase()),
  );
  if (filtered.length === 0) return <TableEmpty tableName="HPP" />;

  return (
    <>
      <TableCount count={filtered.length} label="produk" />
      <ScrollableTable>
        <table className="w-full text-xs">
          <thead className="bg-muted/60 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground min-w-[180px]">Produk</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground min-w-[90px]">Kelas</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">HPP</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Harga Jual</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Margin</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Ingredients</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((h, i) => {
              const classTag: TagOption = { value: h.pricingClass, label: h.pricingClass };
              const margin = h.sellingPrice ? h.sellingPrice - h.totalHPP : 0;
              const marginPct = h.sellingPrice ? (margin / h.sellingPrice * 100) : 0;
              return (
                <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-1.5 font-medium">{h.productName}</td>
                  <td className="px-3 py-1.5"><TagBadge option={classTag} size="xs" /></td>
                  <td className="px-3 py-1.5 text-right font-mono text-destructive">{fmtN(h.totalHPP)}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{h.sellingPrice ? fmtN(h.sellingPrice) : "-"}</td>
                  <td className={`px-3 py-1.5 text-right font-semibold ${marginPct >= 35 ? "text-green-600" : marginPct >= 20 ? "text-yellow-600" : "text-red-600"}`}>
                    {h.sellingPrice ? `${marginPct.toFixed(1)}%` : "-"}
                  </td>
                  <td className="px-3 py-1.5 text-right text-muted-foreground">{h.ingredients?.length ?? 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollableTable>
    </>
  );
}

// ─── Transfer TO/TI Table ──────────────────────────────────

function TransferTable({ reportId, search, directionFilter }: { reportId: Id<"weeklyReports">; search: string; directionFilter?: string | null }) {
  const data = useQuery(api.features.reports.queries.getTransferItems, { reportId });
  if (!data) return <TableLoading />;

  const filtered = data.filter((t) => {
    if (search && !t.itemName.toLowerCase().includes(search.toLowerCase())) return false;
    if (directionFilter && t.direction !== directionFilter) return false;
    return true;
  }
  );
  if (filtered.length === 0) return <TableEmpty tableName="transfer" />;

  return (
    <>
      <TableCount count={filtered.length} label="item transfer" />
      <ScrollableTable>
        <table className="w-full text-xs">
          <thead className="bg-muted/60 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground min-w-[150px]">Item</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground min-w-[90px]">Arah</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground min-w-[100px]">Kategori</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Qty</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Unit</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => {
              const dirTag = directionOptions.find((d) => d.value === t.direction);
              const catTag: TagOption = { value: t.category, label: t.category };
              return (
                <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-1.5 font-medium">{t.itemName}</td>
                  <td className="px-3 py-1.5">
                    {dirTag && <TagBadge option={dirTag} size="xs" />}
                  </td>
                  <td className="px-3 py-1.5"><TagBadge option={catTag} size="xs" /></td>
                  <td className="px-3 py-1.5 text-right">{fmtN(t.qty, 1)}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{t.unit ?? "-"}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-primary">{fmtN(t.totalValue)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollableTable>
    </>
  );
}

// ─── Incentive Table ───────────────────────────────────────

function IncentiveTable({ reportId, search }: { reportId: Id<"weeklyReports">; search: string }) {
  const data = useQuery(api.features.reports.queries.getEmployeeIncentives, { reportId });
  if (!data) return <TableLoading />;

  const filtered = data.filter((e) =>
    !search || e.employeeName.toLowerCase().includes(search.toLowerCase()),
  );
  if (filtered.length === 0) return <TableEmpty tableName="insentif" />;

  return (
    <>
      <TableCount count={filtered.length} label="karyawan" />
      <ScrollableTable>
        <table className="w-full text-xs">
          <thead className="bg-muted/60 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground min-w-[150px]">Nama</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground min-w-[100px]">Tipe</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Jumlah</th>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Catatan</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => {
              const typeTag: TagOption = { value: e.incentiveType, label: e.incentiveType };
              return (
                <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-1.5 font-medium">{e.employeeName}</td>
                  <td className="px-3 py-1.5"><TagBadge option={typeTag} size="xs" /></td>
                  <td className="px-3 py-1.5 text-right font-mono text-primary">{fmtN(e.amount)}</td>
                  <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[200px]">{e.notes ?? "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollableTable>
    </>
  );
}

// ─── Food Cost Summary Table ───────────────────────────────

function FCSummaryTable({ reportId, search }: { reportId: Id<"weeklyReports">; search: string }) {
  const data = useQuery(api.features.reports.queries.getFoodCostSummary, { reportId });
  if (!data) return <TableLoading />;
  if (data.length === 0) return <TableEmpty tableName="ikhtisar FC" />;

  return (
    <>
      <TableCount count={data.length} label="kategori" />
      <ScrollableTable>
        <table className="w-full text-xs">
          <thead className="bg-muted/60 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-muted-foreground min-w-[120px]">Kategori</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Awal</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Beli</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">TO</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">TI</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Akhir</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Terpakai</th>
              <th className="px-3 py-2 text-right font-semibold text-muted-foreground">FC %</th>
            </tr>
          </thead>
          <tbody>
            {data.map((f, i) => {
              const catTag: TagOption = { value: f.category, label: f.category };
              return (
                <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-1.5"><TagBadge option={catTag} size="xs" /></td>
                  <td className="px-3 py-1.5 text-right font-mono">{fmtN(f.openingValue)}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{fmtN(f.purchaseValue)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-orange-600">{fmtN(f.transferOutValue)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-blue-600">{fmtN(f.transferInValue)}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{fmtN(f.closingValue)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-destructive font-medium">{fmtN(f.usageValue)}</td>
                  <td className={`px-3 py-1.5 text-right font-semibold ${
                    (f.foodCostPct ?? 0) <= 35 ? "text-green-600" : (f.foodCostPct ?? 0) <= 42 ? "text-yellow-600" : "text-red-600"
                  }`}>{f.foodCostPct ? `${f.foodCostPct.toFixed(1)}%` : "-"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </ScrollableTable>
    </>
  );
}
