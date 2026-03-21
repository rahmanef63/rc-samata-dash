"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ReactNode } from "react";

export default function DashboardGroupLayout({ children }: { children: ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
