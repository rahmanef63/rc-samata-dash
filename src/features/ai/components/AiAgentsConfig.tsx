"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { motion } from "framer-motion";
import {
  Bot, Plus, Trash2, Check, Radio, Loader2, Edit3, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function AiAgentsConfig() {
  const agents = useQuery(api.features.ai.queries.listAgents);
  const seedAgents = useMutation(api.features.ai.mutations.seedDefaultAgents);
  const upsertAgent = useMutation(api.features.ai.mutations.upsertAgent);
  const deleteAgent = useMutation(api.features.ai.mutations.deleteAgent);
  const toggleAgent = useMutation(api.features.ai.mutations.toggleAgent);
  const didSyncRef = useRef(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [allowedToolIds, setAllowedToolIds] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (agents && !didSyncRef.current) {
      didSyncRef.current = true;
      seedAgents({})
        .then((r) => {
          if (r.seeded > 0 || r.updated > 0) {
            toast.success(
              [
                r.seeded > 0 ? `${r.seeded} agent ditambahkan` : null,
                r.updated > 0 ? `${r.updated} agent diperbarui` : null,
              ].filter(Boolean).join(", ") + "."
            );
          }
        })
        .catch((err) => {
          toast.error(err instanceof Error ? err.message : "Gagal sinkron agent.");
        });
    }
  }, [agents, seedAgents]);

  const openCreate = () => {
    setEditId(null);
    setAgentId("");
    setName("");
    setDescription("");
    setSystemPrompt("");
    setAllowedToolIds("");
    setDialogOpen(true);
  };

  const openEdit = (agent: {
    _id: string;
    agentId: string;
    name: string;
    description: string;
    systemPrompt: string;
    allowedToolIds: string[];
  }) => {
    setEditId(agent._id);
    setAgentId(agent.agentId);
    setName(agent.name);
    setDescription(agent.description);
    setSystemPrompt(agent.systemPrompt);
    setAllowedToolIds(agent.allowedToolIds.join(", "));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!agentId.trim() || !name.trim() || !description.trim() || !systemPrompt.trim()) {
      toast.error("Agent ID, nama, deskripsi, dan system prompt wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      await upsertAgent({
        id: editId ? (editId as never) : undefined,
        agentId: agentId.trim(),
        name: name.trim(),
        description: description.trim(),
        systemPrompt: systemPrompt.trim(),
        allowedToolIds: allowedToolIds
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        isBuiltIn: false,
        isEnabled: editId
          ? (agents?.find((a) => a._id === editId)?.isEnabled ?? false)
          : true,
      });
      toast.success(editId ? "Agent diperbarui." : "Agent ditambahkan.");
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan agent.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus agent ini?")) return;
    try {
      await deleteAgent({ id: id as never });
      toast.success("Agent dihapus.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus agent.");
    }
  };

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    await toggleAgent({ id: id as never, isEnabled: !currentEnabled });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" /> Agents
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Agent adalah workflow tingkat atas yang bisa memilih tools dan menghasilkan jawaban akhir.
          </p>
        </div>
        <Button size="sm" className="rounded-lg" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Tambah
        </Button>
      </div>

      {!agents ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card rounded-xl shadow-card p-4 h-16 animate-pulse" />
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-muted rounded-xl p-6 text-center">
          <Search className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Memuat agent bawaan...</p>
        </div>
      ) : (
        <div className="space-y-2">
          {agents.map((agent: typeof agents[number]) => (
            <div
              key={agent._id}
              className={`bg-card rounded-xl shadow-card p-4 border-2 transition-colors ${
                agent.isEnabled ? "border-primary/20" : "border-transparent opacity-60"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  agent.isEnabled ? "bg-primary/10" : "bg-muted"
                }`}>
                  <Bot className={`h-4 w-4 ${agent.isEnabled ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold">{agent.name}</p>
                    {agent.isEnabled && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                        Aktif
                      </span>
                    )}
                    {agent.isBuiltIn && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{agent.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-mono">agentId: {agent.agentId}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!agent.isEnabled ? (
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleToggle(agent._id, agent.isEnabled)} title="Set aktif" aria-label="Set aktif">
                      <Radio className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => handleToggle(agent._id, agent.isEnabled)} title="Nonaktifkan" aria-label="Nonaktifkan">
                      <Radio className="h-3.5 w-3.5 text-primary" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" onClick={() => openEdit(agent)} title="Edit" aria-label="Edit">
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  {!agent.isBuiltIn && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(agent._id)} title="Hapus" aria-label="Hapus">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Agent" : "Tambah Agent"}</DialogTitle>
            <DialogDescription>
              Agent dipakai untuk workflow yang butuh analisis bertahap atau sintesis dari beberapa tool.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Agent ID</Label>
              <Input
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                placeholder="business_analyst"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nama</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Business Analyst" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Deskripsi</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-[80px]" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">System Prompt</Label>
              <Textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} className="min-h-[140px] text-xs font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Allowed Tool IDs</Label>
              <Input
                value={allowedToolIds}
                onChange={(e) => setAllowedToolIds(e.target.value)}
                placeholder="petty_cash_summary, waste_analysis, kpi_check"
              />
              <p className="text-[10px] text-muted-foreground">
                Pisahkan dengan koma. Kosongkan jika ingin agent hanya menjawab tanpa tool.
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
