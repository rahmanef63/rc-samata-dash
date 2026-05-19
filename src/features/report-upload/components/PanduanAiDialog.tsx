"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Download, Check, FileText, BookOpen, Braces, Table } from "lucide-react";
import {
  WEEKLY_SHEETS,
  PERGANTIAN_SCHEMA,
  TUNJANGAN_SCHEMA,
  type SheetSpec,
  type ColumnSpec,
} from "../../../../convex/shared/uploadSchemas";
import { INFERENCE_RULES } from "../../../../convex/shared/categoryInference";

export type PanduanKind = "weekly" | "pergantian" | "tunjangan";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: PanduanKind;
};

const KIND_META: Record<PanduanKind, { title: string; subtitle: string; baseName: string }> = {
  weekly: {
    title: "Panduan AI — Upload Laporan Mingguan",
    subtitle: "Kirim panduan + file Excel mentah ke ChatGPT/Claude. AI rapikan dulu sebelum upload.",
    baseName: "panduan-upload-laporan-mingguan",
  },
  pergantian: {
    title: "Panduan AI — Upload Pergantian Produk",
    subtitle: "Schema 7-kolom untuk bahan yang diganti supplier.",
    baseName: "panduan-upload-pergantian-produk",
  },
  tunjangan: {
    title: "Panduan AI — Upload Tunjangan Karyawan",
    subtitle: "Form 14-kolom tunjangan luar kota / kost / transport.",
    baseName: "panduan-upload-tunjangan-karyawan",
  },
};

export function PanduanAiDialog({ open, onOpenChange, kind }: Props) {
  const meta = KIND_META[kind];
  const categories = useQuery(api.features.masterData.queries.listExpenseCategories);

  const schemas: SheetSpec[] = useMemo(
    () => kind === "weekly"
      ? WEEKLY_SHEETS
      : kind === "pergantian"
        ? [PERGANTIAN_SCHEMA]
        : [TUNJANGAN_SCHEMA],
    [kind],
  );

  const csv = useMemo(() => buildCsv(schemas), [schemas]);
  const json = useMemo(
    () => buildJson(kind, schemas, categories ?? []),
    [kind, schemas, categories],
  );
  const md = useMemo(
    () => buildMarkdown(kind, schemas, categories ?? []),
    [kind, schemas, categories],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-primary" />
            {meta.title}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">{meta.subtitle}</p>
        </DialogHeader>

        <Tabs defaultValue="md" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 py-3 border-b border-border shrink-0">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="md" className="gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> Markdown
              </TabsTrigger>
              <TabsTrigger value="json" className="gap-1.5">
                <Braces className="h-3.5 w-3.5" /> JSON
              </TabsTrigger>
              <TabsTrigger value="csv" className="gap-1.5">
                <Table className="h-3.5 w-3.5" /> CSV
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="md" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
            <ContentPanel
              text={md}
              filename={`${meta.baseName}.md`}
              mime="text/markdown"
              hint="Markdown manusiawi — copy ke ChatGPT/Claude sebagai system prompt + lampirkan file Excel mentah."
              language="markdown"
            />
          </TabsContent>

          <TabsContent value="json" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
            <ContentPanel
              text={json}
              filename={`${meta.baseName}.json`}
              mime="application/json"
              hint="JSON schema lengkap (kolom + kategori + inference rules). Format paling efektif buat LLM — kirim sebagai tool/system instruction."
              language="json"
            />
          </TabsContent>

          <TabsContent value="csv" className="flex-1 overflow-hidden mt-0 data-[state=inactive]:hidden">
            <ContentPanel
              text={csv}
              filename={`${meta.baseName}.csv`}
              mime="text/csv"
              hint="Template kosong header-only — buka di Excel, isi data, save as .xlsx, upload. Multi-sheet ditandai pakai komentar `# Sheet: <nama>`."
              language="csv"
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Content panel (shared by all 3 tabs) ───────────────────

function ContentPanel({
  text, filename, mime, hint, language,
}: {
  text: string;
  filename: string;
  mime: string;
  hint: string;
  language: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const download = () => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-2 bg-muted/30 border-b border-border/60 text-xs text-muted-foreground flex items-center justify-between gap-3 shrink-0">
        <span className="leading-relaxed">{hint}</span>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-card hover:bg-muted/50 text-xs font-semibold transition-colors"
          >
            {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
            {copied ? "Disalin" : "Salin"}
          </button>
          <button
            onClick={download}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-colors"
          >
            <Download className="h-3 w-3" />
            Download
          </button>
        </div>
      </div>
      <ScrollArea className="flex-1 max-h-full">
        <pre className="px-6 py-4 text-[11px] leading-relaxed font-mono whitespace-pre text-foreground/90 min-w-max">
          <code className={`language-${language}`}>{text}</code>
        </pre>
      </ScrollArea>
    </div>
  );
}

// ─── Builders ──────────────────────────────────────────────

function buildCsv(schemas: SheetSpec[]): string {
  const blocks: string[] = [];
  for (const sheet of schemas) {
    blocks.push(`# Sheet: ${sheet.label}`);
    blocks.push(`# Keyword sheet name: ${sheet.keyword}`);
    blocks.push(`# Header row (0-based): ${sheet.headerRow}    Data starts: ${sheet.dataStartRow}`);
    blocks.push(`# ${sheet.description}`);
    const header = sheet.columns.map((c) => csvCell(c.name)).join(",");
    blocks.push(header);
    // one example row
    const example = sheet.columns.map((c) => csvCell(c.example ?? exampleFor(c.type))).join(",");
    blocks.push(example);
    blocks.push("");
  }
  return blocks.join("\n");
}

function csvCell(v: string | undefined): string {
  const s = (v ?? "").toString();
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exampleFor(t: ColumnSpec["type"]): string {
  switch (t) {
    case "date": return "2026-05-13";
    case "currency": return "10000";
    case "qty": return "1";
    case "unit": return "KG";
    case "enum": return "";
    default: return "";
  }
}

function buildJson(kind: PanduanKind, schemas: SheetSpec[], cats: { name: string; type: string }[]): string {
  const data = {
    project: "rc-samata-dash",
    uploadKind: kind,
    fileNamePattern: kind === "weekly"
      ? "<BRANCH> NEW LAP <D1>-<D2> <MMM> <YYYY>.xlsx"
      : kind === "pergantian"
        ? "Pergantian Produk <D1>-<D2> <BULAN> <YYYY>.xlsx"
        : "Form Tunjangan Khusus <YYYY>.xlsx",
    dateFormat: "YYYY-MM-DD",
    currencyFormat: "raw integer (no Rp, no thousands separator)",
    qtyFormat: "decimal with dot",
    aiInstruction:
      "Rapikan file Excel sesuai schema di bawah. JANGAN ubah angka. Output: 1 file .xlsx + ringkasan perubahan. Pakai nama kolom + sheet keyword PERSIS sesuai schema.",
    sheets: schemas.map((s) => ({
      key: s.key,
      label: s.label,
      sheetNameKeyword: s.keyword,
      headerRow: s.headerRow,
      dataStartRow: s.dataStartRow,
      description: s.description,
      stopOnEmpty: s.stopOnEmpty,
      columns: s.columns,
    })),
    ...(kind === "weekly" && {
      expenseCategories: cats.length
        ? cats.map((c) => ({ name: c.name, type: c.type }))
        : INFERENCE_RULES.map((r) => ({ name: r.label, type: r.type })),
      inferenceRules: INFERENCE_RULES.map((r) => ({
        keywords: r.keywords,
        assignTo: r.label,
        categoryType: r.type,
      })),
      inferenceNote:
        "Untuk LPKK kolom LAIN-LAIN: cek deskripsi terhadap keywords. Match pertama menang. Tidak match → kategori 'Lain-lain' + tulis '[REVIEW] butuh review manual' di catatan.",
    }),
  };
  return JSON.stringify(data, null, 2);
}

function buildMarkdown(kind: PanduanKind, schemas: SheetSpec[], cats: { name: string; type: string }[]): string {
  const lines: string[] = [];
  const meta = KIND_META[kind];
  lines.push(`# ${meta.title}`);
  lines.push("");
  lines.push(`> ${meta.subtitle}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Prompt Sistem (copy-paste ke AI)");
  lines.push("");
  lines.push("```");
  lines.push("Kamu asisten data RC Samata. Saya kirim file Excel.");
  lines.push("Tugasmu: rapikan sesuai schema di bawah.");
  lines.push("");
  lines.push("Aturan keras:");
  lines.push("1. JANGAN ubah angka apapun.");
  lines.push("2. Sheet name pakai keyword PERSIS dari panduan.");
  lines.push("3. Tanggal format YYYY-MM-DD.");
  lines.push("4. Angka rupiah: integer murni (tanpa Rp/titik/koma).");
  lines.push("5. Item name UPPERCASE konsisten.");
  if (kind === "weekly") {
    lines.push("6. Kategori expense WAJIB pakai daftar di bawah.");
    lines.push("7. Untuk kolom LAIN-LAIN di LPKK: pakai inference rule keyword.");
  }
  lines.push("8. Hapus baris kosong + baris TOTAL/JUMLAH di tengah data.");
  lines.push("9. Output: 1 file .xlsx + ringkasan perubahan teks.");
  lines.push("```");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Schema Sheet");
  lines.push("");
  for (const s of schemas) {
    lines.push(`### ${s.label}`);
    lines.push("");
    lines.push(`**Keyword nama sheet:** \`${s.keyword}\``);
    lines.push(`**Header row (0-based):** ${s.headerRow} · **Data mulai row:** ${s.dataStartRow}`);
    if (s.stopOnEmpty?.length) lines.push(`**Stop di:** ${s.stopOnEmpty.join(", ")}`);
    lines.push("");
    lines.push(s.description);
    lines.push("");
    lines.push("| Col | Nama | Tipe | Wajib | Contoh | Catatan |");
    lines.push("|---|---|---|---|---|---|");
    for (const c of s.columns) {
      lines.push(`| ${c.index} | ${c.name} | ${c.type}${c.enumValues ? ` (${c.enumValues.join("/")})` : ""} | ${c.required ? "WAJIB" : "-"} | ${c.example ?? "-"} | ${c.notes ?? "-"} |`);
    }
    lines.push("");
  }
  if (kind === "weekly") {
    lines.push("---");
    lines.push("");
    lines.push("## Kategori Expense Standar (live dari database)");
    lines.push("");
    if (cats.length === 0) {
      lines.push("_Belum dimuat — kategori akan diisi dari fallback inference rule._");
    } else {
      lines.push("| Label | Type |");
      lines.push("|---|---|");
      for (const c of cats) {
        lines.push(`| ${c.name} | ${c.type} |`);
      }
    }
    lines.push("");
    lines.push("---");
    lines.push("");
    lines.push("## Inference Rule (untuk LPKK kolom LAIN-LAIN)");
    lines.push("");
    lines.push("Cek deskripsi terhadap keywords. Match pertama menang. Urutan = prioritas.");
    lines.push("");
    lines.push("| Keyword (any of) | Kategori | Type |");
    lines.push("|---|---|---|");
    for (const r of INFERENCE_RULES) {
      lines.push(`| ${r.keywords.join(", ")} | ${r.label} | ${r.type} |`);
    }
    lines.push("");
    lines.push("Tidak match → `Lain-lain` + tulis `[REVIEW] butuh review manual` di catatan.");
  }
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Output Akhir");
  lines.push("");
  lines.push("```");
  lines.push("[OK]     Sheet diproses : N");
  lines.push("[OK]     Baris dirapikan: N");
  lines.push("[SKIP]   Baris di-skip  : N (alasan)");
  lines.push("[EDIT]   Perubahan utama:");
  lines.push("   - Format tanggal: N baris diperbaiki ke YYYY-MM-DD");
  if (kind === "weekly") lines.push("   - Kategori auto-inferred: N baris LPKK LAIN-LAIN diklasifikasi");
  lines.push("   - Nama item normalisasi UPPERCASE: N baris");
  lines.push("```");
  return lines.join("\n");
}
