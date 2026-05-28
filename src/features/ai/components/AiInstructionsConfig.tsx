"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { motion } from "framer-motion";
import {
  FileText, Plus, Trash2, Check, Radio, Loader2, Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function AiInstructionsConfig() {
  const instructions = useQuery(api.features.ai.queries.listInstructions);
  const seedDefault = useMutation(api.features.ai.mutations.seedDefaultInstruction);
  const upsertInstruction = useMutation(api.features.ai.mutations.upsertInstruction);
  const deleteInstruction = useMutation(api.features.ai.mutations.deleteInstruction);
  const setActive = useMutation(api.features.ai.mutations.setActiveInstruction);
  const didSyncRef = useRef(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync the default instruction from the manifest-driven backend once per load.
  useEffect(() => {
    if (instructions && !didSyncRef.current) {
      didSyncRef.current = true;
      seedDefault({})
        .then((r) => {
          if (r.seeded || r.updated) toast.success("Instruksi default disinkronkan.");
        })
        .catch((err) => {
          toast.error(err instanceof Error ? err.message : "Gagal sinkron instruksi.");
        });
    }
  }, [instructions, seedDefault]);

  const openCreate = () => {
    setEditId(null);
    setName("");
    setContent("");
    setDialogOpen(true);
  };

  const openEdit = (inst: { _id: string; name: string; content: string }) => {
    setEditId(inst._id);
    setName(inst.name);
    setContent(inst.content);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) {
      toast.error("Nama dan konten wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      await upsertInstruction({
        id: editId ? (editId as never) : undefined,
        name,
        content,
        isDefault: false,
        isActive: editId
          ? (instructions?.find((i) => i._id === editId)?.isActive ?? false)
          : false,
      });
      toast.success(editId ? "Instruksi diperbarui." : "Instruksi ditambahkan.");
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus instruksi ini?")) return;
    try {
      await deleteInstruction({ id: id as never });
      toast.success("Instruksi dihapus.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus.");
    }
  };

  const handleSetActive = async (id: string) => {
    await setActive({ id: id as never });
    toast.success("Instruksi aktif diubah.");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Custom Instructions
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Atur instruksi sistem untuk AI — konteks bisnis, gaya jawaban, dan skills guide
          </p>
        </div>
        <Button size="sm" className="rounded-lg" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Tambah
        </Button>
      </div>

      {!instructions ? (
        <div className="space-y-2">
          {[1].map((i) => (
            <div key={i} className="bg-card rounded-xl shadow-card p-4 h-20 animate-pulse" />
          ))}
        </div>
      ) : instructions.length === 0 ? (
        <div className="bg-muted rounded-xl p-6 text-center">
          <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Memuat instruksi default...</p>
        </div>
      ) : (
        <div className="space-y-3">
          {instructions.map((inst: typeof instructions[number]) => (
            <div
              key={inst._id}
              className={`bg-card rounded-xl shadow-card p-4 border-2 transition-colors ${
                inst.isActive ? "border-primary/30" : "border-transparent"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  inst.isActive ? "bg-primary/10" : "bg-muted"
                }`}>
                  <FileText className={`h-4 w-4 ${inst.isActive ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{inst.name}</p>
                    {inst.isActive && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        Aktif
                      </span>
                    )}
                    {inst.isDefault && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {inst.content.slice(0, 150)}...
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!inst.isActive && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleSetActive(inst._id)} title="Set aktif" aria-label="Set aktif">
                      <Radio className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => openEdit(inst)} title="Edit" aria-label="Edit">
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  {!inst.isDefault && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(inst._id)} title="Hapus" aria-label="Hapus">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Instruksi" : "Tambah Instruksi"}</DialogTitle>
            <DialogDescription>
              Instruksi sistem menentukan cara AI menjawab — konteks, gaya, dan skills.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nama</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Custom Reporting"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Konten Instruksi</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Kamu adalah AI Assistant untuk..."
                className="min-h-[200px] text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Tips: Sertakan konteks bisnis, gaya jawaban, dan skills yang tersedia.
                Gunakan [DATA], [KPI], [MEMORY], [CALC], [RAG], [TREND] untuk referensi skill.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Menyimpan...</>
              ) : (
                <><Check className="h-4 w-4 mr-1" /> Simpan</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
