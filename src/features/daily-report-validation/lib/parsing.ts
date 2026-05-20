// Shared parsing primitives for WhatsApp report formats.

const ID_MONTHS: Record<string, string> = {
  jan: "01", januari: "01",
  feb: "02", februari: "02",
  mar: "03", maret: "03",
  apr: "04", april: "04",
  mei: "05", may: "05",
  jun: "06", juni: "06",
  jul: "07", juli: "07",
  agu: "08", aug: "08", agustus: "08",
  sep: "09", september: "09",
  okt: "10", oct: "10", oktober: "10",
  nov: "11", november: "11",
  des: "12", dec: "12", desember: "12",
};

const ID_WEEKDAYS = ["senin", "selasa", "rabu", "kamis", "jumat", "jum'at", "sabtu", "minggu"];

// Find "29 april 2026" or "senin, 29 april 2026" anywhere in text →
// return YYYY-MM-DD or null.
export function parseIdDate(text: string): string | null {
  const lower = text.toLowerCase();
  // Strip weekday prefix if present
  for (const day of ID_WEEKDAYS) {
    if (lower.includes(day)) {
      // continue (we just need the date portion to match below)
      break;
    }
  }
  // dd <month> yyyy
  const m = lower.match(/(\d{1,2})\s+([a-z']+)\s+(\d{4})/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const monthKey = m[2].replace(/'/g, "");
  const mm = ID_MONTHS[monthKey] ?? ID_MONTHS[monthKey.slice(0, 3)];
  if (!mm) return null;
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
}

// Parse "1.834.071" / "1834071" / "1.834.071,50" / "Rp 1.834.071" → number.
// Indonesian convention: "." = thousands, "," = decimal.
export function parseRupiahLoose(raw: string): number {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/rp/gi, "").replace(/\s/g, "").trim();
  if (cleaned.includes(".") && cleaned.includes(",")) {
    return Number(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
  }
  // Only "." present → could be thousands OR decimal. If all dot-groups
  // are 3-digit it's thousands. Else assume decimal.
  if (cleaned.includes(".") && !cleaned.includes(",")) {
    const parts = cleaned.split(".");
    const last = parts[parts.length - 1];
    if (last.length === 3) return Number(parts.join("")) || 0;
    return Number(cleaned) || 0;
  }
  return Number(cleaned.replace(/[^\d-]/g, "")) || 0;
}
