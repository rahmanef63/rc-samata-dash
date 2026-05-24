"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquareText, Upload, RefreshCw, Check, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatRpFull } from "@/shared/lib";

type MatchStatus = "match" | "diskrepansi" | "missing" | "unverified";

type Mismatch = {
  _id: Id<"waReportDaily">;
  date: string;
  sender: string;
  matchStatus: MatchStatus;
  waSalesCash?: number;
  waSalesNonCash?: number;
  xlsxGrossSales?: number;
  xlsxCashIn?: number;
  diffCash?: number;
  diffTotal?: number;
};

const STATUS_META: Record<MatchStatus, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  match: { label: "Match", color: "bg-green-100 text-green-700", icon: Check },
  diskrepansi: { label: "Diskrepansi", color: "bg-red-100 text-red-700", icon: AlertTriangle },
  missing: { label: "Missing", color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle },
  unverified: { label: "Belum Terverifikasi", color: "bg-slate-100 text-slate-600", icon: AlertTriangle },
};

export function WaAuditOverview() {
  const rows = useQuery(api.features.waAudit.queries.listMismatches, {}) as Mismatch[] | undefined;
  const upsert = useMutation(api.features.waAudit.mutations.upsertWaReport);
  const recompute = useMutation(api.features.waAudit.mutations.recomputeAllMatchStatus);
  const remove = useMutation(api.features.waAudit.mutations.deleteWaReport);

  const [rawText, setRawText] = useState("");
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideSender, setOverrideSender] = useState("");
  const [uploading, setUploading] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [showInput, setShowInput] = useState(false);

  const handleUpload = async () => {
    if (!rawText.trim()) {
      toast.error("Paste raw text WA dulu");
      return;
    }
    setUploading(true);
    try {
      const res = await upsert({
        rawText,
        date: overrideDate || undefined,
        sender: overrideSender || undefined,
      });
      if (res.parseWarnings.length > 0) {
        toast.warning(`Tersimpan tapi ada warning: ${res.parseWarnings.join("; ")}`);
      } else {
        toast.success(`Tersimpan — status: ${res.matchStatus}`);
      }
      setRawText("");
      setOverrideDate("");
      setOverrideSender("");
      setShowInput(false);
    } catch (e) {
      toast.error("Gagal: " + (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      const res = await recompute({});
      toast.success(`Recompute: ${res.updated} dari ${res.total} berubah status`);
    } catch (e) {
      toast.error("Gagal: " + (e as Error).message);
    } finally {
      setRecomputing(false);
    }
  };

  const handleDelete = async (id: Id<"waReportDaily">, label: string) => {
    if (!confirm(`Hapus entry WA ${label}?`)) return;
    try {
      await remove({ id });
      toast.success("Dihapus");
    } catch (e) {
      toast.error("Gagal: " + (e as Error).message);
    }
  };

  if (!rows) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const counts = rows.reduce(
    (acc, r) => {
      acc[r.matchStatus] = (acc[r.matchStatus] ?? 0) + 1;
      return acc;
    },
    {} as Record<MatchStatus, number>,
  );

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="bg-primary rounded-2xl p-5 text-primary-foreground">
        <p className="text-xs opacity-80 mb-1">WA Daily Reports Diaudit</p>
        <p className="text-3xl font-bold tracking-tight">{rows.length}</p>
        <div className="flex flex-wrap gap-3 mt-2 text-xs opacity-90">
          <span>✓ Match: {counts.match ?? 0}</span>
          <span>⚠ Diskrepansi: {counts.diskrepansi ?? 0}</span>
          <span>? Missing: {counts.missing ?? 0}</span>
          <span>· Unverified: {counts.unverified ?? 0}</span>
        </div>
      </div>

      {/* Info strip */}
      <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 text-xs">
        <p className="font-medium">Tier-2 audit cross-check</p>
        <p className="text-muted-foreground mt-1">
          Paste raw WA chat SV harian → parser extract sales tunai/non-tunai/expense + posisi staff + status online channel. Cross-check vs dailyCashSummary xlsx (Tier-3). Toleransi Rp 5.000. Discrepancy &gt; tolerance = perlu reconcile.
        </p>
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{rows.length} entry</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRecompute} disabled={recomputing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${recomputing ? "animate-spin" : ""}`} />
            {recomputing ? "Recompute..." : "Recompute Match"}
          </Button>
          <Button size="sm" onClick={() => setShowInput(!showInput)}>
            <Upload className="h-4 w-4 mr-1" /> {showInput ? "Tutup" : "Paste WA"}
          </Button>
        </div>
      </div>

      {/* Input panel */}
      {showInput && (
        <div className="bg-card rounded-xl shadow-card p-4 space-y-3">
          <div className="space-y-1">
            <Label htmlFor="raw">Paste Raw WA Text</Label>
            <Textarea
              id="raw"
              rows={10}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={"LAPORAN HARIAN SV - 24 MEI 2026\nTunai: Rp 1.250.000\nNon Tunai: Rp 450.000\nPengeluaran: Rp 280.000\nGoFood: Rp 320.000\nGrabFood: Rp 130.000\n..."}
              className="font-mono text-xs"
            />
            <p className="text-[10px] text-muted-foreground">
              Parser auto-detect tanggal/sender/sales/pengeluaran/online channels. Field di bawah override kalau parser meleset.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ovd">Override Tanggal</Label>
              <Input id="ovd" type="date" value={overrideDate} onChange={(e) => setOverrideDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ovs">Override Sender</Label>
              <Input id="ovs" value={overrideSender} onChange={(e) => setOverrideSender(e.target.value)} placeholder="SV1, SPV, dll" />
            </div>
          </div>
          <Button onClick={handleUpload} disabled={uploading} className="w-full">
            {uploading ? "Parsing..." : "Parse & Simpan"}
          </Button>
        </div>
      )}

      {/* List */}
      {rows.length === 0 ? (
        <div className="bg-muted rounded-xl p-8 text-center">
          <MessageSquareText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">Belum ada WA daily report</p>
          <p className="text-xs text-muted-foreground mt-1">
            Klik <span className="font-medium">Paste WA</span> untuk submit laporan harian SV.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const meta = STATUS_META[r.matchStatus];
            const Icon = meta.icon;
            return (
              <div key={r._id} className="bg-card rounded-xl shadow-card p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-semibold">{r.date}</p>
                    <Badge variant="outline" className={`text-[10px] ${meta.color}`}>{meta.label}</Badge>
                    <span className="text-[10px] text-muted-foreground">· {r.sender}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(r._id, `${r.date} ${r.sender}`)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <p className="text-[10px] text-muted-foreground">WA Tunai</p>
                    <p className="font-mono-data">{r.waSalesCash != null ? formatRpFull(r.waSalesCash) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">WA Non-Tunai</p>
                    <p className="font-mono-data">{r.waSalesNonCash != null ? formatRpFull(r.waSalesNonCash) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">XLSX Gross</p>
                    <p className="font-mono-data">{r.xlsxGrossSales != null ? formatRpFull(r.xlsxGrossSales) : "—"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Selisih Total</p>
                    <p className={`font-mono-data ${r.diffTotal != null && Math.abs(r.diffTotal) > 5000 ? "text-destructive" : ""}`}>
                      {r.diffTotal != null ? formatRpFull(r.diffTotal) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
