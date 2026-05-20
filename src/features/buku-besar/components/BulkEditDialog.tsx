"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Save, X as XIcon, Loader2 } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useBulkPatch } from "../api";
import type { BukuBesarRow } from "./BukuBesarTable";

// Bulk-edit dialog: user picks ONE field to bulk-change across all
// selected rows. We dispatch per sourceTable so the right backend
// mutation handles the patch. Keeps the UX safe — bulk operations
// touch one field at a time, not all fields at once.

type EditableField =
  | { key: "date"; label: "Tanggal"; type: "date" }
  | { key: "status"; label: "Status"; type: "select"; options: string[] }
  | { key: "amount"; label: "Nominal"; type: "number" }
  | { key: "notes"; label: "Catatan"; type: "text" }
  | { key: "reference"; label: "Reference"; type: "text" };

const FIELDS: EditableField[] = [
  { key: "date", label: "Tanggal", type: "date" },
  { key: "status", label: "Status", type: "select", options: ["open", "partial", "paid", "overdue", "pending", "completed", "submitted", "verified"] },
  { key: "amount", label: "Nominal", type: "number" },
  { key: "notes", label: "Catatan", type: "text" },
  { key: "reference", label: "Reference", type: "text" },
];

// Map field name → backend field per source table.
function patchForRow(row: BukuBesarRow, field: EditableField["key"], value: string | number): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (field === "date") {
    if (row.sourceTable === "payables") out.invoiceDate = value;
    else if (row.sourceTable === "paymentReceipts") out.paidDate = value;
    else if (row.sourceTable === "ownerTransfers") out.transferDate = value;
    else if (row.sourceTable === "dailyClosings") out.businessDate = value;
  } else if (field === "status") {
    out.status = value;
  } else if (field === "amount") {
    out.amount = Number(value) || 0;
  } else if (field === "notes") {
    if (row.sourceTable === "payables") out.description = value;
    else if (row.sourceTable === "paymentReceipts") out.notes = value;
    else if (row.sourceTable === "ownerTransfers") out.description = value;
    // dailyClosings has no notes field
  } else if (field === "reference") {
    if (row.sourceTable === "paymentReceipts") out.reference = value;
    else if (row.sourceTable === "ownerTransfers") out.referenceNo = value;
    // payables uses paymentReference but that's auto; skip user edit here
  }
  return out;
}

export function BulkEditDialog({
  open,
  onClose,
  rows,
  branchId,
}: {
  open: boolean;
  onClose: () => void;
  rows: BukuBesarRow[];
  branchId: Id<"branches">;
}) {
  const bulkPatch = useBulkPatch();
  const [field, setField] = useState<EditableField["key"]>("date");
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!value.trim()) {
      toast.error("Isi value dulu");
      return;
    }
    setSaving(true);
    try {
      const patches = rows.map((r) => ({
        id: r.id,
        sourceTable: r.sourceTable,
        data: patchForRow(r, field, value),
      })).filter((p) => Object.keys(p.data).length > 0);

      if (patches.length === 0) {
        toast.error(`Field "${field}" tidak applicable untuk row terpilih`);
        return;
      }

      const res = await bulkPatch({ branchId, patches });
      toast.success(`${res.updated} row di-update`);
      if (res.errors.length > 0) {
        toast.message(`${res.errors.length} row error`);
      }
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk update gagal");
    } finally {
      setSaving(false);
    }
  };

  const fieldDef = FIELDS.find((f) => f.key === field)!;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Edit · {rows.length} row</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <label className="flex flex-col gap-1">
            <span className="font-semibold uppercase text-[10px] text-muted-foreground">Field yang diubah</span>
            <select
              value={field}
              onChange={(e) => { setField(e.target.value as EditableField["key"]); setValue(""); }}
              className="px-2 py-1.5 rounded border border-border bg-background"
            >
              {FIELDS.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-semibold uppercase text-[10px] text-muted-foreground">Value baru</span>
            {fieldDef.type === "select" ? (
              <select value={value} onChange={(e) => setValue(e.target.value)} className="px-2 py-1.5 rounded border border-border bg-background">
                <option value="">— pilih —</option>
                {fieldDef.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : fieldDef.type === "date" ? (
              <input type="date" value={value} onChange={(e) => setValue(e.target.value)} className="px-2 py-1.5 rounded border border-border bg-background" />
            ) : fieldDef.type === "number" ? (
              <input type="text" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" className="px-2 py-1.5 rounded border border-border bg-background font-mono" />
            ) : (
              <input type="text" value={value} onChange={(e) => setValue(e.target.value)} className="px-2 py-1.5 rounded border border-border bg-background" />
            )}
          </label>
          <p className="text-[10px] text-muted-foreground italic">
            Field yang tidak applicable di sourceTable tertentu akan di-skip (mis. &quot;Catatan&quot; tidak ada di Setoran Harian).
          </p>
        </div>
        <DialogFooter>
          <button onClick={onClose} disabled={saving} className="px-3 py-1.5 rounded-lg border border-border bg-card hover:bg-muted/50 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
            <XIcon className="h-3 w-3" /> Batal
          </button>
          <button onClick={handleSave} disabled={saving} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Menyimpan..." : `Update ${rows.length} Row`}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
