"use client";

import { usePathname, useRouter } from "next/navigation";
import { TabBar } from "@/shared/components";
import { ReactNode } from "react";

const tabs = ["Inventory", "Audit", "Master Data", "Settings"] as const;
type Tab = (typeof tabs)[number];

const pathToTab: Record<string, Tab> = {
  "/operation": "Inventory",
  "/operation/audit": "Audit",
  "/operation/master-data": "Master Data",
  "/operation/settings": "Settings",
};

const tabToPath: Record<Tab, string> = {
  Inventory: "/operation",
  Audit: "/operation/audit",
  "Master Data": "/operation/master-data",
  Settings: "/operation/settings",
};

export default function OperationLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = pathToTab[pathname] ?? "Inventory";

  const handleTabChange = (tab: Tab) => {
    router.push(tabToPath[tab]);
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
      <TabBar<Tab> tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
      {children}
    </div>
  );
}
