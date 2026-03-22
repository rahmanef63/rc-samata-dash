import { DollarSign, Wallet, AlertTriangle, TrendingUp, Receipt, Moon, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { KpiCard } from "@/components/ui/kpi-card";
import { formatRpFull } from "@/shared/lib";

export function DashboardKpiCards() {
  const router = useRouter();

  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const currentMonth = today.slice(0, 7);

  const rawSalesToday = useQuery(
    api.features.sales.queries.listByBranch,
    branchId ? { branchId, businessDate: today } : "skip"
  );
  const rawExpenses = useQuery(
    api.features.expenses.queries.listByBranch,
    branchId ? { branchId } : "skip"
  );
  const rawPayables = useQuery(
    api.features.payables.queries.listByBranch,
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

  const isLoading = !branches;

  // Omzet Hari Ini
  const omzetToday = (rawSalesToday || []).reduce((s, sale) => s + sale.grossAmount, 0);

  // Expense Bulan Ini
  const expensesThisMonth = (rawExpenses || [])
    .filter(e => e.expenseDate?.startsWith(currentMonth))
    .reduce((s, e) => s + e.amount, 0);

  // Outstanding Payable
  const outstanding = (rawPayables || [])
    .filter(p => p.status !== "paid")
    .reduce((s, p) => s + (p.amount - p.paidAmount), 0);
  const overdueCount = (rawPayables || []).filter(p => p.status === "overdue").length;

  // Petty Cash Saldo
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
      label: "Omzet Hari Ini",
      value: isLoading ? "..." : formatRpFull(omzetToday),
      badge: rawSalesToday?.length ? `${rawSalesToday.length} transaksi` : undefined,
      badgeColor: "success" as const,
      path: "/finance",
    },
    {
      icon: TrendingUp,
      label: "Net Cash to Owner",
      value: isLoading ? "..." : formatRpFull(netCashToOwner),
      badge: netCashToOwner > 0 ? "Positif" : undefined,
      badgeColor: "success" as const,
      path: "/report",
    },
    {
      icon: Receipt,
      label: "Expense Bulan Ini",
      value: isLoading ? "..." : formatRpFull(expensesThisMonth),
      badge: undefined,
      badgeColor: "warning" as const,
      path: "/expenses",
    },
    {
      icon: AlertTriangle,
      label: "Outstanding Payable",
      value: isLoading ? "..." : formatRpFull(outstanding),
      badge: overdueCount > 0 ? `${overdueCount} overdue` : undefined,
      badgeColor: "destructive" as const,
      path: "/payables",
    },
    {
      icon: Wallet,
      label: "Petty Cash Saldo",
      value: isLoading ? "..." : formatRpFull(pettyCashBalance),
      badge: pettyCashPending > 0 ? `${pettyCashPending} pending` : undefined,
      badgeColor: "warning" as const,
      path: "/petty-cash",
    },
    {
      icon: Moon,
      label: "Setoran Malam",
      value: isLoading ? "..." : formatRpFull(setoranToday),
      badge: latestClosing?.status === "submitted" ? "Submitted" : latestClosing?.status === "verified" ? "Verified" : undefined,
      badgeColor: "primary" as const,
      path: "/closing",
    },
    {
      icon: Package,
      label: "Low Stock Items",
      value: isLoading ? "..." : `${lowStockItems.length} items`,
      badge: lowStockItems.length > 0 ? "Restock!" : undefined,
      badgeColor: "destructive" as const,
      path: "/inventory",
    },
    {
      icon: DollarSign,
      label: "Selisih Kas",
      value: isLoading ? "..." : (selisihKas === 0 ? "Rp 0" : formatRpFull(selisihKas)),
      badge: selisihKas !== 0 ? "Alert" : "OK",
      badgeColor: selisihKas !== 0 ? "destructive" as const : "success" as const,
      path: "/closing",
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
