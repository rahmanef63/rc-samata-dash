"use client";

import { Suspense } from "react";
import { MultiFileUploader } from "@/features/universal-import/components/MultiFileUploader";
import { PageHeader } from "@/shared/components/PageHeader";
import { UploadCloud } from "lucide-react";

export default function UnifiedUploadPage() {
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Upload Universal"
        description="Satu dropzone untuk semua jenis file (Excel/CSV). Drop beberapa file sekaligus — sistem otomatis kenali format tiap file, ranking confidence, dan kasih opsi override manual sebelum import."
        icon={UploadCloud}
      />
      <Suspense fallback={<div className="text-sm text-muted-foreground">Memuat…</div>}>
        <MultiFileUploader />
      </Suspense>
    </div>
  );
}
