"use client";

import {
  Home,
  DollarSign,
  BarChart3,
  Bot,
  Settings,
  Menu,
  PieChart,
  type LucideIcon,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useSidebar } from "@/components/ui/sidebar";
import { useUserRole, type Role } from "@/features/auth/useUserRole";

interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

const ADMIN_ITEMS: NavItem[] = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Keuangan", url: "/finance", icon: DollarSign },
  { title: "Laporan", url: "/report", icon: BarChart3 },
  { title: "Chat AI", url: "/chat", icon: Bot },
  { title: "Operasional", url: "/operation", icon: Settings },
];

// Owner: chart/report-only. No data-entry shortcuts.
const OWNER_ITEMS: NavItem[] = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Laporan", url: "/report", icon: BarChart3 },
  { title: "Analisis", url: "/laporan/analisis", icon: PieChart },
  { title: "Chat AI", url: "/chat", icon: Bot },
];

function pickItems(role: Role | null | undefined): NavItem[] {
  // While loading (undefined) we keep the admin set so layout doesn't shift
  // for staff/super_admin. Owner is the only role that gets the trimmed nav.
  if (role === "owner") return OWNER_ITEMS;
  return ADMIN_ITEMS;
}

export function BottomNav() {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();
  const role = useUserRole();
  const navItems = pickItems(role);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 glass border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive =
            item.url === "/"
              ? pathname === "/"
              : pathname.startsWith(item.url);
          return (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === "/"}
              className="relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[48px] active:scale-95"
              activeClassName=""
            >
              <div className="relative">
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute -inset-1.5 rounded-xl bg-primary/10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <item.icon
                  className={`relative h-5 w-5 transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                />
              </div>
              <span
                className={`text-[10px] font-semibold transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {item.title}
              </span>
            </NavLink>
          );
        })}
        <button
          onClick={toggleSidebar}
          className="relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all duration-200 min-w-[48px] active:scale-95"
        >
          <Menu className="h-5 w-5 text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground">Lainnya</span>
        </button>
      </div>
    </nav>
  );
}
