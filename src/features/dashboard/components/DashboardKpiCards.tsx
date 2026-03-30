"use client";

import { DollarSign, Wallet, AlertTriangle, TrendingUp, Receipt, Moon, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { KpiCard } from "@/components/ui/kpi-card";
import { formatLongDate, formatRpFull, getJakartaDateString } from "@/shared/lib";

export function DashboardKpiCards() {
  const router = useRouter();

  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;

  const today = getJakartaDateString();
  const currentMonth = today.slice(0, 7);

  const monthlyTrend = useQuery(
    api.features.reports.dashboardQueries.getMonthlySalesTrend,
    branchId ? { branchId } : "skip"
  );
  const rawSales = useQuery(
    api.features.sales.queries.listByBranch,
    branchId ? { branchId } : "skip"
  );
  const rawExpenses = useQuery(
    api.features.expenses.queries.listByBranch,
    branchId ? { branchId } : "skip"
  );
  const reportExpenses = useQuery(
    api.features.reports.queries.getExpensesByBranch,
    branchId ? { branchId } : "skip"
  );
  const rawPayables = useQuery(
    api.features.payables.queries.listByBranch,
    branchId ? { branchId } : "skip"
  );
  const reportPayables = useQuery(
    api.features.reports.queries.getPayablesByBranch,
    branchId ? { branchId } : "skip"
  );
  const rawPettyCash = useQuery(
    api.features.pettyCash.queries.listByBranch,
    branchId ? { branchId } : "skip"
  );
  const rawTransfers = useQuery(
    api.features.closing.queries.listTransfers,
    branchId ? { branchId } : "skip"
  );
  const rawStockItems = useQuery(
    api.features.inventory.queries.listItems,
    branchId ? { branchId } : "skip"
  );
  const rawClosings = useQuery(
    api.features.closing.queries.listClosings,
    branchId ? { branchId } : "skip"
  );

  const isLoading = [
    branches,
    monthlyTrend,
    rawSales,
    rawExpenses,
    reportExpenses,
    rawPayables,
    reportPayables,
    rawPettyCash,
    rawTransfers,
    rawStockItems,
    rawClosings,
  ].some((value) => value === undefined);

  const latestSalesPoint = monthlyTrend?.[monthlyTrend.length - 1];
  const latestSalesDate = latestSalesPoint?.date ?? today;
  const omzetLatest = latestSalesPoint?.value ?? 0;

  const expensesThisMonth = [...(rawExpenses || []), ...(reportExpenses || [])]
    .filter(e => e.expenseDate?.startsWith(currentMonth))
    .reduce((s, e) => s + e.amount, 0);

  const outstandingManual = (rawPayables || [])
    .filter((payable) => payable.status !== "paid")
    .reduce((sum, payable) => sum + (payable.amount - payable.paidAmount), 0);
  const outstandingReport = (reportPayables || []).reduce((sum, payable) => sum + (payable.totalAmount ?? 0), 0);
  const outstanding = outstandingManual + outstandingReport;
  const overdueCount = (rawPayables || []).filter((payable) => payable.status === "overdue").length;

  const pettyCashDisbursed = (rawPettyCash || [])
    .filter(r => ["disbursed", "closed"].includes(r.status))
    .reduce((s, r) => s + r.approvedAmount, 0);
  const pettyCashUsed = (rawPettyCash || [])
    .filter(r => r.status === "closed")
    .reduce((s, r) => s + r.actualAmount, 0);
  const pettyCashBalance = pettyCashDisbursed - pettyCashUsed;
  const pettyCashPending = (rawPettyCash || []).filter(r => r.status === "requested").length;

  // Setoran Malam (today's branch → owner transfers)
  const setoranToday = (rawTransfers || [])
    .filter(t => t.direction === "branch_to_owner" && t.transferDate === today)
    .reduce((s, t) => s + t.amount, 0);

  // Net Cash to Owner
  const totalToOwner = (rawTransfers || [])
    .filter(t => t.direction === "branch_to_owner")
    .reduce((s, t) => s + t.amount, 0);
  const totalFromOwner = (rawTransfers || [])
    .filter(t => t.direction === "owner_to_branch")
    .reduce((s, t) => s + t.amount, 0);
  const netCashToOwner = totalToOwner - totalFromOwner;

  // Low Stock Items
  const lowStockItems = (rawStockItems || []).filter(i => i.status === "Low" || i.status === "Critical");

  // Selisih Kas (latest closing)
  const latestClosing = (rawClosings || []).slice().sort((a, b) => b.businessDate.localeCompare(a.businessDate))[0];
  const selisihKas = latestClosing?.difference ?? 0;

  const kpiItems = [
    {
      icon: DollarSign,
      label: "Omzet Terkini",
      value: isLoading ? "Memuat..." : formatRpFull(omzetLatest),
      badge: latestSalesDate ? formatLongDate(latestSalesDate) : undefined,
      badgeColor: "success" as const,
      path: "/finance",
    },
    {
      icon: TrendingUp,
      label: "Kas Bersih ke Owner",
      value: isLoading ? "Memuat..." : formatRpFull(netCashToOwner),
      badge: netCashToOwner > 0 ? "Positif" : undefined,
      badgeColor: "success" as const,
      path: "/report",
    },
    {
      icon: Receipt,
      label: "Expense Bulan Ini",
      value: isLoading ? "Memuat..." : formatRpFull(expensesThisMonth),
      badge: undefined,
      badgeColor: "warning" as const,
      path: "/finance/expenses",
    },
    {
      icon: AlertTriangle,
      label: "Piutang Vendor",
      value: isLoading ? "Memuat..." : formatRpFull(outstanding),
      badge: overdueCount > 0 ? `${overdueCount} terlambat` : undefined,
      badgeColor: "destructive" as const,
      path: "/finance/payables",
    },
    {
      icon: Wallet,
      label: "Petty Cash Saldo",
      value: isLoading ? "Memuat..." : formatRpFull(pettyCashBalance),
      badge: pettyCashPending > 0 ? `${pettyCashPending} menunggu` : undefined,
      badgeColor: "warning" as const,
      path: "/finance/petty-cash",
    },
    {
      icon: Moon,
      label: "Setoran Malam",
      value: isLoading ? "Memuat..." : formatRpFull(setoranToday),
      badge: latestClosing?.status === "submitted" ? "Diajukan" : latestClosing?.status === "verified" ? "Terverifikasi" : undefined,
      badgeColor: "primary" as const,
      path: "/finance/closing",
    },
    {
      icon: Package,
      label: "Stok Rendah",
      value: isLoading ? "Memuat..." : `${lowStockItems.length} item`,
      badge: lowStockItems.length > 0 ? "Restock!" : undefined,
      badgeColor: "destructive" as const,
      path: "/operation",
    },
    {
      icon: DollarSign,
      label: "Selisih Kas",
      value: isLoading ? "Memuat..." : (selisihKas === 0 ? "Rp 0" : formatRpFull(selisihKas)),
      badge: selisihKas !== 0 ? "Perlu cek" : "OK",
      badgeColor: selisihKas !== 0 ? "destructive" as const : "success" as const,
      path: "/finance/closing",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {kpiItems.map((item) => (
        <KpiCard
          key={item.label}
          icon={<item.icon className="h-5 w-5 text-primary" />}
          label={item.label}
          value={item.value}
          badge={item.badge}
          badgeColor={item.badgeColor}
          onClick={() => router.push(item.path)}
        />
      ))}
    </div>
  );
}
