export function exportToCsv<T extends object>(
  items: T[],
  columns: { key: keyof T; label: string }[],
  filename = "export.csv"
) {
  const header = columns.map((c) => c.label).join(",");
  const rows = items.map((item) =>
    columns.map((c) => `"${String((item as Record<string, unknown>)[c.key as string]).replace(/"/g, '""')}"`).join(",")
  );
  const csv = [header, ...rows].join("\n");
  downloadBlob(csv, filename, "text/csv;charset=utf-8;");
}

export function exportToJson<T>(items: T[], filename = "export.json") {
  const json = JSON.stringify(items, null, 2);
  downloadBlob(json, filename, "application/json");
}

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function importFromCsv<T extends object>(
  file: File,
  columns: { key: keyof T; label: string }[]
): Promise<Partial<T>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length < 2) return resolve([]);
        const rows = lines.slice(1).map((line) => {
          const values = line.match(/(\".*?\"|[^\",\s]+)(?=\s*,|\s*$)/g) ?? [];
          const obj: Record<string, string> = {};
          columns.forEach((col, i) => {
            obj[col.key as string] = (values[i] || "").replace(/^"|"$/g, "").replace(/""/g, '"');
          });
          return obj as Partial<T>;
        });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function importFromJson<T>(file: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        resolve(JSON.parse(e.target?.result as string));
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
