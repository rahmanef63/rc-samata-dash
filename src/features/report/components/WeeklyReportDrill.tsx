"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  ClipboardCheck,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatRpFull } from "@/shared/lib";
import { useFilteredByDate } from "@/shared/hooks";
import { ReportButton, ReportPrintShell } from "@/features/report-pdf";
import { AuditPanel } from "./AuditPanel";
import { DataTablePanel, rp, num, pct } from "./WeeklyReportDataPanel";

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
  { key: "audit", label: "Audit Import", icon: ClipboardCheck },
];

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/30 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-base font-semibold mt-0.5 font-mono-data">{value}</div>
    </div>
  );
}

// Map a bridge `tabLabel` (e.g. "Arus Kas") onto a TABS.key (e.g. "dailyCashFlow").
const TAB_LABEL_ALIAS: Record<string, string> = {
  "Penjualan": "productSales",
  "Arus Kas": "dailyCashFlow",
  "Pembelian Kredit": "creditPurchases",
  "Inventory": "inventoryValuation",
  "Food Cost": "foodCostSummary",
};

export function WeeklyReportDrill({ reportId }: { reportId: Id<"weeklyReports"> }) {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const rowParam = searchParams.get("row");
  const initialTab = useMemo(() => {
    if (!tabParam) return "summary";
    // Try direct key match first, then alias map, then label match (case-insensitive).
    if (TABS.find((t) => t.key === tabParam)) return tabParam;
    const aliased = TAB_LABEL_ALIAS[tabParam];
    if (aliased) return aliased;
    const byLabel = TABS.find((t) => t.label.toLowerCase() === tabParam.toLowerCase());
    return byLabel?.key ?? "summary";
  }, [tabParam]);
  const [active, setActive] = useState<string>(initialTab);

  // If URL tab changes (deep-link navigation), reflect it.
  useEffect(() => {
    setActive(initialTab);
  }, [initialTab]);

  // Scroll to row N after a tab has rendered.
  useEffect(() => {
    if (!rowParam || active === "summary") return;
    const idx = Number(rowParam);
    if (!Number.isFinite(idx)) return;
    // Wait a tick for the table to render.
    const t = setTimeout(() => {
      const rows = document.querySelectorAll<HTMLElement>("[data-row-idx]");
      const target = Array.from(rows).find((el) => el.dataset.rowIdx === String(idx));
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.classList.add("ring-2", "ring-primary", "bg-primary/5");
        setTimeout(() => target.classList.remove("ring-2", "ring-primary", "bg-primary/5"), 2400);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [rowParam, active]);

  const report = useQuery(api.features.reports.queries.getWeeklyReport, { reportId });
  const rawProductSales = useQuery(api.features.reports.queries.getProductSales, { reportId });
  const rawSalesControl = useQuery(api.features.reports.queries.listSalesControl, { reportId });
  const rawDailyCashSummary = useQuery(api.features.reports.queries.listDailyCashSummary, { reportId });
  const rawDailyCashFlow = useQuery(api.features.reports.queries.getDailyCashFlow, { reportId });
  const rawVendorPurchases = useQuery(api.features.reports.queries.getVendorPurchases, { reportId });
  const rawCreditPurchases = useQuery(api.features.reports.queries.listCreditPurchases, { reportId });
  const rawInventoryValuation = useQuery(api.features.reports.queries.getInventoryValuation, { reportId });
  const rawFoodCostSummary = useQuery(api.features.reports.queries.getFoodCostSummary, { reportId });
  const rawCostAnalysis = useQuery(api.features.reports.queries.getCostAnalysis, { reportId });
  const rawProductHPP = useQuery(api.features.reports.queries.getProductHPP, { reportId });
  const rawLeftoverItems = useQuery(api.features.reports.queries.listLeftoverItems, { reportId });
  const rawTransferItems = useQuery(api.features.reports.queries.getTransferItems, { reportId });
  const rawProductChanges = useQuery(api.features.reports.queries.listProductChanges, {});
  const rawEmployeeIncentives = useQuery(api.features.reports.queries.getEmployeeIncentives, { reportId });
  const employeeAllowances = useQuery(api.features.reports.queries.listEmployeeAllowances, {});

  // DRY date scope filter — driven by header DateRangePicker.
  const productSales = useFilteredByDate(rawProductSales, "businessDate");
  const salesControl = useFilteredByDate(rawSalesControl, "businessDate");
  const dailyCashSummary = useFilteredByDate(rawDailyCashSummary, "businessDate");
  const dailyCashFlow = useFilteredByDate(rawDailyCashFlow, "businessDate");
  const vendorPurchases = useFilteredByDate(rawVendorPurchases, "weekStart");
  const creditPurchases = useFilteredByDate(rawCreditPurchases, "purchaseDate");
  const inventoryValuation = useFilteredByDate(rawInventoryValuation, "valuationDate");
  const foodCostSummary = useFilteredByDate(rawFoodCostSummary, "periodStart");
  const costAnalysis = useFilteredByDate(rawCostAnalysis, "periodStart");
  const productHPP = useFilteredByDate(rawProductHPP, "periodStart");
  const leftoverItems = useFilteredByDate(rawLeftoverItems, "businessDate");
  const transferItems = useFilteredByDate(rawTransferItems, "periodStart");
  const productChanges = useFilteredByDate(rawProductChanges, "periodStart");
  const employeeIncentives = useFilteredByDate(rawEmployeeIncentives, "periodStart");

  const summary = useMemo(() => {
    if (!rawProductSales || !rawFoodCostSummary || !rawDailyCashFlow) return null;
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
  }, [
    rawProductSales,
    rawFoodCostSummary,
    rawDailyCashFlow,
    productSales,
    foodCostSummary,
    dailyCashFlow,
  ]);

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

  const tableMeta = {
    sourceFile: report.fileName ?? undefined,
    reportPeriod: `${report.periodStart} — ${report.periodEnd}`,
  };

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-start justify-between gap-3" data-print="hide">
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
        <ReportButton hint="Cetak tab aktif sebagai PDF" />
      </div>

      <ReportPrintShell
        title={`Laporan Mingguan · ${report.periodStart} — ${report.periodEnd}`}
        subtitle={report.fileName ?? undefined}
        meta={[{ label: "Status", value: report.status }]}
      >
      {/* Tab strip */}
      <div className="border-b overflow-x-auto" data-print="hide">
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
        <>
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
          {report.unknownSheets && report.unknownSheets.length > 0 && (
            <Card className="p-4 mt-3 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                    {report.unknownSheets.length} sheet belum punya parser
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Sheet ini ada di xlsx tapi tidak ter-extract. Data belum hilang — request parser baru kalau perlu.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {report.unknownSheets.map((s) => (
                      <span key={s} className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {active === "productSales" && (
        <DataTablePanel
          data={productSales}
          loading={rawProductSales === undefined}
          sheet="productSales"
          {...tableMeta}
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
          loading={rawSalesControl === undefined}
          sheet="salesControl"
          {...tableMeta}
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
          loading={rawDailyCashSummary === undefined}
          sheet="dailyCashSummary"
          {...tableMeta}
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
          loading={rawDailyCashFlow === undefined}
          sheet="dailyCashFlow"
          {...tableMeta}
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
          loading={rawVendorPurchases === undefined}
          sheet="vendorPurchases"
          {...tableMeta}
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
          loading={rawCreditPurchases === undefined}
          sheet="creditPurchases"
          {...tableMeta}
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
          loading={rawInventoryValuation === undefined}
          sheet="inventoryValuation"
          {...tableMeta}
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
          loading={rawFoodCostSummary === undefined}
          sheet="foodCostSummary"
          {...tableMeta}
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
          loading={rawCostAnalysis === undefined}
          sheet="costAnalysis"
          {...tableMeta}
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
          loading={rawProductHPP === undefined}
          sheet="productHPP"
          {...tableMeta}
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
          loading={rawLeftoverItems === undefined}
          sheet="leftoverItems"
          {...tableMeta}
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
          loading={rawTransferItems === undefined}
          sheet="transferItems"
          {...tableMeta}
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
          loading={rawProductChanges === undefined}
          sheet="productChanges"
          {...tableMeta}
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
          loading={rawEmployeeIncentives === undefined}
          sheet="employeeIncentives"
          {...tableMeta}
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
          data={employeeAllowances ?? []}
          loading={employeeAllowances === undefined}
          sheet="employeeAllowances"
          {...tableMeta}
          columns={[
            { key: "employeeName", label: "Karyawan" },
            { key: "position", label: "Posisi" },
            { key: "subsidiTransportAmount", label: "Transport", align: "right", format: rp },
            { key: "budgetKosAmount", label: "Kos", align: "right", format: rp },
            { key: "luarKotaAmount", label: "Luar Kota", align: "right", format: rp },
          ]}
        />
      )}

      {active === "audit" && <AuditPanel reportId={reportId} />}
      </ReportPrintShell>
    </div>
  );
}

