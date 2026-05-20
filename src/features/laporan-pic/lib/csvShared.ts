// Shared CSV utilities for laporan-pic format parsers.

export function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_-]/g, "");
}

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

// Indonesian or US date → YYYY-MM-DD. Handles "12/31/2025", "1/26/2026",
// "2026-04-29", "31/12/2025" by heuristic (year-first stays as-is, else
// assume M/D/YYYY since CSVs in repo use that).
export function normalizeDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // M/D/YYYY (preferred — what Excel exports)
  const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m1) {
    return `${m1[3]}-${m1[1].padStart(2, "0")}-${m1[2].padStart(2, "0")}`;
  }
  return null;
}
