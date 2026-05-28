"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/shared/components";
import { ReportButton } from "./ReportButton";
import { ReportPrintShell } from "./ReportPrintShell";

type MetaItem = { label: string; value: string };

/**
 * One-stop wrapper for any dashboard surface that should expose a "Cetak PDF"
 * button. Composes PageHeader + ReportButton + ReportPrintShell so a feature
 * page is just:
 *
 *   <ReportPage icon={X} title="..." description="..." reportTitle="...">
 *     <FeatureBody />
 *   </ReportPage>
 *
 * For surfaces with a bare/dynamic header (e.g. weekly drilldown — title
 * depends on loaded data, or components that render their own screen header),
 * skip this composer but still wrap the body in <ReportPrintShell> so the
 * print header stays single-sourced.
 */
export function ReportPage({
  icon,
  title,
  description,
  reportTitle,
  printSubtitle,
  printMeta,
  extraActions,
  printHint,
  printLabel,
  containerClassName,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Override screen title for the printed brand header. Defaults to `title`. */
  reportTitle?: string;
  printSubtitle?: string;
  printMeta?: MetaItem[];
  /** Extra action(s) rendered to the LEFT of the print button. */
  extraActions?: ReactNode;
  printHint?: string;
  printLabel?: string;
  /** Outer container classes. Default matches the existing dashboard pages. */
  containerClassName?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={
        containerClassName ?? "max-w-7xl mx-auto p-4 md:p-6 lg:p-8"
      }
    >
      <PageHeader
        icon={icon}
        title={title}
        description={description}
        action={
          <>
            {extraActions}
            <ReportButton label={printLabel} hint={printHint} />
          </>
        }
      />
      <ReportPrintShell
        title={reportTitle ?? title}
        subtitle={printSubtitle}
        meta={printMeta}
      >
        {children}
      </ReportPrintShell>
    </div>
  );
}
