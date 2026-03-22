"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { DynamicPageLayout } from "@/components/layout/DynamicPageLayout";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ReactNode } from "react";

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <DashboardLayout>
        <DynamicPageLayout>{children}</DynamicPageLayout>
      </DashboardLayout>
    </AuthGuard>
  );
}
