import { Suspense } from "react";
import { UniversalImport } from "@/features/universal-import/components/UniversalImport";
import { PageHeader } from "@/shared/components/PageHeader";
import { UploadCloud } from "lucide-react";

export default function ImportPage() {
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Import Universal"
        description="Satu drop zone — auto-detect format file (Excel/CSV) → preview per tabel → commit ke database. Mendukung weekly SV, pergantian, tunjangan, master vendor, bulk piutang, statement bank, dan ZIA Group multi-pocket."
        icon={UploadCloud}
      />
      <Suspense fallback={<div className="text-sm text-muted-foreground">Memuat…</div>}>
        <UniversalImport />
      </Suspense>
    </div>
  );
}
