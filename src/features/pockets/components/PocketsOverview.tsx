"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatRpFull } from "@/shared/lib";
import { useDateScope } from "@/features/dashboard";
import { Wallet, Plus, Pencil, Sparkles, Building2, Banknote, HandCoins, Receipt } from "lucide-react";
import { toast } from "sonner";

type PocketKind =
  | "brankas" | "dompet_pic" | "rekening_owner" | "rekening_toko"
  | "tabungan_owner" | "petty_cash" | "owner_direct" | "other";

const KIND_LABEL: Record<PocketKind, string> = {
  brankas: "Brankas",
  dompet_pic: "Dompet PIC",
  rekening_owner: "Rek. Owner",
  rekening_toko: "Rek. Toko",
  tabungan_owner: "Tabungan Owner",
  petty_cash: "Petty Cash",
  owner_direct: "Owner Direct",
  other: "Lainnya",
};

const KIND_ICON: Record<PocketKind, React.ComponentType<{ className?: string }>> = {
  brankas: Building2,
  dompet_pic: HandCoins,
  rekening_owner: Banknote,
  rekening_toko: Banknote,
  tabungan_owner: Banknote,
  petty_cash: Receipt,
  owner_direct: Wallet,
  other: Wallet,
};

type Pocket = {
  _id: Id<"pockets">;
  name: string;
  kind: PocketKind;
  bankAccount?: string;
  isActive: boolean;
  currentBalance: number;
  notes?: string;
};

type FormState = {
  name: string;
  kind: PocketKind;
  bankAccount: string;
  isActive: boolean;
  notes: string;
  initialBalance: number;
};

const EMPTY_FORM: FormState = {
  name: "",
  kind: "brankas",
  bankAccount: "",
  isActive: true,
  notes: "",
  initialBalance: 0,
};

export function PocketsOverview() {
  const { startDate, endDate, rangeLabel } = useDateScope();
  const pockets = useQuery(api.features.pockets.queries.listPockets, {}) as Pocket[] | undefined;
  const balances = useQuery(api.features.pockets.queries.getPocketBalances, { startDate, endDate });

  const createPocket = useMutation(api.features.pockets.mutations.createPocket);
  const updatePocket = useMutation(api.features.pockets.mutations.updatePocket);
  const seedDefault = useMutation(api.features.pockets.mutations.seedDefaultPockets);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Pocket | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [seeding, setSeeding] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };
  const openEdit = (p: Pocket) => {
    setEditing(p);
    setForm({
      name: p.name,
      kind: p.kind,
      bankAccount: p.bankAccount ?? "",
      isActive: p.isActive,
      notes: p.notes ?? "",
      initialBalance: p.currentBalance,
    });
    setDialogOpen(true);
  };
  const submit = async () => {
    if (!form.name.trim()) {
      toast.error("Nama pocket wajib diisi");
      return;
    }
    try {
      if (editing) {
        await updatePocket({
          id: editing._id,
          name: form.name,
          kind: form.kind,
          bankAccount: form.bankAccount || undefined,
          isActive: form.isActive,
          notes: form.notes || undefined,
          currentBalance: form.initialBalance,
        });
        toast.success("Pocket diupdate");
      } else {
        await createPocket({
          name: form.name,
          kind: form.kind,
          bankAccount: form.bankAccount || undefined,
          isActive: form.isActive,
          notes: form.notes || undefined,
          initialBalance: form.initialBalance,
        });
        toast.success("Pocket dibuat");
      }
      setDialogOpen(false);
    } catch (e) {
      toast.error("Gagal: " + (e as Error).message);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedDefault({});
      toast.success(`${res.inserted} default pocket(s) ditambahkan`);
    } catch (e) {
      toast.error("Seed gagal: " + (e as Error).message);
    } finally {
      setSeeding(false);
    }
  };

  if (!pockets || !balances) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const balanceMap = new Map<string, { inflow: number; outflow: number; net: number; txCount: number }>();
  for (const b of balances.rows) {
    if (b.pocketId) balanceMap.set(b.pocketId, b);
  }
  const untagged = balances.rows.find((b) => !b.pocketId);

  const grandTotal = pockets.reduce((s, p) => s + (p.isActive ? p.currentBalance : 0), 0);

  return (
    <div className="space-y-4">
      {/* Hero: total + actions */}
      <div className="bg-primary rounded-2xl p-5 text-primary-foreground">
        <p className="text-xs opacity-80 mb-1">Total Saldo Pocket Aktif</p>
        <p className="text-3xl font-bold font-mono-data tracking-tight">{formatRpFull(grandTotal)}</p>
        <p className="text-xs opacity-80 mt-1">{pockets.filter((p) => p.isActive).length} pocket aktif · {rangeLabel}</p>
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {pockets.length === 0 ? "Belum ada pocket. Mulai dengan seed default." : `${pockets.length} pocket terdaftar`}
        </p>
        <div className="flex gap-2">
          {pockets.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding}>
              <Sparkles className="h-4 w-4 mr-1" />
              {seeding ? "Seeding..." : "Seed Default"}
            </Button>
          )}
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Pocket Baru
          </Button>
        </div>
      </div>

      {/* Pocket list cards */}
      {pockets.length === 0 ? (
        <div className="bg-muted rounded-xl p-8 text-center">
          <Wallet className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">Belum ada pocket</p>
          <p className="text-xs text-muted-foreground mt-1">
            Klik <span className="font-medium">Seed Default</span> untuk auto-buat 6 pocket standar (brankas, dompet PIC, petty cash, rek toko, rek owner, owner direct).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pockets.map((p) => {
            const Icon = KIND_ICON[p.kind] ?? Wallet;
            const flow = balanceMap.get(p._id);
            return (
              <div
                key={p._id}
                className={`bg-card rounded-xl shadow-card p-4 ring-1 ${p.isActive ? "ring-border/40" : "ring-muted opacity-60"}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground">{KIND_LABEL[p.kind]}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                </div>
                {p.bankAccount && (
                  <p className="text-[10px] text-muted-foreground truncate mb-2">{p.bankAccount}</p>
                )}
                <p className="text-xs text-muted-foreground">Saldo Cached</p>
                <p className="text-lg font-bold font-mono-data">{formatRpFull(p.currentBalance)}</p>
                {flow && (
                  <div className="mt-2 pt-2 border-t border-border/40 flex justify-between gap-2 text-[10px]">
                    <span className="text-success">↓ {formatRpFull(flow.inflow)}</span>
                    <span className="text-destructive">↑ {formatRpFull(flow.outflow)}</span>
                    <span className="text-muted-foreground">{flow.txCount} tx</span>
                  </div>
                )}
                {!flow && (
                  <p className="text-[10px] text-muted-foreground mt-2">Belum ada tx ter-tag</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Untagged tx warning */}
      {untagged && untagged.txCount > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
          <p className="text-sm font-medium text-warning-foreground">
            ⚠ {untagged.txCount} transaksi belum di-tag pocket
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Net Rp{Math.round(untagged.net).toLocaleString("id-ID")} · masuk {formatRpFull(untagged.inflow)} · keluar {formatRpFull(untagged.outflow)}.
            Backfill via mutation atau edit tx untuk lengkapi cash trail.
          </p>
        </div>
      )}

      {/* CRUD Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Pocket" : "Pocket Baru"}</DialogTitle>
            <DialogDescription>
              Tempat fisik saldo: brankas, dompet, rekening bank, atau alokasi virtual (owner direct).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="pname">Nama *</Label>
              <Input id="pname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Brankas Toko" />
            </div>
            <div className="space-y-1">
              <Label>Jenis *</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as PocketKind })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(KIND_LABEL) as PocketKind[]).map((k) => (
                    <SelectItem key={k} value={k}>{KIND_LABEL[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="bank">Rekening / Identifier</Label>
              <Input id="bank" value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} placeholder="e.g. BCA 1234567890" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bal">Saldo {editing ? "Sekarang" : "Awal"}</Label>
              <Input id="bal" type="number" value={form.initialBalance} onChange={(e) => setForm({ ...form, initialBalance: Number(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="notes">Catatan</Label>
              <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Aktif</Label>
              <Switch id="active" checked={form.isActive} onCheckedChange={(c) => setForm({ ...form, isActive: c })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={submit}>{editing ? "Simpan" : "Buat"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
