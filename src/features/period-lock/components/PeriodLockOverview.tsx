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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Lock, LockOpen, ShieldCheck, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useCanManageFinance } from "@/features/auth/useUserRole";

type Status = "open" | "locked" | "closed";

type Period = {
  _id: Id<"accountingPeriods">;
  yearMonth: string;
  status: Status;
  lockedBy?: string;
  lockedAt?: number;
  closedBy?: string;
  closedAt?: number;
  notes?: string;
};

const STATUS_META: Record<Status, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  open: { label: "Terbuka", color: "bg-green-100 text-green-700", icon: LockOpen },
  locked: { label: "Terkunci", color: "bg-yellow-100 text-yellow-700", icon: Lock },
  closed: { label: "Ditutup", color: "bg-red-100 text-red-700", icon: ShieldCheck },
};

function currentYearMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function PeriodLockOverview() {
  const periods = useQuery(api.features.closing.periodLock.listPeriods, {}) as Period[] | undefined;
  const upsert = useMutation(api.features.closing.periodLock.upsertPeriod);
  const remove = useMutation(api.features.closing.periodLock.deletePeriod);
  const canManage = useCanManageFinance();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [yearMonth, setYearMonth] = useState(currentYearMonth());
  const [status, setStatus] = useState<Status>("open");
  const [notes, setNotes] = useState("");

  const handleSet = async (ym: string, st: Status, nt?: string) => {
    try {
      await upsert({ yearMonth: ym, status: st, notes: nt });
      toast.success(`Periode ${ym} → ${STATUS_META[st].label}`);
      setDialogOpen(false);
      setNotes("");
    } catch (e) {
      toast.error("Gagal: " + (e as Error).message);
    }
  };

  const handleDelete = async (p: Period) => {
    if (!confirm(`Hapus entry periode ${p.yearMonth}? (akan kembali default open)`)) return;
    try {
      await remove({ id: p._id });
      toast.success(`Periode ${p.yearMonth} dihapus`);
    } catch (e) {
      toast.error("Gagal: " + (e as Error).message);
    }
  };

  if (!periods) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const lockedCount = periods.filter((p) => p.status === "locked").length;
  const closedCount = periods.filter((p) => p.status === "closed").length;

  return (
    <div className="space-y-4">
      <div className="bg-primary rounded-2xl p-5 text-primary-foreground">
        <p className="text-xs opacity-80 mb-1">Total Periode Diatur</p>
        <p className="text-3xl font-bold tracking-tight">{periods.length}</p>
        <p className="text-xs opacity-80 mt-1">
          {lockedCount} terkunci · {closedCount} ditutup · sisanya periode tanpa entry = default open
        </p>
      </div>

      <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 text-xs">
        <p className="font-medium">Bagaimana cara kerja</p>
        <ul className="list-disc list-inside mt-1 space-y-0.5 text-muted-foreground">
          <li><span className="font-medium">Terbuka</span>: bebas edit (default kalau periode belum ada entry)</li>
          <li><span className="font-medium">Terkunci</span>: tx baru/edit untuk periode ini ditolak. Bisa di-buka lagi.</li>
          <li><span className="font-medium">Ditutup</span>: final seal. Entry sendiri pun tidak bisa dihapus.</li>
        </ul>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{periods.length} periode terdaftar</p>
        {canManage && (
          <Button size="sm" onClick={() => { setYearMonth(currentYearMonth()); setStatus("locked"); setNotes(""); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" /> Atur Periode
          </Button>
        )}
      </div>

      {periods.length === 0 ? (
        <div className="bg-muted rounded-xl p-8 text-center">
          <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">Belum ada periode diatur</p>
          <p className="text-xs text-muted-foreground mt-1">
            Semua tanggal masih open. Klik <span className="font-medium">Atur Periode</span> untuk lock periode review (closing bulanan, audit, dsb).
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {periods.map((p) => {
            const meta = STATUS_META[p.status];
            const Icon = meta.icon;
            return (
              <div key={p._id} className="bg-card rounded-xl shadow-card p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{p.yearMonth}</p>
                    {p.notes && <p className="text-[10px] text-muted-foreground">{p.notes}</p>}
                    {p.lockedAt && (
                      <p className="text-[10px] text-muted-foreground">
                        Lock: {new Date(p.lockedAt).toLocaleDateString("id-ID")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] ${meta.color}`}>{meta.label}</Badge>
                  {p.status !== "closed" && canManage && (
                    <>
                      {p.status === "open" && (
                        <Button variant="outline" size="sm" onClick={() => handleSet(p.yearMonth, "locked")}>
                          <Lock className="h-3 w-3 mr-1" /> Lock
                        </Button>
                      )}
                      {p.status === "locked" && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleSet(p.yearMonth, "open")}>
                            <LockOpen className="h-3 w-3 mr-1" /> Buka
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleSet(p.yearMonth, "closed")}>
                            <ShieldCheck className="h-3 w-3 mr-1" /> Close
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(p)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atur Periode</DialogTitle>
            <DialogDescription>
              Pilih bulan + status. Lock untuk freeze edit selama review. Close kalau audit final.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="ym">Bulan (YYYY-MM)</Label>
              <Input id="ym" value={yearMonth} onChange={(e) => setYearMonth(e.target.value)} placeholder="2026-05" pattern="\d{4}-\d{2}" />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Terbuka</SelectItem>
                  <SelectItem value="locked">Terkunci</SelectItem>
                  <SelectItem value="closed">Ditutup (sealed)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pnotes">Catatan</Label>
              <Textarea id="pnotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={() => handleSet(yearMonth, status, notes || undefined)}>Set</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
