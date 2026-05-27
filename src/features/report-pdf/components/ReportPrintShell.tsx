"use client";

import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { BRAND } from "@/config/branding";
import { useDateScope } from "@/features/dashboard/context/DateScopeContext";

type MetaItem = { label: string; value: string };

type CommonProps = {
  title: string;
  subtitle?: string;
  meta?: MetaItem[];
};

function useFullMeta(subtitle: string | undefined, meta: MetaItem[] | undefined) {
  const user = useQuery(api.users.current);
  const { rangeLabel } = useDateScope();
  const now = new Date();
  const generatedAt = now.toLocaleString("id-ID", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const fullMeta: MetaItem[] = [
    { label: "Periode", value: subtitle ?? rangeLabel ?? "—" },
    { label: "Dicetak", value: generatedAt },
    { label: "Oleh", value: user?.name || user?.email || "—" },
    { label: "Tenant", value: BRAND.location },
    ...(meta ?? []),
  ];
  return { fullMeta, rangeLabel };
}

export function ReportPrintHeader({ title, subtitle, meta }: CommonProps) {
  const { fullMeta, rangeLabel } = useFullMeta(subtitle, meta);
  return (
    <header className="print-only print-report-header">
      <div className="print-report-brand">
        <div className="print-report-brand-mark">{BRAND.shortName}</div>
        <div className="print-report-brand-sub">
          {BRAND.name} · {BRAND.franchise}
        </div>
      </div>
      <div className="print-report-titles">
        <h1>{title}</h1>
        {(subtitle ?? rangeLabel) && (
          <p className="print-report-subtitle">{subtitle ?? rangeLabel}</p>
        )}
      </div>
      <dl className="print-report-meta">
        {fullMeta.map((m) => (
          <div key={m.label}>
            <dt>{m.label}</dt>
            <dd>{m.value}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}

export function ReportPrintFooter({ title }: { title: string }) {
  return (
    <footer className="print-only print-report-footer">
      <span>{BRAND.name}</span>
      <span>{title}</span>
      <span />
    </footer>
  );
}

/**
 * Wraps a printable region with brand header + footer rendered only in print
 * mode. Screen layout is unchanged.
 */
export function ReportPrintShell({
  title,
  subtitle,
  meta,
  children,
}: CommonProps & { children: ReactNode }) {
  return (
    <div data-print-region="report" className="contents">
      <ReportPrintHeader title={title} subtitle={subtitle} meta={meta} />
      {children}
      <ReportPrintFooter title={title} />
    </div>
  );
}
