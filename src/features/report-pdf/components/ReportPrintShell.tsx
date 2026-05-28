"use client";

import { Fragment, type ReactNode } from "react";
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

// Internal — only ReportPrintShell may render the print header/footer.
// Surfaces must NOT import these directly; wrap content in <ReportPrintShell>.
function PrintHeader({ title, subtitle, meta }: CommonProps) {
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

function PrintFooter({ title }: { title: string }) {
  return (
    <footer className="print-only print-report-footer">
      <span>{BRAND.name}</span>
      <span>{title}</span>
      <span />
    </footer>
  );
}

/**
 * Single source of truth for the printed report header + footer.
 *
 * Renders as a Fragment (layout-transparent) so it can wrap content inside any
 * parent — including ones using `space-y-*` — without collapsing spacing. The
 * header/footer are print-only; on screen this renders just `children`.
 *
 * Every printable surface MUST route its print header through this component.
 * The raw PrintHeader/PrintFooter are intentionally module-private.
 */
export function ReportPrintShell({
  title,
  subtitle,
  meta,
  children,
}: CommonProps & { children: ReactNode }) {
  return (
    <Fragment>
      <PrintHeader title={title} subtitle={subtitle} meta={meta} />
      {children}
      <PrintFooter title={title} />
    </Fragment>
  );
}
