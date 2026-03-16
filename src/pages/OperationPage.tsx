import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TabBar } from "@/shared/components";
import { InventoryOverview } from "@/features/inventory";
import { AuditChecklist } from "@/features/audit";
import { MasterDataPanel } from "@/features/master-data";
import { SettingsPanel } from "@/features/settings";

const tabs = ["Inventory", "Audit", "Master Data", "Settings"] as const;
type Tab = typeof tabs[number];

const pathToTab: Record<string, Tab> = {
  "/operation": "Inventory",
  "/inventory": "Inventory",
  "/audit": "Audit",
  "/master-data": "Master Data",
  "/settings": "Settings",
};

const tabToPath: Record<Tab, string> = {
  "Inventory": "/inventory",
  "Audit": "/audit",
  "Master Data": "/master-data",
  "Settings": "/settings",
};

export default function OperationPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>(pathToTab[location.pathname] || "Inventory");

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
        {activeTab === "Inventory" && <InventoryOverview />}
        {activeTab === "Audit" && <AuditChecklist />}
        {activeTab === "Master Data" && <MasterDataPanel />}
        {activeTab === "Settings" && <SettingsPanel />}
      </div>
    </DashboardLayout>
  );
}
