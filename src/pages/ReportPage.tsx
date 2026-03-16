import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useState } from "react";
import { ReportOverview } from "@/features/report";

const tabs = ["Overview", "Penjualan & Setoran", "Report"] as const;

export default function ReportPage() {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("Report");

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-[1400px]">
        <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Report" && <ReportOverview />}
      </div>
    </DashboardLayout>
  );
}
