"use client";

import { use } from "react";
import { WeeklyReportDrill } from "@/features/report/components/WeeklyReportDrill";
import type { Id } from "../../../../../convex/_generated/dataModel";

export default function Page({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = use(params);
  return <WeeklyReportDrill reportId={reportId as Id<"weeklyReports">} />;
}
