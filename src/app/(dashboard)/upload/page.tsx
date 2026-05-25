"use client";

import { Suspense } from "react";
import { MultiFileUploader } from "@/features/universal-import/components/MultiFileUploader";
import { UploadHistory } from "@/features/universal-import/components/UploadHistory";
import { PageHeader } from "@/shared/components/PageHeader";
import { UploadCloud } from "lucide-react";

export default function UnifiedUploadPage() {
  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <PageHeader
        title="Upload Universal"
        description="Satu dropzone untuk semua jenis file (Excel/CSV). Drop beberapa file sekaligus — sistem otomatis kenali format tiap file, ranking confidence, dan kasih opsi override manual sebelum import."
        icon={UploadCloud}
      />
      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Memuat…</div>}>
          <MultiFileUploader />
        </Suspense>
        <div className="xl:sticky xl:top-4 xl:self-start xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
          <Suspense fallback={<div className="text-sm text-muted-foreground">Memuat history…</div>}>
            <UploadHistory />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
