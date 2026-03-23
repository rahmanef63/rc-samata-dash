"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { motion } from "framer-motion";
import {
  Bot, Plus, Trash2, Check, Zap, Eye, EyeOff,
  ExternalLink, Loader2, ChevronDown, Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AI_PROVIDERS, getProviderDef, getModelsForProvider } from "../lib";
import type { AiProviderType } from "../types";

type FormData = {
  provider: AiProviderType;
  displayName: string;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  isActive: boolean;
  customHeaders: string;
};

const emptyForm: FormData = {
  provider: "openrouter",
  displayName: "",
  baseUrl: "",
  apiKey: "",
  defaultModel: "",
  isActive: false,
  customHeaders: "",
};

export function AiProviderConfig() {
  const providers = useQuery(api.features.ai.queries.listProviders);
  const upsertProvider = useMutation(api.features.ai.mutations.upsertProvider);
  const deleteProvider = useMutation(api.features.ai.mutations.deleteProvider);
  const setActive = useMutation(api.features.ai.mutations.setActiveProvider);
  const testConnection = useAction(api.features.ai.actions.testConnection);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [customModel, setCustomModel] = useState("");

  const providerDef = getProviderDef(form.provider);
  const models = getModelsForProvider(form.provider);

  // When provider type changes, update defaults
  useEffect(() => {
    if (!editId && providerDef) {
      setForm((prev) => ({
        ...prev,
        displayName: prev.displayName || providerDef.displayName,
        baseUrl: prev.baseUrl || providerDef.defaultBaseUrl,
        defaultModel: prev.defaultModel || (providerDef.models[0]?.id ?? ""),
      }));
    }
  }, [form.provider, providerDef, editId]);

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm, isActive: !providers?.length });
    setShowKey(false);
    setCustomModel("");
    setDialogOpen(true);
  };

  const openEdit = (p: NonNullable<typeof providers>[number]) => {
    setEditId(p._id);
    setForm({
      provider: p.provider as AiProviderType,
      displayName: p.displayName,
      baseUrl: p.baseUrl,
      apiKey: p.apiKey,
      defaultModel: p.defaultModel,
      isActive: p.isActive,
      customHeaders: p.customHeaders || "",
    });
    setShowKey(false);
    const knownModels = getModelsForProvider(p.provider);
    if (!knownModels.find((m) => m.id === p.defaultModel)) {
      setCustomModel(p.defaultModel);
    } else {
      setCustomModel("");
    }
    setDialogOpen(true);
  };

  const handleProviderChange = (type: AiProviderType) => {
    const def = getProviderDef(type);
    setForm({
      ...emptyForm,
      provider: type,
      displayName: def?.displayName || type,
      baseUrl: def?.defaultBaseUrl || "",
      defaultModel: def?.models[0]?.id || "",
      isActive: form.isActive,
      apiKey: "",
      customHeaders: "",
    });
    setCustomModel("");
  };

  const handleSave = async () => {
    if (!form.apiKey || form.apiKey.includes("...")) {
      if (!editId) {
        toast.error("API key wajib diisi.");
        return;
      }
    }
    if (!form.defaultModel && !customModel) {
      toast.error("Pilih model.");
      return;
    }

    setSaving(true);
    try {
      await upsertProvider({
        id: editId ? (editId as never) : undefined,
        provider: form.provider,
        displayName: form.displayName,
        baseUrl: form.baseUrl,
        apiKey: form.apiKey,
        defaultModel: customModel || form.defaultModel,
        isActive: form.isActive,
        customHeaders: form.customHeaders || undefined,
      });
      toast.success(editId ? "Provider diperbarui." : "Provider ditambahkan.");
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    try {
      await testConnection({ providerId: id as never });
      toast.success("Koneksi berhasil!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Koneksi gagal.");
    } finally {
      setTesting(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus provider ini?")) return;
    await deleteProvider({ id: id as never });
    toast.success("Provider dihapus.");
  };

  const handleSetActive = async (id: string) => {
    await setActive({ id: id as never });
    toast.success("Provider aktif diubah.");
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" /> AI Provider
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Konfigurasi API key dan model AI untuk fitur Chat Assistant
          </p>
        </div>
        <Button size="sm" className="rounded-lg" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Tambah
        </Button>
      </div>

      {/* Provider Cards */}
      {!providers ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card rounded-xl shadow-card p-4 h-20 animate-pulse" />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <div className="bg-muted rounded-xl p-6 text-center">
          <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Belum ada AI provider. Tambahkan OpenRouter, OpenAI, atau Claude untuk mengaktifkan Chat.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((p: typeof providers[number]) => {
            const def = getProviderDef(p.provider);
            return (
              <div
                key={p._id}
                className={`bg-card rounded-xl shadow-card p-4 border-2 transition-colors ${
                  p.isActive ? "border-primary/30" : "border-transparent"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      p.isActive ? "bg-primary/10" : "bg-muted"
                    }`}
                  >
                    <Bot className={`h-5 w-5 ${p.isActive ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{p.displayName}</p>
                      {p.isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {def?.displayName || p.provider} · Model: {p.defaultModel}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                      Key: {p.apiKey}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!p.isActive && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg"
                        onClick={() => handleSetActive(p._id)}
                        title="Set aktif"
                      >
                        <Radio className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={() => handleTest(p._id)}
                      disabled={testing === p._id}
                      title="Test koneksi"
                    >
                      {testing === p._id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={() => openEdit(p)}
                      title="Edit"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(p._id)}
                      title="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit AI Provider" : "Tambah AI Provider"}</DialogTitle>
            <DialogDescription>
              Konfigurasi API endpoint dan model AI. API key disimpan aman di server.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Provider Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Provider</Label>
              <Select value={form.provider} onValueChange={(v) => handleProviderChange(v as AiProviderType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map((p) => (
                    <SelectItem key={p.type} value={p.type}>
                      <span className="font-medium">{p.displayName}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {providerDef && (
                <p className="text-[11px] text-muted-foreground">{providerDef.description}</p>
              )}
            </div>

            {/* Display Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nama Tampilan</Label>
              <Input
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="My OpenRouter"
              />
            </div>

            {/* Base URL */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Base URL</Label>
              <Input
                value={form.baseUrl}
                onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
                placeholder={providerDef?.defaultBaseUrl}
              />
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">API Key</Label>
                {providerDef?.apiKeyHelpUrl && (
                  <a
                    href={providerDef.apiKeyHelpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary flex items-center gap-0.5 hover:underline"
                  >
                    Dapatkan key <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showKey ? "text" : "password"}
                  value={form.apiKey}
                  onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                  placeholder={providerDef?.apiKeyPlaceholder || "API key"}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Model Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Default Model</Label>
              {models.length > 1 ? (
                <Select
                  value={form.defaultModel}
                  onValueChange={(v) => {
                    setForm((f) => ({ ...f, defaultModel: v }));
                    setCustomModel("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div>
                          <span className="font-medium">{m.name}</span>
                          {m.contextWindow && (
                            <span className="text-muted-foreground ml-2 text-[10px]">
                              {Math.round(m.contextWindow / 1000)}K ctx
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__">
                      <span className="text-primary">Custom model ID...</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={customModel || form.defaultModel}
                  onChange={(e) => {
                    setCustomModel(e.target.value);
                    setForm((f) => ({ ...f, defaultModel: "" }));
                  }}
                  placeholder="Model ID (e.g. gpt-4o)"
                />
              )}

              {/* Custom model input when __custom__ selected */}
              {form.defaultModel === "__custom__" && (
                <Input
                  value={customModel}
                  onChange={(e) => setCustomModel(e.target.value)}
                  placeholder="Masukkan model ID (e.g. anthropic/claude-3.5-sonnet)"
                  className="mt-2"
                  autoFocus
                />
              )}
            </div>

            {/* Custom Headers (for supported providers) */}
            {providerDef?.supportsCustomHeaders && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Custom Headers (opsional)</Label>
                <Textarea
                  value={form.customHeaders}
                  onChange={(e) => setForm((f) => ({ ...f, customHeaders: e.target.value }))}
                  placeholder='{"X-Custom-Header": "value"}'
                  className="min-h-[60px] font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Format JSON. Akan ditambahkan ke header request API.
                </p>
              </div>
            )}

            {/* Active Toggle */}
            <label className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="rounded"
              />
              <div>
                <p className="text-sm font-medium">Set sebagai provider aktif</p>
                <p className="text-[10px] text-muted-foreground">
                  Provider aktif akan digunakan oleh Chat Assistant
                </p>
              </div>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" /> Simpan
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
