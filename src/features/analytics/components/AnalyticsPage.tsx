"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { KpiCard } from "@/components/ui/kpi-card";
import { formatDateRange, formatRpFull } from "@/shared/lib";
import { AreaChartCard } from "@/shared/components/AreaChartCard";
import {
  DollarSign, TrendingDown, Percent, AlertTriangle,
  Users, Target, ShoppingCart, Trash2, Loader2, Gauge, Settings2,
} from "lucide-react";
import { useMutation } from "convex/react";
import { ReportDataBrowser } from "./ReportDataBrowser";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

const TABS = ["Ikhtisar", "KPI", "Penjelajah Data", "Profitabilitas", "Efisiensi Beli", "Pemborosan", "Arus Kas"] as const;
type Tab = typeof TABS[number];

// Helper: filter out rows where itemName looks like a raw number (BUG-02)
function isValidItemName(name: string): boolean {
  if (!name || name.trim() === "") return false;
  // Filter pure numeric strings or decimals that slipped through parsing
  return isNaN(Number(name.trim()));
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Ikhtisar");
  const [manualSelectedReportId, setManualSelectedReportId] = useState<Id<"weeklyReports"> | "all" | null>(null);
  const [timeFilter, setTimeFilter] = useState<string>("all");
  const searchParams = useSearchParams();

  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  const reports = useQuery(
    api.features.reports.queries.listWeeklyReports,
    branchId ? { branchId } : "skip"
  );
  const reportFromQuery = searchParams.get("report");
  const querySelectedReportId =
    reportFromQuery && reports?.some((report) => report._id === reportFromQuery)
      ? (reportFromQuery as Id<"weeklyReports">)
      : null;
  const selectedReportId = manualSelectedReportId ?? querySelectedReportId;

  // Auto-select first report if not 'all'
  const reportId = selectedReportId ?? reports?.[0]?._id ?? null;
  const isAll = selectedReportId === "all";

  const queryArgs = isAll
    ? { reportId: "all" as const, branchId, timeFilter }
    : reportId
    ? { reportId, branchId, timeFilter }
    : "skip";

  return (
    <div className="max-w-[1200px] mx-auto p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Analisis Laporan</h1>
          <p className="text-sm text-muted-foreground">Profitabilitas, efisiensi pembelian, waste, dan arus kas</p>
        </div>
        {/* Filters */}
        <div className="flex items-center gap-2">
          {selectedReportId === "all" && (
            <select
              className="px-3 py-2 rounded-xl border border-border bg-card text-sm"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
            >
              <option value="all">Semua Waktu</option>
              <option value="daily">Harian / Hari Ini</option>
              <option value="weekly">Mingguan / Minggu Ini</option>
              <option value="monthly">Bulanan / Bulan Ini</option>
              <option value="quarterly">Kuartal Ini</option>
            </select>
          )}

            <select
              className="px-3 py-2 rounded-xl border border-border bg-card text-sm max-w-[300px]"
              value={selectedReportId ?? reports?.[0]?._id ?? ""}
              onChange={(e) => setManualSelectedReportId(e.target.value as Id<"weeklyReports"> | "all")}
            >
            {!reports && <option>Memuat...</option>}
            {reports?.length === 0 && <option>Belum ada laporan</option>}
            <option value="all">Semua Laporan</option>
            {reports?.map((r) => (
              <option key={r._id} value={r._id}>
                {r.fileName} ({formatDateRange(r.periodStart, r.periodEnd)})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      {queryArgs === "skip" ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Upload laporan terlebih dahulu di halaman Upload Laporan</p>
        </div>
      ) : (
        <>
          {activeTab === "Ikhtisar" && <OverviewTab args={queryArgs} />}
          {activeTab === "KPI" && <KPITab args={queryArgs} />}
          {activeTab === "Penjelajah Data" && (isAll ? <div className="p-8 text-center text-muted-foreground bg-card rounded-2xl border">Penjelajah Data tidak tersedia untuk mode &quot;Semua Laporan&quot;. Pilih satu laporan spesifik.</div> : <ReportDataBrowser reportId={reportId as any} />)}
          {activeTab === "Profitabilitas" && <ProfitabilityTab args={queryArgs} />}
          {activeTab === "Efisiensi Beli" && <PurchaseTab args={queryArgs} />}
          {activeTab === "Pemborosan" && <WasteTab args={queryArgs} />}
          {activeTab === "Arus Kas" && <CashFlowTab args={queryArgs} />}
        </>
      )}
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      <span className="text-sm">Menghitung analisis...</span>
    </div>
  );
}

// ─── Overview Tab ────────────────────────────────────────────

function OverviewTab({ args }: { args: any }) {
  const overview = useQuery(api.features.reports.analytics.getAnalyticsOverview, args);
  const priority = useQuery(api.features.reports.analytics.getPriorityItems, args);

  if (!overview) return <LoadingSkeleton />;

  const kpis = [
    { icon: DollarSign, label: "Total Omzet", value: formatRpFull(overview.totalRevenue), badge: `${overview.productCount} produk`, badgeColor: "success" as const, tooltip: "Total pendapatan dari semua penjualan dalam periode ini" },
    { icon: ShoppingCart, label: "Total Biaya Bahan", value: formatRpFull(overview.totalCOGS), badge: undefined, badgeColor: "warning" as const, tooltip: "Harga Pokok Penjualan (COGS) — total biaya produksi" },
    { icon: Percent, label: "Margin Kotor", value: `${overview.grossMarginPct}%`, badge: overview.grossMarginPct >= 35 ? "Sehat" : "Perlu perhatian", badgeColor: overview.grossMarginPct >= 35 ? "success" as const : "destructive" as const, tooltip: "Persentase laba kotor dari total omzet. Target: ≥35%" },
    { icon: TrendingDown, label: "Food Cost %", value: `${overview.foodCostPct}%`, badge: overview.foodCostPct <= 40 ? "OK" : "Tinggi!", badgeColor: overview.foodCostPct <= 40 ? "success" as const : "destructive" as const, tooltip: "Persentase biaya bahan makanan terhadap omzet. Target: ≤40%" },
    { icon: Trash2, label: "Estimasi Biaya Pemborosan", value: formatRpFull(overview.totalWasteCost), badge: `${overview.wasteItemCount} item`, badgeColor: "destructive" as const, tooltip: "Estimasi kerugian akibat pemborosan bahan" },
    { icon: Target, label: "Capaian Target", value: `${overview.avgAchievement}%`, badge: overview.avgAchievement >= 100 ? "Tercapai" : "Di bawah target", badgeColor: overview.avgAchievement >= 100 ? "success" as const : "warning" as const, tooltip: "Rata-rata capaian target penjualan dalam periode ini" },
    { icon: Users, label: "Total Pelanggan", value: overview.totalCustomers.toLocaleString(), badge: undefined, badgeColor: "primary" as const, tooltip: "Estimasi jumlah transaksi / pelanggan terlayani" },
    { icon: DollarSign, label: "Rata-rata Belanja", value: formatRpFull(overview.avgSpendingPower), badge: undefined, badgeColor: "primary" as const, tooltip: "Rata-rata nilai belanja per pelanggan (spending power)" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="relative group">
            <KpiCard icon={<kpi.icon className="h-5 w-5 text-primary" />} label={kpi.label} value={kpi.value} badge={kpi.badge} badgeColor={kpi.badgeColor} />
            {kpi.tooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-popover border border-border text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 w-48 text-center">
                {kpi.tooltip}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Priority Items */}
      {priority && priority.length > 0 && (
        <div className="bg-card rounded-xl shadow-card p-4">
          <h3 className="text-sm font-semibold mb-3">Item Prioritas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/60">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Item</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Pemborosan</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Margin</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Beli</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Variance</th>
                  <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Prioritas</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {priority
                  .filter((item) => isValidItemName(item.itemName))
                  .slice(0, 15)
                  .map((item, i) => (
                  <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                    <td className="px-3 py-1.5 font-medium">{item.itemName}</td>
                    <td className="px-3 py-1.5 text-right">{Math.round(item.wasteScore)}</td>
                    <td className="px-3 py-1.5 text-right">{Math.round(item.marginScore)}</td>
                    <td className="px-3 py-1.5 text-right">{Math.round(item.overPurchaseScore)}</td>
                    <td className="px-3 py-1.5 text-right">{Math.round(item.varianceScore)}</td>
                    <td className="px-3 py-1.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        item.priority === "critical" ? "bg-red-100 text-red-700" :
                        item.priority === "high" ? "bg-orange-100 text-orange-700" :
                        item.priority === "medium" ? "bg-yellow-100 text-yellow-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {item.priority === "critical" ? "KRITIS" : item.priority === "high" ? "TINGGI" : item.priority === "medium" ? "SEDANG" : "RENDAH"}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">{item.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Profitability Tab ───────────────────────────────────────

function ProfitabilityTab({ args }: { args: any }) {
  const data = useQuery(api.features.reports.analytics.getProductProfitability, args);
  const [classFilter, setClassFilter] = useState<string>("all");

  if (!data) return <LoadingSkeleton />;

  const filtered = classFilter === "all" ? data : data.filter((d) => d.pricingClass === classFilter);

  const avgMargin = filtered.length > 0
    ? filtered.reduce((s, d) => s + d.marginPct, 0) / filtered.length
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          className="px-3 py-1.5 rounded-lg border border-border bg-card text-xs"
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
        >
          <option value="all">Semua Kelas</option>
          <option value="standard">Standard</option>
          <option value="kelas2">Kelas 2</option>
          <option value="kelas3a">Kelas 3A</option>
          <option value="kelas3b">Kelas 3B</option>
          <option value="kelas4">Kelas 4</option>
        </select>
        <span className="text-xs text-muted-foreground">
          {filtered.length} produk · Avg margin: <span className={avgMargin >= 35 ? "text-green-600 font-semibold" : avgMargin >= 20 ? "text-yellow-600 font-semibold" : "text-red-600 font-semibold"}>{avgMargin.toFixed(1)}%</span>
        </span>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Produk</th>
                <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Kelas</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">HPP</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Harga Jual</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Margin Rp</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Margin %</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Qty Terjual</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Total Profit</th>
                <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => (
                <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-1.5 font-medium">{item.productName}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{item.pricingClass}</span>
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-destructive">{formatRpFull(item.totalHPP)}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{item.sellingPrice > 0 ? formatRpFull(item.sellingPrice) : "-"}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{item.marginRp > 0 ? formatRpFull(item.marginRp) : "-"}</td>
                  <td className={`px-3 py-1.5 text-right font-semibold ${
                    item.status === "good" ? "text-green-600" : item.status === "warning" ? "text-yellow-600" : "text-red-600"
                  }`}>{item.marginPct}%</td>
                  <td className="px-3 py-1.5 text-right">{item.totalQtySold > 0 ? item.totalQtySold : "-"}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-primary">{item.totalProfit !== 0 ? formatRpFull(item.totalProfit) : "-"}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      item.status === "good" ? "bg-green-100 text-green-700" :
                      item.status === "warning" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                    }`}>{item.status === "good" ? "SEHAT" : item.status === "warning" ? "PERHATIAN" : "BAHAYA"}</span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">Tidak ada data HPP</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Purchase Efficiency Tab ─────────────────────────────────

function PurchaseTab({ args }: { args: any }) {
  const data = useQuery(api.features.reports.analytics.getPurchaseEfficiency, args);

  if (!data) return <LoadingSkeleton />;

  const overCount = data.filter((d) => d.status === "over").length;
  const totalOverCost = data.reduce((s, d) => s + d.overPurchaseCost, 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Total: {data.length} item</span>
        <span className="text-red-600 font-medium">{overCount} over-purchase</span>
        <span>Est. kelebihan beli: <span className="text-destructive font-semibold">{formatRpFull(totalOverCost)}</span></span>
      </div>

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Item</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Beli Qty</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Pakai Qty</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Closing Qty</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Rasio</th>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Efisiensi</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Est. Over Cost</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, i) => (
                <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-1.5 font-medium">{item.itemName}</td>
                  <td className="px-3 py-1.5 text-right">{item.purchaseQty.toFixed(1)}</td>
                  <td className="px-3 py-1.5 text-right text-orange-600">{item.usageQty.toFixed(1)}</td>
                  <td className="px-3 py-1.5 text-right">{item.closingQty.toFixed(1)}</td>
                  <td className={`px-3 py-1.5 text-right font-semibold ${
                    item.status === "over" ? "text-red-600" : item.status === "under" ? "text-blue-600" : "text-green-600"
                  }`}>{item.ratio.toFixed(2)}x</td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.status === "over" ? "bg-red-500" : item.status === "under" ? "bg-blue-500" : "bg-green-500"
                          }`}
                          style={{ width: `${Math.min(item.ratio * 50, 100)}%` }}
                        />
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        item.status === "over" ? "bg-red-100 text-red-700" :
                        item.status === "under" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                      }`}>{item.status === "over" ? "OVER" : item.status === "under" ? "UNDER" : "OK"}</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-destructive">
                    {item.overPurchaseCost > 0 ? formatRpFull(item.overPurchaseCost) : "-"}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Tidak ada data pembelian</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Waste Tab ───────────────────────────────────────────────

function WasteTab({ args }: { args: any }) {
  const data = useQuery(api.features.reports.analytics.getWasteAnalysis, args);

  if (!data) return <LoadingSkeleton />;

  const chartData = data.dailyTrend.map((d) => ({
    label: d.date.slice(5), // MM-DD
    value: d.totalCost,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-xl shadow-card p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{data.totalWasteQty}</p>
          <p className="text-[10px] text-muted-foreground">Total Unit Pemborosan</p>
        </div>
        <div className="bg-card rounded-xl shadow-card p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{formatRpFull(data.totalWasteCost)}</p>
          <p className="text-[10px] text-muted-foreground">Estimasi Biaya Pemborosan</p>
        </div>
        <div className="bg-card rounded-xl shadow-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{data.topWastedItems.length}</p>
          <p className="text-[10px] text-muted-foreground">Jenis Item</p>
        </div>
      </div>

      {chartData.length > 0 && (
        <AreaChartCard
          data={chartData}
          title="Tren Pemborosan Harian"
          subtitle="Estimasi biaya pemborosan per hari"
          tooltipLabel="Biaya Pemborosan"
          gradientId="wasteGrad"
          height={180}
        />
      )}

      {/* Top Wasted Items */}
      <div className="bg-card rounded-xl shadow-card p-4">
        <h3 className="text-sm font-semibold mb-3">Item Pemborosan Terbesar (berdasarkan biaya)</h3>
        <div className="space-y-2">
          {data.topWastedItems.slice(0, 10).map((item, i) => {
            const maxCost = data.topWastedItems[0]?.estimatedCost ?? 1;
            const pct = (item.estimatedCost / maxCost) * 100;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                <span className="text-xs font-medium w-28 truncate">{item.itemName}</span>
                <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-red-400" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-muted-foreground w-10 text-right">{item.totalQty}</span>
                <span className="text-xs font-mono text-destructive w-24 text-right">{formatRpFull(item.estimatedCost)}</span>
              </div>
            );
          })}
          {data.topWastedItems.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Tidak ada data waste</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── KPI Tab ────────────────────────────────────────────────

const KPI_ICONS: Record<string, typeof DollarSign> = {
  food_cost_pct: Percent,
  gross_margin_pct: TrendingDown,
  waste_pct: Trash2,
  sales_achievement_pct: Target,
  purchase_efficiency: ShoppingCart,
  cash_tight_days: DollarSign,
  labor_cost_pct: Users,
  variance_rate_pct: AlertTriangle,
  avg_spending_power: DollarSign,
  inventory_turnover: Gauge,
};

const STATUS_COLORS = {
  good: { bg: "bg-green-50 dark:bg-green-950/20", border: "border-green-200 dark:border-green-800", text: "text-green-700 dark:text-green-400", badge: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300", ring: "stroke-green-500", label: "SEHAT" },
  warning: { bg: "bg-yellow-50 dark:bg-yellow-950/20", border: "border-yellow-200 dark:border-yellow-800", text: "text-yellow-700 dark:text-yellow-400", badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300", ring: "stroke-yellow-500", label: "PERHATIAN" },
  danger: { bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-400", badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", ring: "stroke-red-500", label: "BAHAYA" },
};

function KPIGauge({ value, max, status }: { value: number; max: number; status: "good" | "warning" | "danger" }) {
  const pct = Math.min(value / max, 1);
  const r = 32;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - pct * 0.75); // 270° arc
  const colors = STATUS_COLORS[status];

  return (
    <svg viewBox="0 0 80 80" className="w-16 h-16">
      <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeLinecap="round" transform="rotate(135 40 40)" />
      <circle cx="40" cy="40" r={r} fill="none" strokeWidth="6" className={colors.ring} strokeDasharray={`${circ * 0.75} ${circ * 0.25}`} strokeDashoffset={dashOffset} strokeLinecap="round" transform="rotate(135 40 40)" />
      <text x="40" y="42" textAnchor="middle" className={`text-xs font-bold fill-current ${colors.text}`}>{value}</text>
    </svg>
  );
}

function formatKPIValue(value: number, unit: string): string {
  if (unit === "Rp") return `Rp ${value.toLocaleString("id-ID")}`;
  if (unit === "%") return `${value}%`;
  if (unit === "ratio") return `${value}x`;
  if (unit === "x") return `${value}x`;
  return `${value} ${unit}`;
}

function KPITab({ args }: { args: any }) {
  const data = useQuery(api.features.reports.kpiAnalytics.getKPIDashboard, args);
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  const seedTargets = useMutation(api.features.reports.kpiAnalytics.seedDefaultKPITargets);

  if (!data) return <LoadingSkeleton />;

  const { kpis, hasTargets } = data;
  const good = kpis.filter((k) => k.status === "good").length;
  const warning = kpis.filter((k) => k.status === "warning").length;
  const danger = kpis.filter((k) => k.status === "danger").length;

  const handleSeedTargets = async () => {
    if (!branchId) return;
    const result = await seedTargets({ branchId });
    if (result.seeded) toast.success(result.message);
    else toast.info(result.message);
  };

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="text-xs font-medium">{good} Sehat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="text-xs font-medium">{warning} Perhatian</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-xs font-medium">{danger} Bahaya</span>
          </div>
        </div>
        {!hasTargets && branchId && (
          <button
            onClick={handleSeedTargets}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Settings2 className="h-3 w-3" /> Atur Target Awal
          </button>
        )}
      </div>

      {/* Score Overview */}
      <div className="bg-card rounded-xl shadow-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Gauge className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Skor KPI Keseluruhan</h3>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className={`text-4xl font-bold ${
              good >= 7 ? "text-green-600" : good >= 5 ? "text-yellow-600" : "text-red-600"
            }`}>{good}/{kpis.length}</p>
            <p className="text-[10px] text-muted-foreground mt-1">KPI Sesuai Target</p>
          </div>
          <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden flex">
            {good > 0 && <div className="h-full bg-green-500" style={{ width: `${(good / kpis.length) * 100}%` }} />}
            {warning > 0 && <div className="h-full bg-yellow-500" style={{ width: `${(warning / kpis.length) * 100}%` }} />}
            {danger > 0 && <div className="h-full bg-red-500" style={{ width: `${(danger / kpis.length) * 100}%` }} />}
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map((kpi) => {
          const colors = STATUS_COLORS[kpi.status];
          const Icon = KPI_ICONS[kpi.kpiCode] ?? Gauge;
          const gaugeMax = kpi.direction === "lower_is_better"
            ? kpi.dangerThreshold * 1.2
            : kpi.target * 1.2;

          return (
            <div key={kpi.kpiCode} className={`rounded-xl p-4 border ${colors.bg} ${colors.border}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`h-4 w-4 ${colors.text}`} />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{kpi.kpiLabel}</p>
                  </div>
                  <p className={`text-2xl font-bold font-mono ${colors.text}`}>
                    {formatKPIValue(kpi.actual, kpi.unit)}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${colors.badge}`}>
                      {colors.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Target: {formatKPIValue(kpi.target, kpi.unit)}
                    </span>
                  </div>
                </div>
                <KPIGauge
                  value={kpi.actual}
                  max={gaugeMax}
                  status={kpi.status}
                />
              </div>

              {/* Target bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>{kpi.direction === "lower_is_better" ? "Semakin rendah semakin baik" : "Semakin tinggi semakin baik"}</span>
                  <span>
                    {formatKPIValue(kpi.dangerThreshold, kpi.unit)} — {formatKPIValue(kpi.warningThreshold, kpi.unit)} — {formatKPIValue(kpi.target, kpi.unit)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Danger items detail */}
      {danger > 0 && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">KPI Perlu Perhatian Segera</h3>
          </div>
          <div className="space-y-2">
            {kpis.filter((k) => k.status === "danger").map((kpi) => (
              <div key={kpi.kpiCode} className="flex items-center justify-between text-xs">
                <span className="font-medium">{kpi.kpiLabel}</span>
                <div className="flex items-center gap-3">
                  <span className="text-red-600 font-semibold font-mono">{formatKPIValue(kpi.actual, kpi.unit)}</span>
                  <span className="text-muted-foreground">target: {formatKPIValue(kpi.target, kpi.unit)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Cash Flow Tab ───────────────────────────────────────────

function CashFlowTab({ args }: { args: any }) {
  const data = useQuery(api.features.reports.analytics.getCashFlowSummary, args);

  if (!data) return <LoadingSkeleton />;

  const chartData = data.daily.map((d) => ({
    label: d.date.slice(5),
    value: d.closingBalance,
  }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl shadow-card p-4 text-center">
          <p className="text-xl font-bold text-green-600">{formatRpFull(data.totalInflow)}</p>
          <p className="text-[10px] text-muted-foreground">Total Masuk</p>
        </div>
        <div className="bg-card rounded-xl shadow-card p-4 text-center">
          <p className="text-xl font-bold text-destructive">{formatRpFull(data.totalOutflow)}</p>
          <p className="text-[10px] text-muted-foreground">Total Keluar</p>
        </div>
        <div className="bg-card rounded-xl shadow-card p-4 text-center">
          <p className={`text-xl font-bold ${data.netCashFlow >= 0 ? "text-green-600" : "text-destructive"}`}>
            {formatRpFull(data.netCashFlow)}
          </p>
          <p className="text-[10px] text-muted-foreground">Arus Kas Bersih</p>
        </div>
        <div className="bg-card rounded-xl shadow-card p-4 text-center">
          <p className="text-xl font-bold text-orange-600">{formatRpFull(data.totalCommissions)}</p>
          <p className="text-[10px] text-muted-foreground">Total Komisi</p>
        </div>
      </div>

      {data.tightDays > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800">
          <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
          <p className="text-xs text-yellow-700 dark:text-yellow-400">
            <strong>{data.tightDays} hari</strong> saldo di bawah Rp 500.000 (cash tight)
          </p>
        </div>
      )}

      {chartData.length > 0 && (
        <AreaChartCard
          data={chartData}
          title="Saldo Harian"
          subtitle="Saldo penutupan per hari"
          tooltipLabel="Saldo"
          gradientId="cashFlowGrad"
          height={220}
        />
      )}

      {/* Daily Details */}
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Tanggal</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Saldo Awal</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Penjualan</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Pengeluaran</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Komisi</th>
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Saldo Akhir</th>
              </tr>
            </thead>
            <tbody>
              {data.daily.map((d, i) => (
                <tr key={i} className={`border-t border-border/50 ${d.isTight ? "bg-red-50 dark:bg-red-950/10" : "hover:bg-muted/20"}`}>
                  <td className="px-3 py-1.5 text-muted-foreground">{d.date}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{formatRpFull(d.openingBalance)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-green-600">{formatRpFull(d.salesInflow)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-destructive">{formatRpFull(d.totalOutflow)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-orange-600">{formatRpFull(d.commissions)}</td>
                  <td className={`px-3 py-1.5 text-right font-mono font-semibold ${d.isTight ? "text-red-600" : "text-primary"}`}>
                    {formatRpFull(d.closingBalance)}
                  </td>
                </tr>
              ))}
              {data.daily.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Tidak ada data cash flow</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
