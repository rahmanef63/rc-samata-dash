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
      <SidebarInset>
        <TopHeader />
        <main
          className={`flex-1 overflow-auto scroll-smooth overscroll-y-contain ${
            isMobile ? "pb-24" : ""
          }`}
        >
          {children}
        </main>
        {isMobile && <BottomNav />}
      </SidebarInset>
    </SidebarProvider>
  );
}
