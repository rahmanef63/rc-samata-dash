import { Home, FileText, DollarSign, Receipt, Wallet, Moon, Package, ClipboardCheck, Database, Settings, BarChart3, Bot, UploadCloud, Upload, RefreshCw, Users, Folder, User, TrendingUp, Target, History, ClipboardList, Landmark, MessageSquareText, BookOpen, Wrench } from "lucide-react";
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

export const ROUTE_GROUPS: RouteGroup[] = [
  {
    label: "MENU UTAMA",
    items: [
      { title: "Dashboard", url: "/", icon: Home },
      { title: "Buku Besar", url: "/finance/buku-besar", icon: BookOpen, roles: ADMIN_ROLES },
      { title: "Ringkasan Laporan", url: "/report", icon: BarChart3 },
      { title: "Semua Laporan", url: "/laporan", icon: Folder },
      { title: "Upload Laporan Mingguan", url: "/laporan/upload", icon: UploadCloud, roles: ADMIN_ROLES },
      { title: "Chat AI", url: "/chat", icon: Bot },
      { title: "Profil", url: "/profile", icon: User },
    ],
  },
  {
    label: "KEUANGAN",
    basePath: "/finance",
    roles: ADMIN_ROLES,
    items: [
      { title: "Penjualan", url: "/finance", icon: FileText },
      { title: "Pengeluaran", url: "/finance/expenses", icon: DollarSign },
      { title: "Piutang Vendor", url: "/finance/payables", icon: Receipt },
      { title: "Vendor", url: "/finance/vendors", icon: Users },
      { title: "Petty Cash", url: "/finance/petty-cash", icon: Wallet },
      { title: "Cashflow", url: "/finance/cashflow", icon: TrendingUp },
      { title: "Closing & Setoran", url: "/finance/closing", icon: Moon },
    ],
  },
  {
    label: "LANJUTAN",
    roles: ADMIN_ROLES,
    items: [
      {
        title: "Tools",
        url: "/finance/owner-transfer",
        icon: Wrench,
        roles: ADMIN_ROLES,
        children: [
          { title: "Laporan PIC (CSV)", url: "/finance/laporan-pic", icon: ClipboardList },
          { title: "Statement Bank (xlsx)", url: "/finance/owner-transfer", icon: Landmark },
          { title: "Bulk Import Chat", url: "/laporan/bulk-import", icon: Upload },
          { title: "Validasi Harian WA", url: "/laporan/validasi-harian", icon: MessageSquareText },
          { title: "Pergantian Produk", url: "/laporan/upload-pergantian", icon: RefreshCw },
          { title: "Tunjangan Karyawan", url: "/laporan/upload-tunjangan", icon: Users },
        ],
      },
    ],
  },
  {
    label: "OPERASIONAL",
    basePath: "/operation",
    roles: ADMIN_ROLES,
    items: [
      { title: "Inventaris", url: "/operation", icon: Package },
      { title: "Mutasi Stok", url: "/operation/stock-movements", icon: History },
      { title: "Audit", url: "/operation/audit", icon: ClipboardCheck },
      { title: "Log Audit", url: "/operation/audit/logs", icon: ClipboardList, roles: SUPER_ADMIN_ONLY },
      { title: "Target KPI", url: "/operation/kpi-targets", icon: Target },
      { title: "Master Data", url: "/operation/master-data", icon: Database },
      { title: "Konfigurasi AI", url: "/operation/ai-config", icon: Bot, roles: SUPER_ADMIN_ONLY },
      { title: "Schema Graph", url: "/operation/schema-graph", icon: Database, roles: SUPER_ADMIN_ONLY },
      { title: "Manajemen User", url: "/operation/users", icon: Users, roles: SUPER_ADMIN_ONLY },
      { title: "Pengaturan", url: "/operation/settings", icon: Settings },
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
