"use client";

import { usePathname, useRouter } from "next/navigation";
import { TabBar } from "@/shared/components";
import { ReactNode } from "react";

const tabs = ["Penjualan", "Expenses", "Piutang", "Petty Cash", "Closing & Setoran"] as const;
type Tab = (typeof tabs)[number];

const pathToTab: Record<string, Tab> = {
  "/finance": "Penjualan",
  "/finance/expenses": "Expenses",
  "/finance/payables": "Piutang",
  "/finance/petty-cash": "Petty Cash",
  "/finance/closing": "Closing & Setoran",
};

const tabToPath: Record<Tab, string> = {
  Penjualan: "/finance",
  Expenses: "/finance/expenses",
  Piutang: "/finance/payables",
  "Petty Cash": "/finance/petty-cash",
  "Closing & Setoran": "/finance/closing",
};

export default function FinanceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = pathToTab[pathname] ?? "Penjualan";

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
