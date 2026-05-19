"use client";

import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

/**
 * Generic row-source dialog — shows where a list row came from.
 *
 * Renders:
 *  - source block (file / sheet / period / tab / row number) when row carries ETL fields
 *  - "Manual entry" badge otherwise
 *  - row fields below (label → value)
 *  - "Buka di laporan sumber" deep-link to /laporan/{reportId}?tab=&row= when ETL.
 */
export type RowField = { label: string; value: string | number | null | undefined };

export type RowSource = {
  sheet?: string;
  sourceFile?: string;
  reportPeriod?: string;
  reportId?: string;
  /** Tab label inside WeeklyReportDrill (e.g. "Arus Kas") */
  tab?: string;
  /** 0-based row position within that tab */
  rowNumber?: number;
};

/**
 * Adapt a row whose schema includes `etlSource` (bridged rows from ETL)
 * into a RowSource for the dialog. Returns undefined for manual rows.
 */
export function deriveSourceFromEtl(row: { etlSource?: {
  reportId: string;
  tabLabel?: string;
  rowIndex?: number;
  sheetName?: string;
  fileName?: string;
  periodStart?: string;
  periodEnd?: string;
} | null }): RowSource | undefined {
  const s = row.etlSource;
  if (!s) return undefined;
  const period = s.periodStart && s.periodEnd ? `${s.periodStart} → ${s.periodEnd}` : s.periodStart;
  return {
    sheet: s.sheetName,
    sourceFile: s.fileName,
    reportPeriod: period,
    reportId: s.reportId,
    tab: s.tabLabel,
    rowNumber: s.rowIndex != null ? s.rowIndex + 1 : undefined,
  };
}

export function RowSourceDialog({
  open,
  onClose,
  title,
  row,
  fields,
  source,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  row: object | null;
  fields: RowField[];
  source?: RowSource;
}) {
  const hasSource = Boolean(source?.sourceFile || source?.reportId);
  const deepLink = source?.reportId
    ? `/laporan/${source.reportId}${
        source.tab || source.rowNumber != null
          ? `?${source.tab ? `tab=${encodeURIComponent(source.tab)}` : ""}${
              source.rowNumber != null ? `${source.tab ? "&" : ""}row=${source.rowNumber - 1}` : ""
            }`
          : ""
      }`
    : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs space-y-0.5" asChild>
            <div>
              {hasSource ? (
                <>
                  {source?.tab && (
                    <span className="block">
                      Tab: <span className="font-mono">{source.tab}</span>
                      {source?.rowNumber != null && (
                        <> · Row <span className="font-mono">{source.rowNumber}</span></>
                      )}
                    </span>
                  )}
                  {source?.sheet && (
                    <span className="block">
                      Sheet: <span className="font-mono">{source.sheet}</span>
                    </span>
                  )}
                  {source?.sourceFile && (
                    <span className="block truncate" title={source.sourceFile}>
                      File: <span className="font-mono">{source.sourceFile}</span>
                    </span>
                  )}
                  {source?.reportPeriod && (
                    <span className="block">Periode: {source.reportPeriod}</span>
                  )}
                </>
              ) : (
                <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                  Manual entry
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        {row && (
          <div className="space-y-2 pt-2">
            {fields.map((f, i) => (
              <div key={i} className="flex justify-between text-sm gap-3">
                <span className="text-muted-foreground shrink-0">{f.label}</span>
                <span className="font-medium text-right min-w-0 truncate">
                  {f.value == null || f.value === "" ? "—" : String(f.value)}
                </span>
              </div>
            ))}
          </div>
        )}

        {deepLink && (
          <Link
            href={deepLink}
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 text-xs text-primary font-medium hover:underline pt-2 border-t"
          >
            Buka di laporan sumber {source?.tab && `(tab ${source.tab})`} <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </DialogContent>
    </Dialog>
  );
}
