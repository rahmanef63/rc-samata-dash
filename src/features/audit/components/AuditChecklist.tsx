"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Star, Camera, ClipboardCheck, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { auditSections } from "../lib";
import { toast } from "sonner";

export function AuditChecklist() {
  const branches = useQuery(api.features.masterData.queries.listBranches);
  const branch = branches?.[0];

  const [answers, setAnswers] = useState<Record<number, unknown>>({});
  const [ratings, setRatings] = useState<Record<number, number>>({});

  const setAnswer = (id: number, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = () => {
    const allItems = auditSections.flatMap((s) => s.items);
    const required = allItems.filter((i) => i.required);
    const unanswered = required.filter((i) => {
      const a = answers[i.id];
      if (i.type === "checkbox") return a !== true;
      if (i.type === "rating") return !ratings[i.id];
      if (i.type === "number") return a === undefined || a === "";
      return false;
    });

    if (unanswered.length > 0) {
      toast.error(`${unanswered.length} pertanyaan wajib belum diisi`);
      return;
    }
    toast.success("Audit berhasil disimpan!");
    setAnswers({});
    setRatings({});
  };

  if (!branches) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Branch Info — single branch, no selector */}
      <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="h-4 w-4 text-primary" />
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Cabang</p>
        </div>
        {branch ? (
          <>
            <h3 className="text-base font-semibold">{branch.name}</h3>
            <p className="text-xs text-muted-foreground">{branch.code} · RC Samata Gowa</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Belum ada cabang. Tambahkan di Master Data.</p>
        )}
      </div>

      {/* Audit Sections */}
      {auditSections.map((section) => (
        <div key={section.title}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-5 bg-primary rounded-full" />
            <h3 className="text-sm font-semibold uppercase">{section.title}</h3>
          </div>
          <div className="bg-card rounded-xl shadow-card p-4 space-y-4">
            {section.items.map((item) => (
              <div key={item.id}>
                <div className="flex items-start gap-3">
                  {item.type === "checkbox" && (
                    <>
                      <Checkbox
                        checked={answers[item.id] === true}
                        onCheckedChange={(v) => setAnswer(item.id, v)}
                        className="mt-0.5"
                      />
                      <p className="text-sm flex-1">
                        {item.id}. {item.question}
                        {item.required && <span className="text-destructive ml-1">*</span>}
                      </p>
                    </>
                  )}
                </div>

                {item.type === "number" && (
                  <div>
                    <p className="text-sm mb-2">
                      {item.id}. {item.question}
                      {item.required && <span className="text-destructive ml-1">*</span>}
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={(answers[item.id] as string) ?? ""}
                        onChange={(e) => setAnswer(item.id, e.target.value)}
                        className="w-24 text-sm font-mono-data text-center"
                      />
                      {item.unit && <span className="text-sm text-muted-foreground">{item.unit}</span>}
                    </div>
                  </div>
                )}

                {item.type === "photo" && (
                  <div>
                    <p className="text-sm mb-2">
                      {item.id}. {item.question}
                    </p>
                    <button className="w-full border-2 border-dashed border-border rounded-xl py-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:bg-muted transition-colors">
                      <Camera className="h-4 w-4" />
                      Ambil / Upload Foto
                    </button>
                  </div>
                )}

                {item.type === "rating" && (
                  <div>
                    <p className="text-sm mb-2">
                      {item.id}. {item.question}
                      {item.required && <span className="text-destructive ml-1">*</span>}
                    </p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-6 w-6 cursor-pointer transition-colors ${
                            s <= (ratings[item.id] ?? 0)
                              ? "fill-warning text-warning"
                              : "fill-transparent text-muted-foreground/30"
                          }`}
                          onClick={() => setRatings((prev) => ({ ...prev, [item.id]: s }))}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {item.type === "textarea" && (
                  <div>
                    <p className="text-sm mb-2">
                      {item.id}. {item.question}
                    </p>
                    <Textarea
                      value={(answers[item.id] as string) ?? ""}
                      onChange={(e) => setAnswer(item.id, e.target.value)}
                      placeholder="Tuliskan di sini..."
                      className="min-h-[80px]"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <Button className="w-full h-12" onClick={handleSubmit}>
        <ClipboardCheck className="h-4 w-4 mr-2" /> Submit Audit
      </Button>
    </motion.div>
  );
}
