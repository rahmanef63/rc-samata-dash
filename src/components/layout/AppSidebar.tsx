"use client";

import { ChevronRight, ChevronDown, LogOut } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { usePathname, useRouter } from "next/navigation";
import { filterRouteGroups } from "@/config/routes";
import { useUserRole } from "@/features/auth/useUserRole";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton,
  SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = usePathname();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const role = useUserRole();
  const groups = filterRouteGroups(role);
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});

  const toggleSubMenu = (key: string) => {
    setOpenSubMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isItemActive = (url: string) =>
    pathname === url || pathname.startsWith(url + "/");

  const isChildActive = (children: { url: string }[]) =>
    children.some((c) => isItemActive(c.url));

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

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
                <span className="font-bold text-navy">RC</span>
                <span className="font-bold text-primary ml-0.5">Samata</span>
              </div>
              <span className="text-[10px] text-muted-foreground leading-tight">
                Owner Control &amp; Audit System
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-3">
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            {!collapsed && (
              <SidebarGroupLabel className="label-uppercase px-4 mb-1">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const hasChildren = item.children && item.children.length > 0;

                  if (hasChildren) {
                    const childActive = isChildActive(item.children!);
                    const isOpen = openSubMenus[item.title] ?? childActive;

                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <button
                            onClick={() => toggleSubMenu(item.title)}
                            className={`group flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                              childActive
                                ? "bg-accent text-accent-foreground font-semibold"
                                : "text-sidebar-foreground hover:bg-secondary"
                            }`}
                          >
                            {item.icon && (
                              <item.icon
                                className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                                  childActive ? "text-primary" : ""
                                }`}
                              />
                            )}
                            {!collapsed && (
                              <>
                                <span className="flex-1 text-left">{item.title}</span>
                                {isOpen
                                  ? <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-auto" />
                                  : <ChevronRight className="h-3.5 w-3.5 opacity-60 ml-auto" />
                                }
                              </>
                            )}
                          </button>
                        </SidebarMenuButton>
                        {!collapsed && isOpen && (
                          <SidebarMenuSub>
                            {item.children!.map((child) => {
                              const childIsActive = isItemActive(child.url);
                              return (
                                <SidebarMenuSubItem key={child.title}>
                                  <SidebarMenuSubButton asChild>
                                    <NavLink
                                      to={child.url}
                                      end={false}
                                      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                                        childIsActive
                                          ? "bg-accent text-accent-foreground font-semibold"
                                          : "text-sidebar-foreground hover:bg-secondary"
                                      }`}
                                      activeClassName=""
                                    >
                                      {child.icon && (
                                        <child.icon
                                          className={`h-[15px] w-[15px] shrink-0 ${
                                            childIsActive ? "text-primary" : ""
                                          }`}
                                        />
                                      )}
                                      <span>{child.title}</span>
                                    </NavLink>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        )}
                      </SidebarMenuItem>
                    );
                  }

                  const isActive = item.url === "/" ? pathname === "/" : isItemActive(item.url);
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          end={item.url === "/"}
                          className={`group flex flex-1 items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                            isActive
                              ? "bg-accent text-accent-foreground font-semibold"
                              : "text-sidebar-foreground hover:bg-secondary"
                          }`}
                          activeClassName=""
                        >
                          {item.icon && (
                            <item.icon
                              className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                                isActive ? "text-primary" : ""
                              }`}
                            />
                          )}
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left">{item.title}</span>
                              {isActive && (
                                <ChevronRight className="h-3.5 w-3.5 text-primary opacity-60 ml-auto" />
                              )}
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
        <div className="mt-auto p-4 border-t border-sidebar-border space-y-2">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-secondary/50">
            <div className="w-9 h-9 rounded-full bg-navy flex items-center justify-center ring-2 ring-border">
              <span className="text-sm text-navy-foreground font-medium">RC</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">RC Samata</p>
              <p className="text-[11px] text-muted-foreground">Super Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-destructive/80 hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Keluar</span>
          </button>
        </div>
      )}
    </Sidebar>
  );
}
