"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import {
  ArrowLeft,
  FileText,
  ShoppingCart,
  TrendingDown,
  Banknote,
  Receipt,
  PiggyBank,
  Truck,
  Trash2,
  Calculator,
  Wallet,
  Users,
  Gift,
  Package,
  RefreshCw,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatRpFull } from "@/shared/lib";

type TabDef = {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const TABS: TabDef[] = [
  { key: "summary", label: "Ringkasan", icon: FileText },
  { key: "productSales", label: "Penjualan Produk", icon: ShoppingCart },
  { key: "salesControl", label: "Sales Control", icon: TrendingDown },
  { key: "dailyCashSummary", label: "Kas Harian", icon: Banknote },
  { key: "dailyCashFlow", label: "Cash Flow", icon: Wallet },
  { key: "vendorPurchases", label: "Pembelian Vendor", icon: Truck },
  { key: "creditPurchases", label: "Pembelian Kredit", icon: Receipt },
  { key: "inventoryValuation", label: "Valuasi Stok", icon: Package },
  { key: "foodCostSummary", label: "Food Cost", icon: PiggyBank },
  { key: "costAnalysis", label: "Cost Analysis", icon: Calculator },
  { key: "productHPP", label: "HPP Produk", icon: Calculator },
  { key: "leftoverItems", label: "Left Over", icon: Trash2 },
  { key: "transferItems", label: "Transfer Item", icon: RefreshCw },
  { key: "productChanges", label: "Pergantian", icon: RefreshCw },
  { key: "employeeIncentives", label: "Insentif", icon: Gift },
  { key: "employeeAllowances", label: "Tunjangan", icon: Users },
];

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/30 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-base font-semibold mt-0.5 font-mono-data">{value}</div>
    </div>
  );
}

function DataTablePanel<T extends Record<string, unknown>>({
  data,
  columns,
}: {
  data: T[] | undefined;
  columns: { key: keyof T & string; label: string; align?: "left" | "right"; format?: (v: unknown) => string }[];
}) {
  if (data === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
    );
  }
  if (data.length === 0) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Tidak ada data pada sheet ini.
      </Card>
    );
  }
  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`px-3 py-2 ${c.align === "right" ? "text-right" : "text-left"}`}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-t hover:bg-muted/30">
                {columns.map((c) => {
                  const raw = row[c.key];
                  const display = c.format ? c.format(raw) : String(raw ?? "—");
                  return (
                    <td
                      key={c.key}
                      className={`px-3 py-2 ${c.align === "right" ? "text-right font-mono-data" : ""}`}
                    >
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const rp = (v: unknown) => (typeof v === "number" ? formatRpFull(v) : "—");
const num = (v: unknown) => (typeof v === "number" ? v.toLocaleString("id-ID") : "—");
const pct = (v: unknown) => (typeof v === "number" ? `${(v * 100).toFixed(1)}%` : "—");

export function WeeklyReportDrill({ reportId }: { reportId: Id<"weeklyReports"> }) {
  const [active, setActive] = useState<string>("summary");

  const report = useQuery(api.features.reports.queries.getWeeklyReport, { reportId });
  const productSales = useQuery(api.features.reports.queries.getProductSales, { reportId });
  const salesControl = useQuery(api.features.reports.queries.listSalesControl, { reportId });
  const dailyCashSummary = useQuery(api.features.reports.queries.listDailyCashSummary, { reportId });
  const dailyCashFlow = useQuery(api.features.reports.queries.getDailyCashFlow, { reportId });
  const vendorPurchases = useQuery(api.features.reports.queries.getVendorPurchases, { reportId });
  const creditPurchases = useQuery(api.features.reports.queries.listCreditPurchases, { reportId });
  const inventoryValuation = useQuery(api.features.reports.queries.getInventoryValuation, { reportId });
  const foodCostSummary = useQuery(api.features.reports.queries.getFoodCostSummary, { reportId });
  const costAnalysis = useQuery(api.features.reports.queries.getCostAnalysis, { reportId });
  const productHPP = useQuery(api.features.reports.queries.getProductHPP, { reportId });
  const leftoverItems = useQuery(api.features.reports.queries.listLeftoverItems, { reportId });
  const transferItems = useQuery(api.features.reports.queries.getTransferItems, { reportId });
  const productChanges = useQuery(api.features.reports.queries.listProductChanges,
    report?.branchId ? { branchId: report.branchId } : "skip");
  const employeeIncentives = useQuery(api.features.reports.queries.getEmployeeIncentives, { reportId });
  const employeeAllowances = useQuery(api.features.reports.queries.listEmployeeAllowances,
    report?.branchId ? { branchId: report.branchId } : "skip");

  const summary = useMemo(() => {
    if (!productSales || !foodCostSummary || !dailyCashFlow) return null;
    const totalRevenue = productSales
      .filter((s) => !s.channel || s.channel === "all")
      .reduce((sum, s) => sum + s.amount, 0);
    const totalCOGS = foodCostSummary.reduce((sum, f) => sum + f.usageValue, 0);
    const grossProfit = totalRevenue - totalCOGS;
    const closingCashLast =
      dailyCashFlow.length > 0
        ? dailyCashFlow[dailyCashFlow.length - 1].closingBalance
        : 0;
    return { totalRevenue, totalCOGS, grossProfit, closingCashLast };
  }, [productSales, foodCostSummary, dailyCashFlow]);

  if (report === undefined) {
    return (
      <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-3">
        <Skeleton className="h-12 w-72" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (report === null) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto">
        <Card className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Laporan tidak ditemukan.</p>
          <Link href="/laporan" className="text-primary text-sm mt-3 inline-block">
            ← Kembali ke daftar laporan
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href="/laporan"
            className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 mb-1.5"
          >
            <ArrowLeft className="h-3 w-3" />
            Semua Laporan
          </Link>
          <h1 className="text-lg font-semibold tracking-tight truncate">
            Laporan Periode {report.periodStart}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap items-center gap-1.5">
            <span>{report.periodStart} — {report.periodEnd}</span>
            <span>·</span>
            <Badge variant="outline" className="text-[10px]">
              {report.status}
            </Badge>
            {report.fileName && (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1 truncate max-w-[260px]" title={report.fileName}>
                  <FileText className="h-3 w-3" />
                  <span className="font-mono text-[10px] truncate">{report.fileName}</span>
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Tab strip */}
      <div className="border-b overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActive(t.key)}
                className={`px-3 py-2 text-xs font-medium whitespace-nowrap flex items-center gap-1.5 border-b-2 transition-colors ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active tab body */}
      {active === "summary" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile
            label="Total Revenue"
            value={summary ? formatRpFull(summary.totalRevenue) : "…"}
          />
          <StatTile
            label="Total COGS"
            value={summary ? formatRpFull(summary.totalCOGS) : "…"}
          />
          <StatTile
            label="Gross Profit"
            value={summary ? formatRpFull(summary.grossProfit) : "…"}
          />
          <StatTile
            label="Closing Cash (akhir)"
            value={summary ? formatRpFull(summary.closingCashLast) : "…"}
          />
        </div>
      )}

      {active === "productSales" && (
        <DataTablePanel
          data={productSales}
          columns={[
            { key: "businessDate", label: "Tanggal" },
            { key: "productName", label: "Produk" },
            { key: "channel", label: "Channel" },
            { key: "qty", label: "Qty", align: "right", format: num },
            { key: "amount", label: "Amount", align: "right", format: rp },
          ]}
        />
      )}

      {active === "salesControl" && (
        <DataTablePanel
          data={salesControl}
          columns={[
            { key: "businessDate", label: "Tanggal" },
            { key: "netSales", label: "Net Sales", align: "right", format: rp },
            { key: "customerCount", label: "Customer", align: "right", format: num },
            { key: "spendingPower", label: "Spending Power", align: "right", format: rp },
            { key: "targetSales", label: "Target", align: "right", format: rp },
            { key: "achievementPct", label: "Capaian", align: "right", format: pct },
          ]}
        />
      )}

      {active === "dailyCashSummary" && (
        <DataTablePanel
          data={dailyCashSummary}
          columns={[
            { key: "businessDate", label: "Tanggal" },
            { key: "grossSales", label: "Gross Sales", align: "right", format: rp },
            { key: "netSales", label: "Net Sales", align: "right", format: rp },
            { key: "komisiGofood", label: "Komisi GoFood", align: "right", format: rp },
            { key: "komisiGrabfood", label: "Komisi GrabFood", align: "right", format: rp },
            { key: "discount", label: "Diskon", align: "right", format: rp },
          ]}
        />
      )}

      {active === "dailyCashFlow" && (
        <DataTablePanel
          data={dailyCashFlow}
          columns={[
            { key: "businessDate", label: "Tanggal" },
            { key: "openingBalance", label: "Opening", align: "right", format: rp },
            { key: "salesInflow", label: "Sales In", align: "right", format: rp },
            { key: "otherInflow", label: "Other In", align: "right", format: rp },
            { key: "expenseOutflow", label: "Expense Out", align: "right", format: rp },
            { key: "otherOutflow", label: "Other Out", align: "right", format: rp },
            { key: "closingBalance", label: "Closing", align: "right", format: rp },
          ]}
        />
      )}

      {active === "vendorPurchases" && (
        <DataTablePanel
          data={vendorPurchases}
          columns={[
            { key: "weekStart", label: "Minggu" },
            { key: "commodityName", label: "Komoditi" },
            { key: "section", label: "Section" },
            { key: "purchaseQty", label: "Beli Qty", align: "right", format: num },
            { key: "purchaseValue", label: "Beli Rp", align: "right", format: rp },
            { key: "usageValue", label: "Pakai Rp", align: "right", format: rp },
            { key: "closingValue", label: "Stok Akhir", align: "right", format: rp },
          ]}
        />
      )}

      {active === "creditPurchases" && (
        <DataTablePanel
          data={creditPurchases}
          columns={[
            { key: "purchaseDate", label: "Tanggal" },
            { key: "supplierName", label: "Supplier" },
            { key: "itemName", label: "Item" },
            { key: "qty", label: "Qty", align: "right", format: num },
            { key: "totalAmount", label: "Total", align: "right", format: rp },
          ]}
        />
      )}

      {active === "inventoryValuation" && (
        <DataTablePanel
          data={inventoryValuation}
          columns={[
            { key: "valuationDate", label: "Tanggal" },
            { key: "itemName", label: "Item" },
            { key: "category", label: "Kategori" },
            { key: "qty", label: "Qty", align: "right", format: num },
            { key: "unitPrice", label: "Harga", align: "right", format: rp },
            { key: "totalValue", label: "Total", align: "right", format: rp },
          ]}
        />
      )}

      {active === "foodCostSummary" && (
        <DataTablePanel
          data={foodCostSummary}
          columns={[
            { key: "periodStart", label: "Periode" },
            { key: "category", label: "Kategori" },
            { key: "openingValue", label: "Opening", align: "right", format: rp },
            { key: "purchaseValue", label: "Purchase", align: "right", format: rp },
            { key: "usageValue", label: "Usage", align: "right", format: rp },
            { key: "closingValue", label: "Closing", align: "right", format: rp },
          ]}
        />
      )}

      {active === "costAnalysis" && (
        <DataTablePanel
          data={costAnalysis}
          columns={[
            { key: "periodStart", label: "Periode" },
            { key: "itemName", label: "Item" },
            { key: "openingQty", label: "Open Qty", align: "right", format: num },
            { key: "purchaseQty", label: "Purchase Qty", align: "right", format: num },
            { key: "usageQty", label: "Usage Qty", align: "right", format: num },
            { key: "closingQty", label: "Close Qty", align: "right", format: num },
            { key: "variance", label: "Variance", align: "right", format: rp },
          ]}
        />
      )}

      {active === "productHPP" && (
        <DataTablePanel
          data={productHPP}
          columns={[
            { key: "periodStart", label: "Periode" },
            { key: "productName", label: "Produk" },
            { key: "pricingClass", label: "Kelas" },
            { key: "totalHPP", label: "Total HPP", align: "right", format: rp },
            { key: "sellingPrice", label: "Harga Jual", align: "right", format: rp },
          ]}
        />
      )}

      {active === "leftoverItems" && (
        <DataTablePanel
          data={leftoverItems}
          columns={[
            { key: "businessDate", label: "Tanggal" },
            { key: "itemName", label: "Item" },
            { key: "qty", label: "Qty", align: "right", format: num },
          ]}
        />
      )}

      {active === "transferItems" && (
        <DataTablePanel
          data={transferItems}
          columns={[
            { key: "periodStart", label: "Periode" },
            { key: "direction", label: "Arah" },
            { key: "category", label: "Kategori" },
            { key: "itemName", label: "Item" },
            { key: "qty", label: "Qty", align: "right", format: num },
            { key: "totalValue", label: "Nilai", align: "right", format: rp },
          ]}
        />
      )}

      {active === "productChanges" && (
        <DataTablePanel
          data={productChanges}
          columns={[
            { key: "periodLabel", label: "Periode" },
            { key: "itemName", label: "Item" },
            { key: "qty", label: "Qty", align: "right", format: num },
            { key: "unitPrice", label: "Harga", align: "right", format: rp },
            { key: "totalPrice", label: "Total", align: "right", format: rp },
          ]}
        />
      )}

      {active === "employeeIncentives" && (
        <DataTablePanel
          data={employeeIncentives}
          columns={[
            { key: "periodStart", label: "Periode" },
            { key: "employeeName", label: "Karyawan" },
            { key: "incentiveType", label: "Jenis" },
            { key: "amount", label: "Amount", align: "right", format: rp },
          ]}
        />
      )}

      {active === "employeeAllowances" && (
        <DataTablePanel
          data={employeeAllowances}
          columns={[
            { key: "employeeName", label: "Karyawan" },
            { key: "position", label: "Posisi" },
            { key: "subsidiTransportAmount", label: "Transport", align: "right", format: rp },
            { key: "budgetKosAmount", label: "Kos", align: "right", format: rp },
            { key: "luarKotaAmount", label: "Luar Kota", align: "right", format: rp },
          ]}
        />
      )}
    </div>
  );
}
