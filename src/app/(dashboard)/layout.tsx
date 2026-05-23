"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DynamicPageLayout } from "@/components/layout/DynamicPageLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { DateScopeProvider } from "@/features/dashboard/context/DateScopeContext";
import { Suspense, ReactNode } from "react";

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <RoleGuard>
        <Suspense fallback={null}>
          <DateScopeProvider>
            <DashboardLayout>
              <DynamicPageLayout>{children}</DynamicPageLayout>
            </DashboardLayout>
          </DateScopeProvider>
        </Suspense>
      </RoleGuard>
    </AuthGuard>
  );
}
