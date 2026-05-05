import { Home, FileText, DollarSign, Receipt, Wallet, Moon, Package, ClipboardCheck, Database, Settings, BarChart3, Bot, UploadCloud, PieChart, RefreshCw, Users } from "lucide-react";
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

export const ROUTE_GROUPS: RouteGroup[] = [
  {
    label: "MENU UTAMA",
    items: [
      { title: "Dashboard", url: "/", icon: Home },
      { title: "Laporan", url: "/report", icon: BarChart3 },
      {
        title: "Upload",
        url: "/laporan/upload",
        icon: UploadCloud,
        roles: ADMIN_ROLES,
        children: [
          { title: "Upload Laporan", url: "/laporan/upload", icon: UploadCloud },
          { title: "Pergantian Produk", url: "/laporan/upload-pergantian", icon: RefreshCw },
          { title: "Tunjangan Karyawan", url: "/laporan/upload-tunjangan", icon: Users },
        ],
      },
      { title: "Analisis", url: "/laporan/analisis", icon: PieChart },
      { title: "Chat AI", url: "/chat", icon: Bot },
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
      { title: "Petty Cash", url: "/finance/petty-cash", icon: Wallet },
      { title: "Closing & Setoran", url: "/finance/closing", icon: Moon },
    ],
  },
  {
    label: "OPERASIONAL",
    basePath: "/operation",
    roles: ADMIN_ROLES,
    items: [
      { title: "Inventaris", url: "/operation", icon: Package },
      { title: "Audit", url: "/operation/audit", icon: ClipboardCheck },
      { title: "Master Data", url: "/operation/master-data", icon: Database },
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
 * Pass `null` for unauthenticated state — returns nothing.
 * Pass `undefined` (still loading) — returns the unfiltered groups so the
 * sidebar shape stays stable until the role resolves.
 */
export function filterRouteGroups(
  role: Role | null | undefined,
): RouteGroup[] {
  if (role === undefined) return ROUTE_GROUPS;
  if (role === null) return [];

  const out: RouteGroup[] = [];
  for (const group of ROUTE_GROUPS) {
    if (!isVisibleToRole(group.roles, role)) continue;
    const items: RouteConfig[] = [];
    for (const item of group.items) {
      if (!isVisibleToRole(item.roles, role)) continue;
      const children = item.children?.filter((c) =>
        isVisibleToRole(c.roles, role),
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
