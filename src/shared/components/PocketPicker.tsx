"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type Pocket = {
  _id: Id<"pockets">;
  name: string;
  kind: string;
  bankAccount?: string;
  isActive: boolean;
};

export function PocketPicker({
  value,
  onChange,
  label = "Sumber Pocket",
  description = "Pilih pocket sumber kas. Auto-derive kalau dibiarkan kosong.",
  required = false,
  id = "pocket",
}: {
  value: Id<"pockets"> | undefined;
  onChange: (id: Id<"pockets"> | undefined) => void;
  label?: string;
  description?: string;
  required?: boolean;
  id?: string;
}) {
  const pockets = useQuery(api.features.pockets.queries.listPockets, { activeOnly: true }) as Pocket[] | undefined;

  return (
    <div className="space-y-1">
      <Label htmlFor={id}>
        {label}{required && <span className="text-destructive"> *</span>}
      </Label>
      <Select
        value={value ?? "__auto__"}
        onValueChange={(v) => onChange(v === "__auto__" ? undefined : (v as Id<"pockets">))}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="Auto-derive" />
        </SelectTrigger>
        <SelectContent>
          {!required && <SelectItem value="__auto__">Auto-derive (heuristik)</SelectItem>}
          {pockets?.map((p) => (
            <SelectItem key={p._id} value={p._id}>
              {p.name}
              {p.bankAccount ? ` · ${p.bankAccount}` : ""}
            </SelectItem>
          ))}
          {pockets && pockets.length === 0 && (
            <SelectItem value="__none__" disabled>
              (Belum ada pocket. Setup di /finance/pockets)
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      <p className="text-[10px] text-muted-foreground">{description}</p>
    </div>
  );
}
