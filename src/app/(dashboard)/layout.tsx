"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DynamicPageLayout } from "@/components/layout/DynamicPageLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { ReactNode } from "react";

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <RoleGuard>
        <DashboardLayout>
          <DynamicPageLayout>{children}</DynamicPageLayout>
        </DashboardLayout>
      </RoleGuard>
    </AuthGuard>
  );
}
