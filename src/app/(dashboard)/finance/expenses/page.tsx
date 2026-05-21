"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { LayoutGrid, Table2 } from "lucide-react";
import { api } from "../../../../../convex/_generated/api";
import { ExpensesOverview } from "@/features/expenses";
import { ExpensesNotionView } from "@/features/expenses/components/ExpensesNotionView";
import { cn } from "@/lib/utils";

type Mode = "notion" | "legacy";

export default function Page() {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branchId = branches?.[0]?._id;
  const [mode, setMode] = useState<Mode>("legacy");

  return (
    <div className="space-y-4">
      <div className="px-4 md:px-6 lg:px-8 pt-4">
        <div className="inline-flex gap-1 rounded-xl bg-muted p-1">
          <button
            onClick={() => setMode("legacy")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5",
              mode === "legacy" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Table2 className="h-3.5 w-3.5" /> Legacy
          </button>
          <button
            onClick={() => setMode("notion")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5",
              mode === "notion" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Notion View
          </button>
        </div>
      </div>
      {mode === "legacy"
        ? <ExpensesOverview />
        : branchId
          ? <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8"><ExpensesNotionView branchId={branchId} /></div>
          : <p className="p-8 text-center text-sm text-muted-foreground">Memuat cabang...</p>
      }
    </div>
  );
}
