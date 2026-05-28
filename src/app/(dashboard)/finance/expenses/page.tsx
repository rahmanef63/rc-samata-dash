"use client";

import { Wallet } from "lucide-react";
import { ExpensesNotionView } from "@/features/expenses/components/ExpensesNotionView";
import { ImportLinkButton } from "@/features/universal-import/components/ImportLinkButton";
import { ReportPage } from "@/features/report-pdf";

export default function Page() {
  return (
    <ReportPage
      icon={Wallet}
      title="Pengeluaran"
      description="Semua expense cabang — sort/filter/search, edit kategori inline (atau tambah baru), export CSV."
      reportTitle="Laporan Pengeluaran"
      extraActions={<ImportLinkButton />}
      printHint="Cetak PDF — pilih view 'Tabel' dulu untuk hasil terbaik"
    >
      <ExpensesNotionView />
    </ReportPage>
  );
}
