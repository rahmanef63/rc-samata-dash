import {
  Home, FileText, DollarSign, BarChart3, ClipboardCheck,
  Package, Settings, Wallet, Receipt, Moon, Database, ChevronRight, Bot
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";

const menuGroups = [
  {
    label: "MAIN MENU",
    items: [
      { title: "Dashboard", url: "/", icon: Home },
      { title: "Report", url: "/report", icon: BarChart3 },
      { title: "Chat AI", url: "/chat", icon: Bot },
    ],
  },
  {
    label: "FINANCE",
    items: [
      { title: "Penjualan", url: "/finance", icon: FileText },
      { title: "Expenses", url: "/expenses", icon: DollarSign },
      { title: "Piutang Vendor", url: "/payables", icon: Receipt },
      { title: "Petty Cash", url: "/petty-cash", icon: Wallet },
      { title: "Closing & Setoran", url: "/closing", icon: Moon },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { title: "Inventory", url: "/inventory", icon: Package },
      { title: "Audit", url: "/audit", icon: ClipboardCheck },
      { title: "Master Data", url: "/master-data", icon: Database },
      { title: "Settings", url: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm">
            <span className="text-primary-foreground font-bold text-sm">R</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <div>
                <span className="font-bold text-navy">Rocket</span>
                <span className="font-bold text-primary ml-0.5">Chicken</span>
              </div>
              <span className="text-[10px] text-muted-foreground leading-tight">Owner Control Panel</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-3">
        {menuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && <SidebarGroupLabel className="label-uppercase px-4 mb-1">{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === "/"}
                          className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                            isActive
                              ? 'bg-accent text-accent-foreground font-semibold'
                              : 'text-sidebar-foreground hover:bg-secondary'
                          }`}
                          activeClassName=""
                        >
                          <item.icon className={`h-[18px] w-[18px] shrink-0 transition-colors ${isActive ? 'text-primary' : ''}`} />
                          {!collapsed && (
                            <>
                              <span className="flex-1">{item.title}</span>
                              {isActive && <ChevronRight className="h-3.5 w-3.5 text-primary opacity-60" />}
                            </>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      {!collapsed && (
        <div className="mt-auto p-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-navy flex items-center justify-center ring-2 ring-border">
              <span className="text-sm text-navy-foreground font-medium">IM</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">Ikhwanul Muslim</p>
              <p className="text-[11px] text-muted-foreground">Owner · Sudirman</p>
            </div>
          </div>
        </div>
      )}
    </Sidebar>
  );
}
