"use client";

import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranchScope } from "@/features/dashboard/context/BranchScopeContext";
import type { Id } from "../../../convex/_generated/dataModel";

const ALL_VALUE = "__all__";

type Props = {
  showAllOption?: boolean;
  className?: string;
};

export function BranchSelector({ showAllOption = true, className }: Props) {
  const { branchId, setBranchId, branches, isLoading } = useBranchScope();

  if (isLoading) {
    return (
      <div className={`h-8 w-32 rounded-md bg-muted/40 animate-pulse ${className ?? ""}`} />
    );
  }
  if (!branches || branches.length === 0) return null;

  const current = branchId === null ? ALL_VALUE : String(branchId);

  return (
    <Select
      value={current}
      onValueChange={(v) => {
        if (v === ALL_VALUE) setBranchId(null);
        else setBranchId(v as Id<"branches">);
      }}
    >
      <SelectTrigger
        className={`h-8 w-auto min-w-32 gap-1.5 text-xs ${className ?? ""}`}
      >
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue placeholder="Pilih cabang" />
      </SelectTrigger>
      <SelectContent align="end">
        {showAllOption && branches.length > 1 && (
          <SelectItem value={ALL_VALUE}>Semua cabang</SelectItem>
        )}
        {branches.map((b) => (
          <SelectItem key={String(b._id)} value={String(b._id)}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
