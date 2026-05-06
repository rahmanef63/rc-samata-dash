// Audit checklist sections (QSR template)
type AuditItem = {
  id: number;
  question: string;
  type: "checkbox" | "number" | "photo" | "rating" | "textarea";
  unit?: string;
  required: boolean;
};

export const auditSections: { title: string; items: AuditItem[] }[] = [
  {
    title: "Kebersihan Dapur",
    items: [
      { id: 1, question: "Lantai dapur dalam kondisi bersih dan tidak berminyak?", type: "checkbox" as const, required: true },
      { id: 2, question: "Suhu freezer penyimpanan ayam?", type: "number" as const, unit: "°C", required: true },
      { id: 3, question: "Upload foto bukti kebersihan area cooking", type: "photo" as const, required: false },
      { id: 4, question: "Peralatan masak bersih dan tersimpan rapi?", type: "checkbox" as const, required: true },
      { id: 5, question: "Bahan baku tertutup dan diberi label tanggal?", type: "checkbox" as const, required: true },
    ],
  },
  {
    title: "Kualitas Layanan",
    items: [
      { id: 6, question: "Kecepatan pelayanan kasir & keramahan", type: "rating" as const, required: true },
      { id: 7, question: "Kelengkapan seragam karyawan", type: "checkbox" as const, required: true },
      { id: 8, question: "Kebersihan area makan pelanggan", type: "checkbox" as const, required: true },
      { id: 9, question: "Catatan tambahan", type: "textarea" as const, required: false },
    ],
  },
  {
    title: "Inventaris & Stok",
    items: [
      { id: 10, question: "Stok ayam hari ini sesuai dengan catatan?", type: "checkbox" as const, required: true },
      { id: 11, question: "Selisih stok ditemukan?", type: "textarea" as const, required: false },
      { id: 12, question: "Tanggal kadaluarsa bahan diperiksa?", type: "checkbox" as const, required: true },
    ],
  },
  {
    title: "Kas & Keuangan",
    items: [
      { id: 13, question: "Saldo kas fisik sesuai dengan laporan sistem?", type: "checkbox" as const, required: true },
      { id: 14, question: "Selisih kas (jika ada)?", type: "number" as const, unit: "Rp", required: false },
      { id: 15, question: "Semua struk penjualan hari ini tercetak?", type: "checkbox" as const, required: true },
    ],
  },
];
