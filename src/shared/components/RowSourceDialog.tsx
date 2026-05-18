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
 * Pass `row` (any record). The dialog renders:
 *  - source block (file / sheet / period) when row carries ETL fields
 *  - "Manual" badge otherwise
 *  - the row fields below (display label → string value)
 *  - "Buka laporan sumber" link when `reportId` is present
 */
export type RowField = { label: string; value: string | number | null | undefined };

export type RowSource = {
  sheet?: string;
  sourceFile?: string;
  reportPeriod?: string;
  reportId?: string;
};

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
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs space-y-0.5">
            {hasSource ? (
              <>
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

        {source?.reportId && (
          <Link
            href={`/laporan/${source.reportId}`}
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 text-xs text-primary font-medium hover:underline pt-2 border-t"
          >
            Buka laporan sumber <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </DialogContent>
    </Dialog>
  );
}
