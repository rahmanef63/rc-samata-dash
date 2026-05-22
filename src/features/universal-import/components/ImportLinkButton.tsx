"use client";

import Link from "next/link";
import { UploadCloud } from "lucide-react";

// Reusable "Import" pill that navigates to the universal /import page.
// Drop it into PageHeader.action on any table page so every CRUD surface
// has a consistent way into the universal upload flow.
export function ImportLinkButton({ hint }: { hint?: string }) {
  return (
    <Link
      href="/import"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold transition-colors shadow-sm"
      title={hint ?? "Buka halaman import universal — auto-detect format file"}
    >
      <UploadCloud className="h-3.5 w-3.5 text-primary" />
      Import
    </Link>
  );
}
