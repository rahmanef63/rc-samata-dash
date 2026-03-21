"use client";

import { notFound, usePathname } from "next/navigation";
import { DynamicPageLayout } from "@/components/layout/DynamicPageLayout";

// Imports of all features/components
import DashboardPage from "@/features/dashboard/components/DashboardPage" 
import { DailySalesForm } from "@/features/sales";
import { ExpensesOverview } from "@/features/expenses";
import { PayablesOverview } from "@/features/payables";
import { PettyCashOverview } from "@/features/petty-cash";
import { DailyClosingPanel } from "@/features/closing";
import { InventoryOverview } from "@/features/inventory";
import { AuditChecklist } from "@/features/audit";
import { MasterDataPanel } from "@/features/master-data";
import { SettingsPanel } from "@/features/settings";
import ReportPage from "@/features/report/components/ReportPage";
import ChatPage from "@/features/chat/components/ChatPage";

// Create mapping
const RouteComponentMap: Record<string, React.ReactNode> = {
  "/": <DashboardPage />,
  "/finance": <DailySalesForm />,
  "/finance/expenses": <ExpensesOverview />,
  "/finance/payables": <PayablesOverview />,
  "/finance/petty-cash": <PettyCashOverview />,
  "/finance/closing": <DailyClosingPanel />,
  "/operation": <InventoryOverview />,
  "/operation/audit": <AuditChecklist />,
  "/operation/master-data": <MasterDataPanel />,
  "/operation/settings": <SettingsPanel />,
  "/report": <ReportPage />,
  "/chat": <ChatPage />,
};

export default function CatchAllRoute() {
  const pathname = usePathname() || "/";
  // Next 15 Dynamic Route parameters should use React.use(params) or we can just use usePathname()!
  // Since this is a "use client" component, usePathname() directly reflects the URL perfectly!

  const content = RouteComponentMap[pathname];

  if (!content) {
    return notFound();
  }

  return <DynamicPageLayout>{content}</DynamicPageLayout>;
}
