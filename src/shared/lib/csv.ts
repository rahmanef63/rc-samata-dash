/**
 * Tiny CSV utilities. We don't pull a dependency for this — the
 * features need at most RFC 4180 quoting + comma split, no streaming.
 * Centralised so every import dialog uses the same parser (consistent
 * handling of "" escapes, newlines in quoted cells, trailing CRLF).
 */

/** Parse a single CSV line into cell values. Handles "" escaping. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else {
      if (ch === ",") { out.push(cur); cur = ""; }
      else if (ch === '"') inQ = true;
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** Parse full CSV text → { header, rows }. Drops empty lines. */
export function parseCsvText(text: string): { header: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { header: [], rows: [] };
  const header = parseCsvLine(lines[0]).map((s) => s.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(parseCsvLine);
  return { header, rows };
}

/** Quote a cell if it contains special characters. */
export function csvEscape(v: unknown): string {
  const s = v == null ? "" : String(v);
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Build CSV text from header + row-of-records. */
export function rowsToCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: { id: keyof T & string; label: string }[],
): string {
  const header = columns.map((c) => csvEscape(c.label)).join(",");
  const body = rows.map((r) =>
    columns.map((c) => csvEscape(r[c.id])).join(","),
  );
  return [header, ...body].join("\n");
}

/** Trigger browser download for a CSV blob. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
