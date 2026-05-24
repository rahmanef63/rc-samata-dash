"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useEffect } from "react";
import type { CrudMode } from "../hooks/useCrudState";
import { PocketPicker } from "./PocketPicker";
import type { Id } from "../../../convex/_generated/dataModel";

export interface FieldConfig {
  key: string;
  label: string;
  type?: "text" | "number" | "select" | "date" | "pocket";
  options?: { label: string; value: string }[];
  placeholder?: string;
  required?: boolean;
  helpText?: string;
}

interface CrudDialogProps<T extends Record<string, any>> {
  open: boolean;
  mode: CrudMode;
  item: T | null;
  fields: FieldConfig[];
  entityName: string;
  onClose: () => void;
  onSubmit: (item: T) => void | Promise<void>;
  onDelete?: (item: T) => void;
  generateId?: () => string;
}

export function CrudDialog<T extends Record<string, any>>({
  open,
  mode,
  item,
  fields,
  entityName,
  onClose,
  onSubmit,
  onDelete,
  generateId = () => crypto.randomUUID().slice(0, 8),
}: CrudDialogProps<T>) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === "edit" && item) {
      setFormData({ ...item });
    } else if (mode === "create") {
      const defaults: Record<string, any> = { id: generateId() };
      fields.forEach((f) => {
        defaults[f.key] = f.type === "number" ? 0 : "";
      });
      setFormData(defaults);
    }
    setIsSubmitting(false);
  }, [mode, item, fields, generateId]);

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(formData as T);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (mode === "delete") {
    return (
      <AlertDialog open={open} onOpenChange={(v) => !v && onClose()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {entityName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus <strong>{item?.title || item?.name || item?.id}</strong>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onClose}>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => item && onDelete?.(item)}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Dialog open={open && (mode === "create" || mode === "edit")} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? `Tambah ${entityName}` : `Edit ${entityName}`}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? `Isi data untuk membuat ${entityName} baru.` : `Perbarui data ${entityName}.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => {
            if (field.type === "pocket") {
              return (
                <PocketPicker
                  key={field.key}
                  id={field.key}
                  label={field.label}
                  description={field.helpText ?? "Pilih pocket sumber kas. Kosongkan untuk auto-derive."}
                  required={field.required}
                  value={formData[field.key] as Id<"pockets"> | undefined}
                  onChange={(v) => handleChange(field.key, v)}
                />
              );
            }
            return (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={field.key} className="text-xs font-medium">
                  {field.label}
                </Label>
                {field.type === "select" && field.options ? (
                  <Select
                    value={String(formData[field.key] || "")}
                    onValueChange={(v) => handleChange(field.key, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={field.placeholder || `Pilih ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={field.key}
                    type={field.type || "text"}
                    placeholder={field.placeholder || field.label}
                    value={formData[field.key] ?? ""}
                    onChange={(e) =>
                      handleChange(
                        field.key,
                        field.type === "number" ? Number(e.target.value) : e.target.value
                      )
                    }
                    required={field.required}
                  />
                )}
                {field.helpText && <p className="text-[10px] text-muted-foreground">{field.helpText}</p>}
              </div>
            );
          })}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : mode === "create" ? "Simpan" : "Perbarui"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
