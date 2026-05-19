"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { useQuery } from "convex/react";
import { Loader2, AlertTriangle } from "lucide-react";
import { useBranchScope } from "../context/BranchScopeContext";
import { useDateScope, type DateGranularity } from "../context/DateScopeContext";
import { api } from "../../../../convex/_generated/api";
import { formatRpFull } from "@/shared/lib";
import { AreaChartCard } from "@/shared/components/AreaChartCard";

const TABS = ["Item Prioritas", "Profitabilitas", "Efisiensi Beli", "Pemborosan", "Arus Kas"] as const;
type Tab = typeof TABS[number];

function granularityToTimeFilter(g: DateGranularity): string {
  if (g === "day") return "daily";
  if (g === "week") return "weekly";
  if (g === "month") return "monthly";
  if (g === "quarter") return "quarterly";
  return "all";
}

function isValidItemName(name: string): boolean {
  if (!name || name.trim() === "") return false;
  return isNaN(Number(name.trim()));
}

function LoadingSkeleton() {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      <span className="text-sm">Menghitung analisis...</span>
    </div>
  );
}

export function DashboardAnalysisDrill() {
  const { branchId } = useBranchScope();
  const { granularity } = useDateScope();
  const [activeTab, setActiveTab] = useState<Tab>("Item Prioritas");

  if (!branchId) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Pilih satu cabang untuk melihat detail analisis (mode &quot;Semua cabang&quot; tidak tersedia).
      </div>
    );
  }

  const args = {
    reportId: "all" as const,
    branchId,
    timeFilter: granularityToTimeFilter(granularity),
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Detail Analisis</h2>
        <p className="text-[11px] text-muted-foreground">
          Tabel rinci profitabilitas, efisiensi pembelian, pemborosan, dan arus kas (skop sesuai filter di header).
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Item Prioritas" && <PriorityTab args={args} />}
      {activeTab === "Profitabilitas" && <ProfitabilityTab args={args} />}
      {activeTab === "Efisiensi Beli" && <PurchaseTab args={args} />}
      {activeTab === "Pemborosan" && <WasteTab args={args} />}
      {activeTab === "Arus Kas" && <CashFlowTab args={args} />}
    </div>
  );
}

function PriorityTab({ args }: { args: any }) {
  const priority = useQuery(api.features.reports.analytics.getPriorityItems, args);
  if (!priority) return <LoadingSkeleton />;
  if (priority.length === 0) {
    return <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Tidak ada item prioritas.</div>;
  }
  return (
    <div className="bg-card rounded-xl shadow-card p-4">
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
            {priority.filter((it: any) => isValidItemName(it.itemName)).slice(0, 15).map((item: any, i: number) => (
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
  );
}

function ProfitabilityTab({ args }: { args: any }) {
  const data = useQuery(api.features.reports.analytics.getProductProfitability, args);
  const [classFilter, setClassFilter] = useState<string>("all");
  if (!data) return <LoadingSkeleton />;

  const filtered = classFilter === "all" ? data : data.filter((d: any) => d.pricingClass === classFilter);
  const avgMargin = filtered.length > 0 ? filtered.reduce((s: number, d: any) => s + d.marginPct, 0) / filtered.length : 0;

  return (
    <div className="space-y-3">
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
          {filtered.length} produk · Avg margin:{" "}
          <span className={avgMargin >= 35 ? "text-emerald-600 font-semibold" : avgMargin >= 20 ? "text-amber-600 font-semibold" : "text-rose-600 font-semibold"}>
            {avgMargin.toFixed(1)}%
          </span>
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
              {filtered.map((item: any, i: number) => (
                <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-1.5 font-medium">{item.productName}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{item.pricingClass}</span>
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-destructive">{formatRpFull(item.totalHPP)}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{item.sellingPrice > 0 ? formatRpFull(item.sellingPrice) : "-"}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{item.marginRp > 0 ? formatRpFull(item.marginRp) : "-"}</td>
                  <td className={`px-3 py-1.5 text-right font-semibold ${
                    item.status === "good" ? "text-emerald-600" : item.status === "warning" ? "text-amber-600" : "text-rose-600"
                  }`}>{item.marginPct}%</td>
                  <td className="px-3 py-1.5 text-right">{item.totalQtySold > 0 ? item.totalQtySold : "-"}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-primary">{item.totalProfit !== 0 ? formatRpFull(item.totalProfit) : "-"}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      item.status === "good" ? "bg-emerald-100 text-emerald-700" :
                      item.status === "warning" ? "bg-amber-100 text-amber-700" :
                      "bg-rose-100 text-rose-700"
                    }`}>
                      {item.status === "good" ? "SEHAT" : item.status === "warning" ? "PERHATIAN" : "BAHAYA"}
                    </span>
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

function PurchaseTab({ args }: { args: any }) {
  const data = useQuery(api.features.reports.analytics.getPurchaseEfficiency, args);
  if (!data) return <LoadingSkeleton />;
  const overCount = data.filter((d: any) => d.status === "over").length;
  const totalOverCost = data.reduce((s: number, d: any) => s + d.overPurchaseCost, 0);

  return (
    <div className="space-y-3">
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>Total: {data.length} item</span>
        <span className="text-rose-600 font-medium">{overCount} over-purchase</span>
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
              {data.map((item: any, i: number) => (
                <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="px-3 py-1.5 font-medium">{item.itemName}</td>
                  <td className="px-3 py-1.5 text-right">{item.purchaseQty.toFixed(1)}</td>
                  <td className="px-3 py-1.5 text-right text-amber-600">{item.usageQty.toFixed(1)}</td>
                  <td className="px-3 py-1.5 text-right">{item.closingQty.toFixed(1)}</td>
                  <td className={`px-3 py-1.5 text-right font-semibold ${
                    item.status === "over" ? "text-rose-600" : item.status === "under" ? "text-blue-600" : "text-emerald-600"
                  }`}>{item.ratio.toFixed(2)}x</td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            item.status === "over" ? "bg-rose-500" : item.status === "under" ? "bg-blue-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(item.ratio * 50, 100)}%` }}
                        />
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                        item.status === "over" ? "bg-rose-100 text-rose-700" :
                        item.status === "under" ? "bg-blue-100 text-blue-700" :
                        "bg-emerald-100 text-emerald-700"
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

function WasteTab({ args }: { args: any }) {
  const data = useQuery(api.features.reports.analytics.getWasteAnalysis, args);
  if (!data) return <LoadingSkeleton />;

  const chartData = data.dailyTrend.map((d: any) => ({ label: d.date.slice(5), value: d.totalCost }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-card rounded-xl shadow-card p-3 text-center">
          <p className="text-xl font-bold text-destructive">{data.totalWasteQty}</p>
          <p className="text-[10px] text-muted-foreground">Total Unit Pemborosan</p>
        </div>
        <div className="bg-card rounded-xl shadow-card p-3 text-center">
          <p className="text-xl font-bold text-destructive">{formatRpFull(data.totalWasteCost)}</p>
          <p className="text-[10px] text-muted-foreground">Estimasi Biaya Pemborosan</p>
        </div>
        <div className="bg-card rounded-xl shadow-card p-3 text-center">
          <p className="text-xl font-bold text-primary">{data.topWastedItems.length}</p>
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

      <div className="bg-card rounded-xl shadow-card p-4">
        <h3 className="text-sm font-semibold mb-3">Item Pemborosan Terbesar (berdasarkan biaya)</h3>
        <div className="space-y-2">
          {data.topWastedItems.slice(0, 10).map((item: any, i: number) => {
            const maxCost = data.topWastedItems[0]?.estimatedCost ?? 1;
            const pct = (item.estimatedCost / maxCost) * 100;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                <span className="text-xs font-medium w-28 truncate">{item.itemName}</span>
                <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-rose-400" style={{ width: `${pct}%` }} />
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

function CashFlowTab({ args }: { args: any }) {
  const data = useQuery(api.features.reports.analytics.getCashFlowSummary, args);
  if (!data) return <LoadingSkeleton />;
  const chartData = data.daily.map((d: any) => ({ label: d.date.slice(5), value: d.closingBalance }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl shadow-card p-3 text-center">
          <p className="text-lg font-bold text-emerald-600">{formatRpFull(data.totalInflow)}</p>
          <p className="text-[10px] text-muted-foreground">Total Masuk</p>
        </div>
        <div className="bg-card rounded-xl shadow-card p-3 text-center">
          <p className="text-lg font-bold text-destructive">{formatRpFull(data.totalOutflow)}</p>
          <p className="text-[10px] text-muted-foreground">Total Keluar</p>
        </div>
        <div className="bg-card rounded-xl shadow-card p-3 text-center">
          <p className={`text-lg font-bold ${data.netCashFlow >= 0 ? "text-emerald-600" : "text-destructive"}`}>
            {formatRpFull(data.netCashFlow)}
          </p>
          <p className="text-[10px] text-muted-foreground">Arus Kas Bersih</p>
        </div>
        <div className="bg-card rounded-xl shadow-card p-3 text-center">
          <p className="text-lg font-bold text-amber-600">{formatRpFull(data.totalCommissions)}</p>
          <p className="text-[10px] text-muted-foreground">Total Komisi</p>
        </div>
      </div>

      {data.tightDays > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
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

      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto max-h-[400px]">
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
              {data.daily.map((d: any, i: number) => (
                <tr key={i} className={`border-t border-border/50 ${d.isTight ? "bg-rose-50 dark:bg-rose-950/10" : "hover:bg-muted/20"}`}>
                  <td className="px-3 py-1.5 text-muted-foreground">{d.date}</td>
                  <td className="px-3 py-1.5 text-right font-mono">{formatRpFull(d.openingBalance)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-emerald-600">{formatRpFull(d.salesInflow)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-destructive">{formatRpFull(d.totalOutflow)}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-amber-600">{formatRpFull(d.commissions)}</td>
                  <td className={`px-3 py-1.5 text-right font-mono font-semibold ${d.isTight ? "text-rose-600" : "text-primary"}`}>
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
