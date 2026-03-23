"use client";

import { ReactNode } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { TopHeader } from "@/components/layout/TopHeader";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="max-h-svh overflow-hidden">
        <TopHeader />
        <div
          className={`flex-1 overflow-y-auto scroll-smooth overscroll-y-contain ${
            isMobile ? "pb-24" : ""
          }`}
        >
          {children}
        </div>
        {isMobile && <BottomNav />}
      </SidebarInset>
    </SidebarProvider>
  );
}
