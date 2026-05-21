import { mutation } from "../../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../../shared/auth";
import { insertAuditLog } from "../../shared/helpers";
import { buildVendorIndex } from "../../shared/vendorResolver";
import { CSV_SHEET } from "../../shared/sheetNames";
import { mirrorTx } from "../transactions/_helpers";
import type { Id } from "../../_generated/dataModel";

const classifyValidator = v.union(
  v.literal("payable"),
  v.literal("receipt"),
  v.literal("owner_transfer_to"),
  v.literal("owner_transfer_from"),
  v.literal("anomaly"),
);

const anomalyFlagValidator = v.union(
  v.literal("ok"),
  v.literal("mislabel"),
  v.literal("duplicate"),
  v.literal("not_transfer"),
  v.literal("partial"),
);

// ─── Import laporan-pic LONG CSV (TRANSAKSI format) ─────────
// Caller classifies each row client-side (UI shows preview) and we
// trust that classification here. UI is also free to override before
// commit if user manually re-categorizes anomalies.
export const importLaporanPicLong = mutation({
  args: {
    branchId: v.id("branches"),
    sourceFileName: v.optional(v.string()),
    sourceSheetName: v.optional(v.string()),
    rows: v.array(v.object({
      paidDate: v.string(),
      amount: v.number(),
      paidBy: v.union(v.literal("pic"), v.literal("pic2"), v.literal("vendor"), v.literal("other")),
      vendorName: v.string(),
      channel: v.optional(v.string()),
      reference: v.optional(v.string()),
      notes: v.optional(v.string()),
      fileName: v.optional(v.string()),
      sourceRowNumber: v.optional(v.number()),
      classification: classifyValidator,
      anomalyFlag: v.optional(anomalyFlagValidator),
    })),
  },
  handler: async (ctx, { branchId, rows, sourceFileName, sourceSheetName }) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();

    const vendors = await ctx.db.query("vendors").take(2000);
    const vendorIdx = buildVendorIndex(vendors);
    const resolveVendor = vendorIdx.resolve;

    const openPayables = (await ctx.db.query("payables")
      .withIndex("by_branch", (q) => q.eq("branchId", branchId))
      .take(5000))
      .filter((p) => p.status === "open" || p.status === "partial" || p.status === "overdue");

    let payablesCreated = 0;
    let receiptsCreated = 0;
    let receiptsLinked = 0;
    let transfersCreated = 0;
    let anomaliesCreated = 0;
    let unresolved = 0;
    const unresolvedVendors = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = r.sourceRowNumber ?? (i + 2); // header is line 1, data starts row 2
      try {
        if (r.classification === "payable") {
          const vendor = resolveVendor(r.vendorName);
          if (!vendor) {
            unresolvedVendors.add(r.vendorName);
            unresolved++;
            continue;
          }
          const payableId = await ctx.db.insert("payables", {
            vendorId: vendor._id,
            vendorName: vendor.name,
            invoiceDate: r.paidDate,
            dueDate: r.paidDate, // long CSV doesn't carry separate due — caller may correct later
            amount: r.amount,
            paidAmount: 0,
            status: "open" as const,
            description: [r.notes, r.reference ? `ref: ${r.reference}` : null].filter(Boolean).join(" · "),
            refPdfFile: r.fileName,
            sourceFileName: sourceFileName ?? r.fileName,
            sourceSheetName,
            sourceRowNumber: rowNum,
            branchId,
          });
          const txId = await mirrorTx(ctx, {
            branchId, kind: "invoice", direction: "in",
            date: r.paidDate, amount: r.amount, paidAmount: 0, status: "open",
            vendorId: vendor._id, payableId,
            counterparty: vendor.name, description: r.notes, reference: r.reference,
            proofFileName: r.fileName,
            sourceKind: "laporan_pic_csv",
            sourceFileName: sourceFileName ?? r.fileName,
            sourceSheetName, sourceRowNumber: rowNum,
            userId,
          });
          await ctx.db.patch(payableId, { transactionId: txId });
          payablesCreated++;
        } else if (r.classification === "receipt") {
          const vendor = resolveVendor(r.vendorName);
          let payableId: Id<"payables"> | undefined;
          if (vendor) {
            const candidate = openPayables
              .filter((p) => p.vendorId === vendor._id && (p.amount - p.paidAmount) > 0)
              .sort((a, b) => a.invoiceDate.localeCompare(b.invoiceDate))[0];
            if (candidate) payableId = candidate._id;
          }
          const receiptId = await ctx.db.insert("paymentReceipts", {
            payableId,
            amount: r.amount,
            paidDate: r.paidDate,
            paidBy: r.paidBy === "pic2" ? "pic" : "pic",
            channel: r.channel,
            reference: r.reference,
            bankAccount: r.reference,
            notes: r.notes,
            proofFileName: r.fileName,
            anomalyFlag: r.anomalyFlag ?? "ok",
            sourceFileName: sourceFileName ?? r.fileName,
            sourceSheetName,
            sourceRowNumber: rowNum,
            branchId,
            uploadedAt: now,
            uploadedBy: userId,
          });
          const txId = await mirrorTx(ctx, {
            branchId, kind: "payment", direction: "out",
            date: r.paidDate, amount: r.amount, status: payableId ? "linked" : "unlinked",
            payableId, receiptId,
            reference: r.reference, bankAccount: r.reference,
            paidBy: "pic", method: r.channel, notes: r.notes,
            anomalyFlag: r.anomalyFlag ?? "ok", proofFileName: r.fileName,
            sourceKind: "laporan_pic_csv",
            sourceFileName: sourceFileName ?? r.fileName,
            sourceSheetName, sourceRowNumber: rowNum,
            userId,
          });
          await ctx.db.patch(receiptId, { transactionId: txId });
          receiptsCreated++;
          if (payableId) {
            const p = await ctx.db.get(payableId);
            if (p) {
              const newPaid = Math.min(p.amount, p.paidAmount + r.amount);
              const newStatus: "open" | "partial" | "paid" | "overdue" =
                newPaid >= p.amount && p.amount > 0 ? "paid"
                : newPaid > 0 ? "partial"
                : p.status;
              await ctx.db.patch(payableId, { paidAmount: newPaid, status: newStatus });
              const refIdx = openPayables.findIndex((x) => x._id === payableId);
              if (refIdx >= 0) openPayables[refIdx] = { ...openPayables[refIdx], paidAmount: newPaid, status: newStatus };
            }
            receiptsLinked++;
          }
        } else if (r.classification === "owner_transfer_to" || r.classification === "owner_transfer_from") {
          const direction = r.classification === "owner_transfer_to" ? "branch_to_owner" as const : "owner_to_branch" as const;
          const transferId = await ctx.db.insert("ownerTransfers", {
            transferDate: r.paidDate,
            direction,
            purpose: "night_transfer" as const,
            amount: r.amount,
            referenceNo: r.reference ?? "",
            status: "completed" as const,
            sourceFileName: sourceFileName ?? r.fileName,
            sourceSheetName,
            sourceRowNumber: rowNum,
            branchId,
          });
          const txId = await mirrorTx(ctx, {
            branchId, kind: "transfer", direction: "transfer",
            date: r.paidDate, amount: r.amount, status: "completed",
            counterparty: direction === "branch_to_owner" ? "OWNER" : "OWNER (incoming)",
            description: r.notes, reference: r.reference, method: direction,
            sourceKind: "laporan_pic_csv",
            sourceFileName: sourceFileName ?? r.fileName,
            sourceSheetName, sourceRowNumber: rowNum,
            userId,
          });
          await ctx.db.patch(transferId, { transactionId: txId });
          transfersCreated++;
        } else {
          // anomaly — store as receipt with anomalyFlag set, no payable link
          const receiptId = await ctx.db.insert("paymentReceipts", {
            amount: r.amount,
            paidDate: r.paidDate,
            paidBy: "pic" as const,
            channel: r.channel,
            reference: r.reference,
            bankAccount: r.reference,
            notes: r.notes ?? `${r.vendorName} (anomali)`,
            proofFileName: r.fileName,
            anomalyFlag: r.anomalyFlag ?? "not_transfer",
            sourceFileName: sourceFileName ?? r.fileName,
            sourceSheetName,
            sourceRowNumber: rowNum,
            branchId,
            uploadedAt: now,
            uploadedBy: userId,
          });
          const txId = await mirrorTx(ctx, {
            branchId, kind: "anomaly", direction: "out",
            date: r.paidDate, amount: r.amount, status: "unlinked",
            receiptId,
            counterparty: r.vendorName,
            reference: r.reference, bankAccount: r.reference,
            paidBy: "pic", method: r.channel, notes: r.notes,
            anomalyFlag: r.anomalyFlag ?? "not_transfer", proofFileName: r.fileName,
            sourceKind: "laporan_pic_csv",
            sourceFileName: sourceFileName ?? r.fileName,
            sourceSheetName, sourceRowNumber: rowNum,
            userId,
          });
          await ctx.db.patch(receiptId, { transactionId: txId });
          anomaliesCreated++;
        }
      } catch {
        // best-effort — keep importing
      }
    }

    await insertAuditLog(ctx, {
      entityType: "paymentReceipts",
      entityId: "" as Id<"paymentReceipts">,
      action: "create",
      description: `Import laporan PIC (long) — ${payablesCreated} payable, ${receiptsCreated} bayar (${receiptsLinked} linked), ${transfersCreated} transfer owner, ${anomaliesCreated} anomali, ${unresolved} vendor unresolved`,
      actedBy: userId, branchId,
    });

    return {
      payablesCreated, receiptsCreated, receiptsLinked,
      transfersCreated, anomaliesCreated, unresolved,
      unresolvedVendors: [...unresolvedVendors],
    };
  },
});

// ─── Import laporan-pic PIVOT CSV (MATCH_PIUTANG format) ────
export const importLaporanPicPivot = mutation({
  args: {
    branchId: v.id("branches"),
    sourceFileName: v.optional(v.string()),
    sourceSheetName: v.optional(v.string()),
    rows: v.array(v.object({
      invoiceDate: v.string(),
      vendor: v.string(),
      amount: v.number(),
      refPdfFile: v.optional(v.string()),
      statusRekap: v.optional(v.string()),
      matchStatus: v.string(),
      paymentDate: v.optional(v.string()),
      paymentAmount: v.optional(v.number()),
      paymentVendor: v.optional(v.string()),
      paymentFile: v.optional(v.string()),
      keterangan: v.optional(v.string()),
      splitTotal: v.optional(v.number()),
      splitNo: v.optional(v.string()),
      sourceRowNumber: v.optional(v.number()),
    })),
  },
  handler: async (ctx, { branchId, rows, sourceFileName, sourceSheetName }) => {
    const userId = await requireAuth(ctx);
    const now = Date.now();

    const vendors = await ctx.db.query("vendors").take(2000);
    const vendorIdx = buildVendorIndex(vendors);
    const resolveVendor = vendorIdx.resolve;

    let payablesCreated = 0;
    let receiptsCreated = 0;
    let unresolved = 0;
    const unresolvedVendors = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = r.sourceRowNumber ?? (i + 2);
      try {
        const vendor = resolveVendor(r.vendor);
        if (!vendor) {
          unresolvedVendors.add(r.vendor);
          unresolved++;
          continue;
        }

        const isMatched = r.matchStatus === "MATCH_EXACT";
        const paidAmount = isMatched && r.paymentAmount ? r.paymentAmount : 0;
        const status: "open" | "partial" | "paid" | "overdue" =
          paidAmount >= r.amount && r.amount > 0 ? "paid"
          : paidAmount > 0 ? "partial"
          : "open";

        const description = [
          r.keterangan,
          r.splitNo ? `split ${r.splitNo}` : null,
          r.splitTotal ? `dari total Rp ${r.splitTotal.toLocaleString("id-ID")}` : null,
          r.statusRekap && r.statusRekap !== "OK" ? `[${r.statusRekap}]` : null,
        ].filter(Boolean).join(" · ");

        const payableId = await ctx.db.insert("payables", {
          vendorId: vendor._id,
          vendorName: vendor.name,
          invoiceDate: r.invoiceDate,
          dueDate: r.invoiceDate,
          amount: r.amount,
          paidAmount,
          status,
          description,
          refPdfFile: r.refPdfFile,
          sourceFileName: sourceFileName ?? r.refPdfFile,
          sourceSheetName,
          sourceRowNumber: rowNum,
          branchId,
        });
        const txInvId = await mirrorTx(ctx, {
          branchId, kind: "invoice", direction: "in",
          date: r.invoiceDate, amount: r.amount, paidAmount, status,
          vendorId: vendor._id, payableId,
          counterparty: vendor.name, description,
          proofFileName: r.refPdfFile,
          sourceKind: "laporan_pic_csv",
          sourceFileName: sourceFileName ?? r.refPdfFile,
          sourceSheetName, sourceRowNumber: rowNum,
          userId,
        });
        await ctx.db.patch(payableId, { transactionId: txInvId });

        if (isMatched && r.paymentDate && r.paymentAmount) {
          const receiptId = await ctx.db.insert("paymentReceipts", {
            payableId,
            amount: r.paymentAmount,
            paidDate: r.paymentDate,
            paidBy: "pic" as const,
            channel: "transfer",
            reference: r.paymentVendor,
            notes: r.keterangan,
            proofFileName: r.paymentFile,
            anomalyFlag: r.statusRekap && r.statusRekap !== "OK" ? "partial" as const : "ok" as const,
            sourceFileName: sourceFileName ?? r.refPdfFile,
            sourceSheetName: sourceSheetName ? `${sourceSheetName}/payment` : "payment",
            sourceRowNumber: rowNum,
            branchId,
            uploadedAt: now,
            uploadedBy: userId,
          });
          const txPayId = await mirrorTx(ctx, {
            branchId, kind: "payment", direction: "out",
            date: r.paymentDate, amount: r.paymentAmount, status: "linked",
            payableId, receiptId, linkedTxId: txInvId,
            counterparty: vendor.name,
            reference: r.paymentVendor, notes: r.keterangan,
            paidBy: "pic", method: "transfer",
            anomalyFlag: r.statusRekap && r.statusRekap !== "OK" ? "partial" : "ok",
            proofFileName: r.paymentFile,
            sourceKind: "laporan_pic_csv",
            sourceFileName: sourceFileName ?? r.refPdfFile,
            sourceSheetName: sourceSheetName ? `${sourceSheetName}/payment` : "payment",
            sourceRowNumber: rowNum,
            userId,
          });
          await ctx.db.patch(receiptId, { transactionId: txPayId });
          receiptsCreated++;
        }
        payablesCreated++;
      } catch {
        // skip row
      }
    }

    await insertAuditLog(ctx, {
      entityType: "payables",
      entityId: "" as Id<"payables">,
      action: "create",
      description: `Import laporan PIC (pivot) — ${payablesCreated} payable + ${receiptsCreated} bayar, ${unresolved} vendor unresolved`,
      actedBy: userId, branchId,
    });

    return {
      payablesCreated, receiptsCreated, unresolved,
      unresolvedVendors: [...unresolvedVendors],
    };
  },
});
