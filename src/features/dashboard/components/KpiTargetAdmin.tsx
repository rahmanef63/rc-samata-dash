"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { Target, Plus, Save } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { Id } from "../../../../convex/_generated/dataModel";

type EditState = Record<
  string,
  { target: string; warning: string; danger: string }
>;

export function KpiTargetAdmin() {
  const targets = useQuery(api.features.reports.kpiAnalytics.listKPITargets, {});
  const seed = useMutation(api.features.reports.kpiAnalytics.seedDefaultKPITargets);
  const updateTarget = useMutation(api.features.reports.kpiAnalytics.updateKPITarget);

  const [editing, setEditing] = useState<EditState>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  if (targets === undefined) {
    return (
      <div className="p-4 md:p-6 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    );
  }

  const handleSeed = async () => {
    try {
      const res = await seed({});
      toast.success(res.message);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal seed target");
    }
  };

  const handleSave = async (id: Id<"kpiTargets">) => {
    const state = editing[String(id)];
    if (!state) return;
    setSavingId(String(id));
    try {
      await updateTarget({
        id,
        targetValue: Number(state.target),
        warningThreshold: Number(state.warning),
        dangerThreshold: Number(state.danger),
      });
      toast.success("Target diperbarui");
      setEditing((prev) => {
        const next = { ...prev };
        delete next[String(id)];
        return next;
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 text-primary p-2">
          <Target className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Target KPI</h1>
          <p className="text-sm text-muted-foreground">
            Atur threshold target, warning, dan danger per KPI untuk cabang aktif
          </p>
        </div>
      </div>

      {targets.length === 0 ? (
        <Card className="p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Belum ada target KPI untuk cabang ini.
          </p>
          <Button onClick={handleSeed} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Seed default (10 KPI QSR)
          </Button>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">KPI</th>
                  <th className="text-right px-3 py-2 w-28">Target</th>
                  <th className="text-right px-3 py-2 w-28">Warning</th>
                  <th className="text-right px-3 py-2 w-28">Danger</th>
                  <th className="px-3 py-2 w-20">Unit</th>
                  <th className="px-3 py-2 w-24">Arah</th>
                  <th className="px-3 py-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {targets.map((t) => {
                  const edited = editing[String(t._id)];
                  const isDirty = !!edited;
                  return (
                    <tr key={String(t._id)} className="border-t">
                      <td className="px-3 py-2 font-medium">{t.kpiLabel}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.1"
                          className="h-8 text-right text-sm"
                          value={edited?.target ?? String(t.targetValue)}
                          onChange={(e) =>
                            setEditing((prev) => ({
                              ...prev,
                              [String(t._id)]: {
                                target: e.target.value,
                                warning: edited?.warning ?? String(t.warningThreshold),
                                danger: edited?.danger ?? String(t.dangerThreshold),
                              },
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.1"
                          className="h-8 text-right text-sm"
                          value={edited?.warning ?? String(t.warningThreshold)}
                          onChange={(e) =>
                            setEditing((prev) => ({
                              ...prev,
                              [String(t._id)]: {
                                target: edited?.target ?? String(t.targetValue),
                                warning: e.target.value,
                                danger: edited?.danger ?? String(t.dangerThreshold),
                              },
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.1"
                          className="h-8 text-right text-sm"
                          value={edited?.danger ?? String(t.dangerThreshold)}
                          onChange={(e) =>
                            setEditing((prev) => ({
                              ...prev,
                              [String(t._id)]: {
                                target: edited?.target ?? String(t.targetValue),
                                warning: edited?.warning ?? String(t.warningThreshold),
                                danger: e.target.value,
                              },
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-center text-xs text-muted-foreground">{t.unit}</td>
                      <td className="px-3 py-2 text-center text-xs text-muted-foreground">
                        {t.direction === "lower_is_better" ? "↓ lebih rendah" : "↑ lebih tinggi"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant={isDirty ? "default" : "ghost"}
                          disabled={!isDirty || savingId === String(t._id)}
                          onClick={() => handleSave(t._id)}
                          className="h-7 gap-1"
                        >
                          <Save className="h-3 w-3" />
                          Simpan
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
