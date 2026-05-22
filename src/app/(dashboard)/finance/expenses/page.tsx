"use client";

import { useQuery } from "convex/react";
import { Wallet } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { ExpensesNotionView } from "@/features/expenses/components/ExpensesNotionView";
import { PageHeader } from "@/shared/components";
import { ImportLinkButton } from "@/features/universal-import/components/ImportLinkButton";

export default function Page() {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  if (!branchId) return <p className="p-8 text-center text-sm text-muted-foreground">Memuat cabang...</p>;
  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      <PageHeader
        icon={Wallet}
        title="Pengeluaran"
        description="Semua expense cabang — sort/filter/search, edit kategori inline (atau tambah baru), export CSV."
        action={<ImportLinkButton />}
      />
      <ExpensesNotionView branchId={branchId} />
    </div>
  );
}
