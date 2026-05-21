"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { Page, PropertyValue } from "@/features/notion-shell/types";
import { EntityNotionView } from "@/features/notion-shell-wrapper/EntityNotionView";

type Row = {
  _id: string; _creationTime: number;
  paidDate: string; amount: number; paidBy: string;
  channel?: string; reference?: string; bankAccount?: string; notes?: string;
  proofFileName?: string; anomalyFlag?: string;
};

const PROPS = [
  { id: "paidDate", name: "Tanggal Bayar", type: "date" as const },
  { id: "amount",   name: "Nominal", type: "number" as const, numberFormat: "currency" as const },
  { id: "paidBy",   name: "Dibayar Oleh", type: "select" as const, options: [
    { id: "owner", name: "Owner", color: "purple" as const },
    { id: "pic",   name: "PIC",   color: "blue" as const },
  ] },
  { id: "channel",     name: "Channel", type: "text" as const },
  { id: "reference",   name: "No. Ref", type: "text" as const },
  { id: "bankAccount", name: "No. Rekening", type: "text" as const },
  { id: "notes",       name: "Catatan", type: "text" as const },
  { id: "proofFileName", name: "File Bukti", type: "text" as const },
  { id: "anomalyFlag",   name: "Anomali", type: "select" as const, options: [
    { id: "ok",           name: "OK",            color: "green" as const },
    { id: "mislabel",     name: "Mislabel",      color: "yellow" as const },
    { id: "duplicate",    name: "Duplikat",      color: "blue" as const },
    { id: "not_transfer", name: "Bukan Transfer", color: "red" as const },
    { id: "partial",      name: "Partial",       color: "orange" as const },
  ] },
];

const VIEWS = [
  { id: "v_table", name: "Tabel", type: "table" as const,
    sorts: [{ propertyId: "paidDate", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_board", name: "Board (Anomali)", type: "board" as const, groupBy: "anomalyFlag",
    sorts: [{ propertyId: "paidDate", direction: "desc" as const }], filters: [], search: "" },
  { id: "v_calendar", name: "Kalender", type: "calendar" as const, groupBy: "paidDate",
    sorts: [{ propertyId: "paidDate", direction: "desc" as const }], filters: [], search: "" },
];

const EDITABLE = new Set(["paidDate", "amount", "paidBy", "channel", "reference", "bankAccount", "notes", "anomalyFlag"]);

function toPage(r: Row): Page {
  return {
    id: r._id, parentId: null,
    title: `Rp ${r.amount.toLocaleString("id-ID")} · ${r.paidDate}`,
    icon: r.anomalyFlag && r.anomalyFlag !== "ok" ? "⚠️" : r.paidBy === "owner" ? "🟣" : "🔵",
    blocks: [], favorite: false, trashed: false,
    createdAt: r._creationTime, updatedAt: r._creationTime,
    rowOfDatabaseId: "db_payment_receipts",
    rowProps: {
      paidDate: r.paidDate, amount: r.amount, paidBy: r.paidBy,
      channel: r.channel ?? "", reference: r.reference ?? "",
      bankAccount: r.bankAccount ?? "", notes: r.notes ?? "",
      proofFileName: r.proofFileName ?? "", anomalyFlag: r.anomalyFlag ?? "ok",
    },
  };
}

export function PaymentReceiptsNotionView({ branchId }: { branchId: Id<"branches"> }) {
  const rows = useQuery(api.features.closing.queries.listPaymentReceipts, { branchId }) as Row[] | undefined;
  const patch = useMutation(api.features.closing.mutations.patchPaymentReceipt);
  const remove = useMutation(api.features.closing.mutations.removePaymentReceipt);

  return (
    <EntityNotionView<Row>
      config={{
        databaseId: "db_payment_receipts", databaseName: "Bukti Bayar", databaseIcon: "🧾",
        properties: PROPS, views: VIEWS,
        propToColumn: (id) => EDITABLE.has(id) ? id : null,
        toPage, exportFilenamePrefix: "bukti-bayar",
      }}
      rows={rows}
      onRowUpdate={async (id, col, val) => {
        await patch({ id: id as Id<"paymentReceipts">, [col]: val } as Parameters<typeof patch>[0]);
      }}
      onBulkPatch={async (patches) => {
        let updated = 0; const errors: { id: string; message: string }[] = [];
        for (const p of patches) {
          try { await patch({ id: p.id as Id<"paymentReceipts">, ...p.data } as Parameters<typeof patch>[0]); updated++; }
          catch (e) { errors.push({ id: p.id, message: e instanceof Error ? e.message : "patch failed" }); }
        }
        return { updated, errors };
      }}
      onBulkDelete={async (ids) => {
        let deleted = 0;
        for (const id of ids) { try { await remove({ id: id as Id<"paymentReceipts"> }); deleted++; } catch { /* skip */ } }
        return { deleted };
      }}
    />
  );
}
