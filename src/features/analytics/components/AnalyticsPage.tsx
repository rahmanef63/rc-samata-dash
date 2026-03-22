"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { KpiCard } from "@/components/ui/kpi-card";
import { formatRpFull } from "@/shared/lib";
import { AreaChartCard } from "@/shared/components/AreaChartCard";
import {
  DollarSign, TrendingDown, Percent, AlertTriangle,
  Users, Target, ShoppingCart, Trash2, Loader2,
} from "lucide-react";

const TABS = ["Overview", "Profitabilitas", "Efisiensi Beli", "Waste", "Arus Kas"] as const;
type Tab = typeof TABS[number];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview");
  const [selectedReportId, setSelectedReportId] = useState<Id<"weeklyReports"> | null>(null);

  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  const reports = useQuery(
    api.features.reports.queries.listWeeklyReports,
    branchId ? { branchId } : "skip"
  );

  // Auto-select first report
  const reportId = selectedReportId ?? reports?.[0]?._id ?? null;

  return (
    <div className="max-w-[1200px] mx-auto p-4 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Analisis Laporan</h1>
          <p className="text-sm text-muted-foreground">Profitabilitas, efisiensi pembelian, waste, dan arus kas</p>
        </div>
        {/* Report Selector */}
        <select
          className="px-3 py-2 rounded-xl border border-border bg-card text-sm max-w-[300px]"
          value={reportId ?? ""}
          onChange={(e) => setSelectedReportId(e.target.value as Id<"weeklyReports">)}
        >
          {!reports && <option>Loading...</option>}
          {reports?.length === 0 && <option>Belum ada laporan</option>}
          {reports?.map((r) => (
            <option key={r._id} value={r._id}>
              {r.fileName} ({r.periodStart} → {r.periodEnd})
            </option>
          ))}
        </select>
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
      {!reportId ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Upload laporan terlebih dahulu di halaman Upload Laporan</p>
        </div>
      ) : (
        <>
          {activeTab === "Overview" && <OverviewTab reportId={reportId} />}
          {activeTab === "Profitabilitas" && <ProfitabilityTab reportId={reportId} />}
          {activeTab === "Efisiensi Beli" && <PurchaseTab reportId={reportId} />}
          {activeTab === "Waste" && <WasteTab reportId={reportId} />}
          {activeTab === "Arus Kas" && <CashFlowTab reportId={reportId} />}
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

function OverviewTab({ reportId }: { reportId: Id<"weeklyReports"> }) {
  const overview = useQuery(api.features.reports.analytics.getAnalyticsOverview, { reportId });
  const priority = useQuery(api.features.reports.analytics.getPriorityItems, { reportId });

  if (!overview) return <LoadingSkeleton />;

  const kpis = [
    { icon: DollarSign, label: "Total Revenue", value: formatRpFull(overview.totalRevenue), badge: `${overview.productCount} produk`, badgeColor: "success" as const },
    { icon: ShoppingCart, label: "Total COGS", value: formatRpFull(overview.totalCOGS), badge: undefined, badgeColor: "warning" as const },
    { icon: Percent, label: "Gross Margin", value: `${overview.grossMarginPct}%`, badge: overview.grossMarginPct >= 35 ? "Sehat" : "Perlu perhatian", badgeColor: overview.grossMarginPct >= 35 ? "success" as const : "destructive" as const },
    { icon: TrendingDown, label: "Food Cost %", value: `${overview.foodCostPct}%`, badge: overview.foodCostPct <= 40 ? "OK" : "Tinggi!", badgeColor: overview.foodCostPct <= 40 ? "success" as const : "destructive" as const },
    { icon: Trash2, label: "Waste Cost", value: formatRpFull(overview.totalWasteCost), badge: `${overview.wasteItemCount} record`, badgeColor: "destructive" as const },
    { icon: Target, label: "Capaian Target", value: `${overview.avgAchievement}%`, badge: overview.avgAchievement >= 100 ? "On target" : "Below", badgeColor: overview.avgAchievement >= 100 ? "success" as const : "warning" as const },
    { icon: Users, label: "Total Customer", value: overview.totalCustomers.toLocaleString(), badge: undefined, badgeColor: "primary" as const },
    { icon: DollarSign, label: "Avg Spending", value: formatRpFull(overview.avgSpendingPower), badge: undefined, badgeColor: "primary" as const },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} icon={<kpi.icon className="h-5 w-5 text-primary" />} label={kpi.label} value={kpi.value} badge={kpi.badge} badgeColor={kpi.badgeColor} />
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
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Waste</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Margin</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Beli</th>
                  <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Variance</th>
                  <th className="px-3 py-2 text-center font-semibold text-muted-foreground">Priority</th>
                  <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {priority.slice(0, 15).map((item, i) => (
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
                      }`}>{item.priority.toUpperCase()}</span>
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

function ProfitabilityTab({ reportId }: { reportId: Id<"weeklyReports"> }) {
  const data = useQuery(api.features.reports.analytics.getProductProfitability, { reportId });
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

function PurchaseTab({ reportId }: { reportId: Id<"weeklyReports"> }) {
  const data = useQuery(api.features.reports.analytics.getPurchaseEfficiency, { reportId });

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

function WasteTab({ reportId }: { reportId: Id<"weeklyReports"> }) {
  const data = useQuery(api.features.reports.analytics.getWasteAnalysis, { reportId });

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
          <p className="text-[10px] text-muted-foreground">Total Unit Waste</p>
        </div>
        <div className="bg-card rounded-xl shadow-card p-4 text-center">
          <p className="text-2xl font-bold text-destructive">{formatRpFull(data.totalWasteCost)}</p>
          <p className="text-[10px] text-muted-foreground">Est. Waste Cost</p>
        </div>
        <div className="bg-card rounded-xl shadow-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{data.topWastedItems.length}</p>
          <p className="text-[10px] text-muted-foreground">Jenis Item</p>
        </div>
      </div>

      {chartData.length > 0 && (
        <AreaChartCard
          data={chartData}
          title="Tren Waste Harian"
          subtitle="Estimasi biaya waste per hari"
          tooltipLabel="Waste Cost"
          gradientId="wasteGrad"
          height={180}
        />
      )}

      {/* Top Wasted Items */}
      <div className="bg-card rounded-xl shadow-card p-4">
        <h3 className="text-sm font-semibold mb-3">Top Wasted Items (by cost)</h3>
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

// ─── Cash Flow Tab ───────────────────────────────────────────

function CashFlowTab({ reportId }: { reportId: Id<"weeklyReports"> }) {
  const data = useQuery(api.features.reports.analytics.getCashFlowSummary, { reportId });

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
          <p className="text-[10px] text-muted-foreground">Net Cash Flow</p>
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
          subtitle="Closing balance per hari"
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
                <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Sales</th>
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
