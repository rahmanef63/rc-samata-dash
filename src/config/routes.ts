import { Home, FileText, DollarSign, Receipt, Wallet, Moon, Package, ClipboardCheck, Database, Settings, BarChart3, Bot, UploadCloud, Upload, RefreshCw, Users, Folder, User, TrendingUp, Target, History, ClipboardList, Landmark, MessageSquareText, BookOpen, Wrench, CreditCard, ShoppingCart, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type Role = "super_admin" | "owner" | "staff";

/**
 * Per-item / per-group role allowlist.
 * - undefined  → visible to every role (default).
 * - array      → only the listed roles see it.
 * Owner is the most restricted role: anything technical (uploads, master
 * data, settings, ops) MUST tag `roles` to exclude "owner".
 */
export type RouteConfig = {
  title: string;
  url: string;
  icon?: LucideIcon;
  children?: RouteConfig[];
  roles?: Role[];
};

export type RouteGroup = {
  label: string;
  isTabs?: boolean;
  basePath?: string;
  items: RouteConfig[];
  roles?: Role[];
};

const ADMIN_ROLES: Role[] = ["super_admin", "staff"];
const SUPER_ADMIN_ONLY: Role[] = ["super_admin"];

// Sidebar — collapsed dengan submenu groups. Setiap item children = parent
// klik untuk expand/collapse (parent URL gak navigate). Lihat AppSidebar
// renderer untuk behavior. Target: ≤20 top-level entry biar gak rame.
export const ROUTE_GROUPS: RouteGroup[] = [
  {
    label: "MENU UTAMA",
    items: [
      { title: "Dashboard", url: "/", icon: Home },
      { title: "Upload Universal", url: "/upload", icon: UploadCloud, roles: ADMIN_ROLES },
      { title: "Buku Besar", url: "/finance/buku-besar", icon: BookOpen, roles: ADMIN_ROLES },
      { title: "Chat AI", url: "/chat", icon: Bot },
      { title: "Profil", url: "/profile", icon: User },
    ],
  },
  {
    label: "LAPORAN",
    items: [
      { title: "Ringkasan", url: "/report", icon: BarChart3 },
      { title: "Semua Laporan", url: "/laporan", icon: Folder },
    ],
  },
  {
    label: "KEUANGAN",
    basePath: "/finance",
    roles: ADMIN_ROLES,
    items: [
      {
        title: "Transaksi",
        url: "/finance",
        icon: ShoppingCart,
        children: [
          { title: "Penjualan", url: "/finance", icon: FileText },
          { title: "Pengeluaran", url: "/finance/expenses", icon: DollarSign },
          { title: "Petty Cash", url: "/finance/petty-cash", icon: Wallet },
          { title: "Pocket (Cash Ledger)", url: "/finance/pockets", icon: Wallet },
        ],
      },
      {
        title: "Piutang & Vendor",
        url: "/finance/payables",
        icon: CreditCard,
        children: [
          { title: "Piutang Vendor", url: "/finance/payables", icon: Receipt },
          { title: "Bukti Bayar", url: "/finance/bukti-bayar", icon: ClipboardList },
          { title: "Vendor", url: "/finance/vendors", icon: Users },
        ],
      },
      {
        title: "Setoran & Transfer",
        url: "/finance/closing",
        icon: Landmark,
        children: [
          { title: "Closing & Setoran", url: "/finance/closing", icon: Moon },
          { title: "Setoran Harian", url: "/finance/setoran", icon: Landmark },
          { title: "Transfer Owner", url: "/finance/transfer-owner-list", icon: RefreshCw },
          { title: "Bank Batches", url: "/finance/bank-batches", icon: Landmark },
          { title: "Periode Akuntansi", url: "/finance/periode", icon: Lock, roles: SUPER_ADMIN_ONLY },
        ],
      },
      {
        title: "Analisis",
        url: "/finance/cashflow",
        icon: TrendingUp,
        children: [
          { title: "Cashflow", url: "/finance/cashflow", icon: TrendingUp },
          { title: "Penjualan Log", url: "/finance/penjualan-log", icon: TrendingUp },
          { title: "Riwayat Validasi", url: "/finance/validation-batches", icon: ClipboardCheck },
        ],
      },
      {
        title: "ETL Tools",
        url: "/finance/owner-transfer",
        icon: Wrench,
        children: [
          { title: "Laporan PIC (CSV)", url: "/finance/laporan-pic", icon: ClipboardList },
          { title: "Statement Bank", url: "/finance/owner-transfer", icon: Landmark },
          { title: "Bulk Import Chat", url: "/laporan/bulk-import", icon: Upload },
          { title: "Validasi Harian WA", url: "/laporan/validasi-harian", icon: MessageSquareText },
        ],
      },
    ],
  },
  {
    label: "OPERASIONAL",
    basePath: "/operation",
    roles: ADMIN_ROLES,
    items: [
      {
        title: "Inventaris",
        url: "/operation",
        icon: Package,
        children: [
          { title: "Stok Saat Ini", url: "/operation", icon: Package },
          { title: "Mutasi Stok", url: "/operation/stock-movements", icon: History },
        ],
      },
      {
        title: "Master Data",
        url: "/operation/master-data",
        icon: Database,
        children: [
          { title: "Master Data (umum)", url: "/operation/master-data", icon: Database },
          { title: "Master Produk", url: "/operation/master-products", icon: Database },
          { title: "Master Bahan", url: "/operation/master-ingredients", icon: Database },
          { title: "Channel Pendapatan", url: "/operation/income-channels", icon: TrendingUp },
          { title: "Kategori Pengeluaran", url: "/operation/expense-categories", icon: DollarSign },
          { title: "Alias Bank Vendor", url: "/operation/vendor-aliases", icon: Database },
        ],
      },
      {
        title: "Audit & KPI",
        url: "/operation/kpi-targets",
        icon: ClipboardCheck,
        children: [
          { title: "Target KPI", url: "/operation/kpi-targets", icon: Target },
          { title: "Validasi Laporan", url: "/operation/report-validations", icon: ClipboardCheck },
          { title: "Audit Log Notion", url: "/operation/audit-log", icon: ClipboardList, roles: SUPER_ADMIN_ONLY },
          { title: "Log Audit", url: "/operation/audit/logs", icon: ClipboardList, roles: SUPER_ADMIN_ONLY },
        ],
      },
      {
        title: "HR",
        url: "/operation/hr/staff",
        icon: Users,
        children: [
          { title: "Staff", url: "/operation/hr/staff", icon: Users },
        ],
      },
      {
        title: "WA Audit",
        url: "/operation/wa-audit",
        icon: MessageSquareText,
        children: [
          { title: "Daily Audit", url: "/operation/wa-audit", icon: MessageSquareText },
        ],
      },
      {
        title: "Sistem",
        url: "/operation/settings",
        icon: Settings,
        children: [
          { title: "Pengaturan", url: "/operation/settings", icon: Settings },
          { title: "Konfigurasi AI", url: "/operation/ai-config", icon: Bot, roles: SUPER_ADMIN_ONLY },
          { title: "Manajemen User", url: "/operation/users", icon: Users, roles: SUPER_ADMIN_ONLY },
          { title: "Schema Graph", url: "/operation/schema-graph", icon: Database, roles: SUPER_ADMIN_ONLY },
        ],
      },
    ],
  },
];

const isVisibleToRole = (
  rolesAllowed: Role[] | undefined,
  role: Role | null | undefined,
): boolean => {
  if (!rolesAllowed) return true;
  if (!role) return false;
  return rolesAllowed.includes(role);
};

/**
 * Returns ROUTE_GROUPS pruned for the given role:
 * - groups whose `roles` exclude the role are dropped entirely;
 * - items whose `roles` exclude the role are dropped;
 * - children with role tags are filtered the same way;
 * - groups that end up with zero visible items are dropped.
 *
 * Pass `null` for unauthenticated — returns nothing.
 * Pass `undefined` (role query still loading) — treated as the
 * least-privileged role ("owner") to avoid leaking admin items to a
 * non-admin during the brief load window. Admins get the full set once
 * their role resolves.
 */
export function filterRouteGroups(
  role: Role | null | undefined,
): RouteGroup[] {
  if (role === null) return [];
  const effectiveRole: Role = role ?? "owner";

  const out: RouteGroup[] = [];
  for (const group of ROUTE_GROUPS) {
    if (!isVisibleToRole(group.roles, effectiveRole)) continue;
    const items: RouteConfig[] = [];
    for (const item of group.items) {
      if (!isVisibleToRole(item.roles, effectiveRole)) continue;
      const children = item.children?.filter((c) =>
        isVisibleToRole(c.roles, effectiveRole),
      );
      items.push(children ? { ...item, children } : item);
    }
    if (items.length === 0) continue;
    out.push({ ...group, items });
  }
  return out;
}

// Helper to get tab config based on current pathname
export const getTabConfig = (pathname: string) => {
  const group = ROUTE_GROUPS.find((g) =>
    g.isTabs && g.basePath && (pathname === g.basePath || pathname.startsWith(`${g.basePath}/`))
  );

  if (!group) return null;

  return {
    tabs: group.items.map((i) => i.title),
    pathToTab: Object.fromEntries(group.items.map((i) => [i.url, i.title])),
    tabToPath: Object.fromEntries(group.items.map((i) => [i.title, i.url])),
  };
};

export const ALL_ROUTES = ROUTE_GROUPS.flatMap((g) => g.items);
