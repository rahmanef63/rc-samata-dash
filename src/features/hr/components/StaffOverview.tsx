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
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Pencil, Sparkles, UserMinus } from "lucide-react";
import { toast } from "sonner";

type StaffRole =
  | "owner" | "manager" | "supervisor" | "kasir"
  | "cook" | "server" | "delivery" | "admin" | "other";

const ROLE_LABEL: Record<StaffRole, string> = {
  owner: "Owner",
  manager: "Manager",
  supervisor: "Supervisor",
  kasir: "Kasir",
  cook: "Cook",
  server: "Server",
  delivery: "Delivery",
  admin: "Admin",
  other: "Lainnya",
};

const ROLE_COLOR: Record<StaffRole, string> = {
  owner: "bg-purple-100 text-purple-700",
  manager: "bg-blue-100 text-blue-700",
  supervisor: "bg-cyan-100 text-cyan-700",
  kasir: "bg-green-100 text-green-700",
  cook: "bg-orange-100 text-orange-700",
  server: "bg-yellow-100 text-yellow-700",
  delivery: "bg-pink-100 text-pink-700",
  admin: "bg-slate-200 text-slate-800",
  other: "bg-gray-100 text-gray-700",
};

type StaffStat = {
  _id: Id<"staff">;
  fullName: string;
  nickname?: string;
  role: StaffRole;
  phone?: string;
  isActive: boolean;
  hireDate?: string;
  txPaidCount: number;
  txReceivedCount: number;
  lastActivityDate?: string;
};

type FormState = {
  fullName: string;
  nickname: string;
  role: StaffRole;
  phone: string;
  hireDate: string;
  isActive: boolean;
  notes: string;
};

const EMPTY_FORM: FormState = {
  fullName: "",
  nickname: "",
  role: "kasir",
  phone: "",
  hireDate: "",
  isActive: true,
  notes: "",
};

export function StaffOverview() {
  const staff = useQuery(api.features.hr.queries.listStaffWithStats, {}) as StaffStat[] | undefined;
  const createStaff = useMutation(api.features.hr.mutations.createStaff);
  const updateStaff = useMutation(api.features.hr.mutations.updateStaff);
  const deactivate = useMutation(api.features.hr.mutations.deactivateStaff);
  const seedDefault = useMutation(api.features.hr.mutations.seedDefaultStaff);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffStat | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [seeding, setSeeding] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };
  const openEdit = (s: StaffStat) => {
    setEditing(s);
    setForm({
      fullName: s.fullName,
      nickname: s.nickname ?? "",
      role: s.role,
      phone: s.phone ?? "",
      hireDate: s.hireDate ?? "",
      isActive: s.isActive,
      notes: "",
    });
    setDialogOpen(true);
  };
  const submit = async () => {
    if (!form.fullName.trim()) {
      toast.error("Nama lengkap wajib diisi");
      return;
    }
    try {
      if (editing) {
        await updateStaff({
          id: editing._id,
          fullName: form.fullName,
          nickname: form.nickname || undefined,
          role: form.role,
          phone: form.phone || undefined,
          hireDate: form.hireDate || undefined,
          isActive: form.isActive,
          notes: form.notes || undefined,
        });
        toast.success("Staff diupdate");
      } else {
        await createStaff({
          fullName: form.fullName,
          nickname: form.nickname || undefined,
          role: form.role,
          phone: form.phone || undefined,
          hireDate: form.hireDate || undefined,
          isActive: form.isActive,
          notes: form.notes || undefined,
        });
        toast.success("Staff dibuat");
      }
      setDialogOpen(false);
    } catch (e) {
      toast.error("Gagal: " + (e as Error).message);
    }
  };

  const handleDeactivate = async (s: StaffStat) => {
    if (!confirm(`Nonaktifkan staff ${s.fullName}?`)) return;
    try {
      await deactivate({ id: s._id });
      toast.success(`${s.fullName} dinonaktifkan`);
    } catch (e) {
      toast.error("Gagal: " + (e as Error).message);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await seedDefault({});
      toast.success(`${res.inserted} default staff ditambahkan`);
    } catch (e) {
      toast.error("Seed gagal: " + (e as Error).message);
    } finally {
      setSeeding(false);
    }
  };

  if (!staff) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const active = staff.filter((s) => s.isActive);

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="bg-primary rounded-2xl p-5 text-primary-foreground">
        <p className="text-xs opacity-80 mb-1">Total Staff Aktif</p>
        <p className="text-3xl font-bold tracking-tight">{active.length}</p>
        <p className="text-xs opacity-80 mt-1">
          {staff.length - active.length} nonaktif · {staff.reduce((s, x) => s + x.txPaidCount + x.txReceivedCount, 0)} total aktivitas
        </p>
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {staff.length === 0 ? "Belum ada staff. Mulai dengan seed default." : `${staff.length} staff terdaftar`}
        </p>
        <div className="flex gap-2">
          {staff.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding}>
              <Sparkles className="h-4 w-4 mr-1" />
              {seeding ? "Seeding..." : "Seed Default"}
            </Button>
          )}
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Staff Baru
          </Button>
        </div>
      </div>

      {/* Staff list cards */}
      {staff.length === 0 ? (
        <div className="bg-muted rounded-xl p-8 text-center">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium">Belum ada staff</p>
          <p className="text-xs text-muted-foreground mt-1">
            Klik <span className="font-medium">Seed Default</span> untuk auto-buat 5 staff template (Owner, Manager, SV, Kasir, Cook), lalu edit nama asli.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {staff.map((s) => (
            <div
              key={s._id}
              className={`bg-card rounded-xl shadow-card p-4 ring-1 ${s.isActive ? "ring-border/40" : "ring-muted opacity-60"}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{s.fullName}</p>
                    <p className="text-[10px] text-muted-foreground">{s.nickname ?? "—"}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(s)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  {s.isActive && (
                    <Button variant="ghost" size="sm" onClick={() => handleDeactivate(s)}>
                      <UserMinus className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
              <Badge variant="outline" className={`text-[10px] ${ROLE_COLOR[s.role]}`}>{ROLE_LABEL[s.role]}</Badge>
              {s.phone && <p className="text-[10px] text-muted-foreground mt-1.5">{s.phone}</p>}
              {s.hireDate && <p className="text-[10px] text-muted-foreground">Hire: {s.hireDate}</p>}
              <div className="mt-2 pt-2 border-t border-border/40 flex justify-between text-[10px] text-muted-foreground">
                <span>↑ Bayar: <span className="font-mono-data text-foreground">{s.txPaidCount}</span></span>
                <span>↓ Terima: <span className="font-mono-data text-foreground">{s.txReceivedCount}</span></span>
                {s.lastActivityDate && <span>Last: {s.lastActivityDate}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CRUD Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Staff" : "Staff Baru"}</DialogTitle>
            <DialogDescription>
              Karyawan operasional. Bisa link ke user login (opsional). SV WA bisa exist tanpa user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="sname">Nama Lengkap *</Label>
              <Input id="sname" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="snick">Nickname</Label>
                <Input id="snick" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Role *</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as StaffRole })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABEL) as StaffRole[]).map((r) => (
                      <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sphone">No. HP</Label>
                <Input id="sphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="shire">Tgl Mulai</Label>
                <Input id="shire" type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="snotes">Catatan</Label>
              <Textarea id="snotes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sactive">Aktif</Label>
              <Switch id="sactive" checked={form.isActive} onCheckedChange={(c) => setForm({ ...form, isActive: c })} />
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
