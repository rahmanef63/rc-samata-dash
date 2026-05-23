"use client";

import { Wallet } from "lucide-react";
import { ExpensesNotionView } from "@/features/expenses/components/ExpensesNotionView";
import { PageHeader } from "@/shared/components";
import { ImportLinkButton } from "@/features/universal-import/components/ImportLinkButton";

export default function Page() {
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={Wallet}
        title="Pengeluaran"
        description="Semua expense cabang — sort/filter/search, edit kategori inline (atau tambah baru), export CSV."
        action={<ImportLinkButton />}
      />
      <ExpensesNotionView />
    </div>
  );
}
