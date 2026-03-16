import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TabBar } from "@/shared/components";
import { DailySalesForm } from "@/features/sales";
import { ExpensesOverview } from "@/features/expenses";
import { PettyCashOverview } from "@/features/petty-cash";
import { PayablesOverview } from "@/features/payables";
import { DailyClosingPanel } from "@/features/closing";

const tabs = ["Penjualan", "Expenses", "Piutang", "Petty Cash", "Closing & Setoran"] as const;
type Tab = typeof tabs[number];

const pathToTab: Record<string, Tab> = {
  "/finance": "Penjualan",
  "/sales": "Penjualan",
  "/expenses": "Expenses",
  "/payables": "Piutang",
  "/petty-cash": "Petty Cash",
  "/closing": "Closing & Setoran",
};

const tabToPath: Record<Tab, string> = {
  "Penjualan": "/finance",
  "Expenses": "/expenses",
  "Piutang": "/payables",
  "Petty Cash": "/petty-cash",
  "Closing & Setoran": "/closing",
};

export default function FinancePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>(pathToTab[location.pathname] || "Penjualan");

  useEffect(() => {
    const mapped = pathToTab[location.pathname];
    if (mapped && mapped !== activeTab) setActiveTab(mapped);
  }, [location.pathname]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    navigate(tabToPath[tab], { replace: true });
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
        <TabBar<Tab> tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />
        {activeTab === "Penjualan" && <DailySalesForm />}
        {activeTab === "Expenses" && <ExpensesOverview />}
        {activeTab === "Piutang" && <PayablesOverview />}
        {activeTab === "Petty Cash" && <PettyCashOverview />}
        {activeTab === "Closing & Setoran" && <DailyClosingPanel />}
      </div>
    </DashboardLayout>
  );
}
