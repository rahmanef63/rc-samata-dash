"use client";

import { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getTabConfig } from "@/config/routes";
import { TabBar } from "@/shared/components/TabBar";

export function DynamicPageLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const tabConfig = getTabConfig(pathname);

  if (!tabConfig) {
    return <div className="p-4 md:p-6 lg:p-8 animate-in fade-in">{children}</div>;
  }

  // If it's a tabbed route, render TabBar at the top
  const activeTabTitle = tabConfig.pathToTab[pathname] || tabConfig.tabs[0];

  return (
    <div className="flex flex-col h-full animate-in fade-in">
      <div className="sticky top-0 z-10 bg-background/95 glass border-b border-border pb-0 px-4 md:px-6 lg:px-8 mt-2 md:mt-4">
        <TabBar
          tabs={tabConfig.tabs}
          activeTab={activeTabTitle}
          onTabChange={(tabTitle) => {
            const path = tabConfig.tabToPath[tabTitle];
            if (path) router.push(path);
          }}
        />
      </div>
      <div className="flex-1 p-4 md:p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
}
