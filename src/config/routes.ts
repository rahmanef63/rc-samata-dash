import { Home, FileText, DollarSign, Receipt, Wallet, Moon, Package, ClipboardCheck, Database, Settings, BarChart3, Bot, UploadCloud, PieChart, RefreshCw, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type RouteConfig = {
  title: string;
  url: string;
  icon?: LucideIcon;
  children?: RouteConfig[];
};

export type RouteGroup = {
  label: string;
  isTabs?: boolean;
  basePath?: string;
  items: RouteConfig[];
};

export const ROUTE_GROUPS: RouteGroup[] = [
  {
    label: "MAIN MENU",
    items: [
      { title: "Dashboard", url: "/", icon: Home },
      { title: "Report", url: "/report", icon: BarChart3 },
      {
        title: "Upload",
        url: "/laporan/upload",
        icon: UploadCloud,
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
    label: "FINANCE",
    isTabs: true,
    basePath: "/finance",
    items: [
      { title: "Penjualan", url: "/finance", icon: FileText },
      { title: "Expenses", url: "/finance/expenses", icon: DollarSign },
      { title: "Piutang Vendor", url: "/finance/payables", icon: Receipt },
      { title: "Petty Cash", url: "/finance/petty-cash", icon: Wallet },
      { title: "Closing & Setoran", url: "/finance/closing", icon: Moon },
    ],
  },
  {
    label: "OPERATIONS",
    isTabs: true,
    basePath: "/operation",
    items: [
      { title: "Inventory", url: "/operation", icon: Package },
      { title: "Audit", url: "/operation/audit", icon: ClipboardCheck },
      { title: "Master Data", url: "/operation/master-data", icon: Database },
      { title: "Settings", url: "/operation/settings", icon: Settings },
    ],
  },
];

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
