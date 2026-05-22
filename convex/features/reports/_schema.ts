import { defineTable } from "convex/server";
import { v } from "convex/values";

export const reportsTables = {
  /** Header record per file LAP yang diupload. */
  weeklyReports: defineTable({
    branchId: v.id("branches"),
    fileName: v.string(),
    /** Original xlsx persisted to Convex storage for re-download/comparison. Optional for legacy rows. */
    fileStorageId: v.optional(v.id("_storage")),
    periodStart: v.string(),
    periodEnd: v.string(),
    uploadedBy: v.string(),
    uploadedAt: v.number(),
    status: v.union(v.literal("pending"), v.literal("processed"), v.literal("error")),
    /** Validation tracking — "clean" = no issues, "needs_review" = has notes, "validated" = user confirmed OK */
    validationStatus: v.optional(v.union(v.literal("clean"), v.literal("needs_review"), v.literal("validated"))),
    /** Stored validation notes from upload (JSON array of {severity, category, message, tip}) */
    validationNotes: v.optional(v.array(v.object({
      severity: v.string(),
      category: v.string(),
      message: v.string(),
      tip: v.string(),
    }))),
    /**
     * Sheet names in the uploaded xlsx that no parser matched. Lets the
     * UI flag "data we haven't prepared yet" — owner can request a parser
     * for a new sheet type without losing the upload.
     */
    unknownSheets: v.optional(v.array(v.string())),
    expenseCount: v.optional(v.number()),
    salesCount: v.optional(v.number()),
    vendorCount: v.optional(v.number()),
    inventoryCount: v.optional(v.number()),
    // Tambahan sheet baru
    leftoverCount: v.optional(v.number()),
    kasPeriodeCount: v.optional(v.number()),
    salesControlCount: v.optional(v.number()),
    creditPurchaseCount: v.optional(v.number()),
    // Phase 2 sheets
    foodCostSummaryCount: v.optional(v.number()),
    transferCount: v.optional(v.number()),
    hppCount: v.optional(v.number()),
    costAnalysisCount: v.optional(v.number()),
    cashFlowCount: v.optional(v.number()),
    incentiveCount: v.optional(v.number()),
  })
    .index("by_branch", ["branchId"])
    .index("by_branch_period", ["branchId", "periodStart"]),

  /**
   * Penjualan harian per produk — dari sheet LAP. PENJUALAN,
   * LAP. PENJUALAN GRAB FOOD, GO FOOD, SHOPEE FOOD.
   * channel: "all" | "grabfood" | "gofood" | "shopeefood" | "ovo" |
   *          "dana" | "qris" | "tambahan"
   * Stored as optional string (no enum guard) so new platforms can
   * be added without schema migration; production code should refer
   * to convex/shared/validators.ts:incomeChannelTypeValidator for
   * the canonical list.
   */
  productSales: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    businessDate: v.string(),
    productName: v.string(),
    qty: v.number(),
    amount: v.number(),
    unitPrice: v.number(),
    foodCostItem: v.optional(v.number()),
    channel: v.optional(v.string()),
  })
    .index("by_report", ["reportId"])
    .index("by_branch_date", ["branchId", "businessDate"])
    .index("by_report_channel", ["reportId", "channel"]),

  /** Pembelian & stok bahan mingguan per komoditi — dari sheet VENDOR. */
  vendorPurchases: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    weekStart: v.string(),
    commodityName: v.string(),
    section: v.optional(v.string()),
    openingQty: v.number(),
    openingValue: v.number(),
    purchaseQty: v.number(),
    purchaseValue: v.number(),
    usageQty: v.number(),
    usageValue: v.optional(v.number()),
    closingQty: v.number(),
    closingValue: v.number(),
    prevWeekValue: v.optional(v.number()),
  })
    .index("by_report", ["reportId"])
    .index("by_branch_week", ["branchId", "weekStart"]),

  /** Valuasi inventory / food cost — dari sheet WEEKLY FC.
   *  `category` (string) di-keep buat back-compat + display, `categoryId`
   *  (FK) di-set oleh ETL via lookup ke expenseCategories master. SSOT:
   *  FK adalah truth; string adalah cache. */
  inventoryValuation: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    valuationDate: v.string(),
    category: v.string(),
    categoryId: v.optional(v.id("expenseCategories")),
    itemName: v.string(),
    qty: v.number(),
    unit: v.string(),
    unitPrice: v.number(),
    totalValue: v.number(),
  })
    .index("by_report", ["reportId"])
    .index("by_branch_date", ["branchId", "valuationDate"])
    .index("by_category", ["categoryId"]),

  /**
   * Left over / spoilage harian per item — dari sheet LEFT OVER.
   * Satu record = satu item, satu hari.
   */
  leftoverItems: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    businessDate: v.string(),
    itemName: v.string(),
    qty: v.number(),
  })
    .index("by_report", ["reportId"])
    .index("by_branch_date", ["branchId", "businessDate"]),

  /**
   * Ringkasan kas & penjualan harian — dari sheet LAPORAN KAS PERIODE.
   * Satu record = satu hari.
   */
  dailyCashSummary: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    businessDate: v.string(),
    grossSales: v.number(),
    komisiGofood: v.number(),
    komisiGrabfood: v.number(),
    komisiShopeefood: v.number(),
    koreksi: v.number(),
    discount: v.number(),
    netSales: v.number(),
  })
    .index("by_report", ["reportId"])
    .index("by_branch_date", ["branchId", "businessDate"]),

  /**
   * Kontrol penjualan harian — dari sheet SALES CONTROL.
   * Berisi net sales, customer count, target, dll.
   */
  salesControl: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    businessDate: v.string(),
    netSales: v.number(),
    customerCount: v.number(),
    spendingPower: v.number(),
    targetSales: v.number(),
    achievementPct: v.number(),
  })
    .index("by_report", ["reportId"])
    .index("by_branch_date", ["branchId", "businessDate"]),

  /**
   * Pembelian kredit dari supplier — dari sheet PEMBELIAN KREDIT.
   */
  creditPurchases: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    purchaseDate: v.string(),
    supplierName: v.string(),
    itemName: v.string(),
    invoiceNo: v.optional(v.string()),
    qty: v.number(),
    unitPrice: v.number(),
    totalAmount: v.number(),
    dueDate: v.optional(v.string()),
    // Sheet "PEMBELIAN KREDIT" col 7 (LAMA KREDIT in days) + col 10 (TANGGAL DIBAYAR)
    creditDays: v.optional(v.number()),
    paidDate: v.optional(v.string()),
  })
    .index("by_report", ["reportId"])
    .index("by_branch_date", ["branchId", "purchaseDate"]),

  /**
   * Ikhtisar food cost per kategori — dari sheet IKHTISAR FOOD COST.
   * Satu record = satu kategori bahan (ayam, es, minyak, dll).
   */
  foodCostSummary: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    periodStart: v.string(),
    category: v.string(),
    categoryId: v.optional(v.id("expenseCategories")),
    openingValue: v.number(),
    purchaseValue: v.number(),
    transferOutValue: v.number(),
    transferInValue: v.number(),
    closingValue: v.number(),
    usageValue: v.number(),
    salesRevenue: v.optional(v.number()),
    foodCostPct: v.optional(v.number()),
  })
    .index("by_report", ["reportId"])
    .index("by_branch_period", ["branchId", "periodStart"])
    .index("by_category", ["categoryId"]),

  /**
   * Transfer Out / Transfer In — dari sheet TO - TI.
   * Perkedel, catering, staff meal, free items, dll.
   */
  transferItems: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    periodStart: v.string(),
    direction: v.union(v.literal("out"), v.literal("in")),
    category: v.string(),
    categoryId: v.optional(v.id("expenseCategories")),
    itemName: v.string(),
    qty: v.number(),
    unit: v.optional(v.string()),
    totalValue: v.number(),
  })
    .index("by_report", ["reportId"])
    .index("by_branch_period", ["branchId", "periodStart"])
    .index("by_category", ["categoryId"]),

  /**
   * HPP per produk — dari sheet HITUNGAN HPP PRODUK + FOOD COST ITEM KELAS.
   * Satu record = satu produk dengan daftar ingredients.
   */
  productHPP: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    periodStart: v.string(),
    productName: v.string(),
    pricingClass: v.union(
      v.literal("standard"),
      v.literal("kelas2"),
      v.literal("kelas3a"),
      v.literal("kelas3b"),
      v.literal("kelas4"),
    ),
    totalHPP: v.number(),
    sellingPrice: v.optional(v.number()),
    ingredients: v.optional(v.array(v.object({
      name: v.string(),
      qty: v.number(),
      unit: v.string(),
      unitCost: v.number(),
      subtotal: v.number(),
    }))),
  })
    .index("by_report", ["reportId"])
    .index("by_branch_product", ["branchId", "productName"])
    .index("by_report_class", ["reportId", "pricingClass"]),

  /**
   * Cost analysis per item — dari sheet COST ANALYSIS.
   * Opening, purchase, usage, closing, variance.
   */
  costAnalysis: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    periodStart: v.string(),
    itemName: v.string(),
    unit: v.optional(v.string()),
    openingQty: v.number(),
    openingValue: v.number(),
    purchaseQty: v.number(),
    purchaseValue: v.number(),
    usageQty: v.number(),
    usageValue: v.number(),
    closingQty: v.number(),
    closingValue: v.number(),
    variance: v.number(),
  })
    .index("by_report", ["reportId"])
    .index("by_branch_period", ["branchId", "periodStart"]),

  /**
   * Arus kas harian — dari sheet LAP. CF.
   * Satu record = satu hari.
   */
  dailyCashFlow: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    businessDate: v.string(),
    openingBalance: v.number(),
    salesInflow: v.number(),
    otherInflow: v.number(),
    expenseOutflow: v.number(),
    otherOutflow: v.number(),
    closingBalance: v.number(),
  })
    .index("by_report", ["reportId"])
    .index("by_branch_date", ["branchId", "businessDate"]),

  /**
   * Insentif karyawan — dari sheet INSENTIF.
   */
  employeeIncentives: defineTable({
    reportId: v.id("weeklyReports"),
    branchId: v.id("branches"),
    periodStart: v.string(),
    employeeName: v.string(),
    incentiveType: v.string(),
    amount: v.number(),
    notes: v.optional(v.string()),
  })
    .index("by_report", ["reportId"])
    .index("by_branch_period", ["branchId", "periodStart"]),

  /**
   * Pergantian produk / bahan — dari file "RC SAMATA PERGANTIAN PRODUK".
   * Satu record = satu bahan yang diganti/dibuang dalam periode tertentu.
   */
  productChanges: defineTable({
    branchId: v.id("branches"),
    fileName: v.string(),
    periodLabel: v.string(),
    uploadedAt: v.number(),
    itemName: v.string(),
    expiredDate: v.optional(v.string()),
    unit: v.optional(v.string()),
    unitPrice: v.number(),
    qty: v.number(),
    ppn: v.number(),
    totalPrice: v.number(),
  })
    .index("by_branch", ["branchId"])
    .index("by_branch_period", ["branchId", "periodLabel"]),

  /**
   * KPI targets per branch — target vs actual benchmarks for QSR operations.
   * Seeded with standard Rocket Chicken targets, editable per branch.
   */
  kpiTargets: defineTable({
    branchId: v.id("branches"),
    effectiveFrom: v.string(),
    kpiCode: v.string(),
    kpiLabel: v.string(),
    targetValue: v.number(),
    warningThreshold: v.number(),
    dangerThreshold: v.number(),
    unit: v.string(),
    direction: v.union(v.literal("lower_is_better"), v.literal("higher_is_better")),
  })
    .index("by_branch", ["branchId"])
    .index("by_branch_kpi", ["branchId", "kpiCode"]),

  /**
   * Tunjangan khusus karyawan — dari file "FORM PENGAJUAN TUNJANGAN KHUSUS".
   * Satu record = satu karyawan dengan detail tunjangan.
   */
  employeeAllowances: defineTable({
    branchId: v.id("branches"),
    fileName: v.string(),
    periodLabel: v.string(),
    uploadedAt: v.number(),
    employeeName: v.string(),
    joinDate: v.optional(v.string()),
    position: v.optional(v.string()),
    storeOrigin: v.optional(v.string()),
    storePlacement: v.optional(v.string()),
    rotationType: v.optional(v.string()),
    distance: v.optional(v.string()),
    travelTime: v.optional(v.string()),
    luarKotaAmount: v.number(),
    subsidiTransportAmount: v.number(),
    budgetKosAmount: v.number(),
    reimburseNote: v.optional(v.string()),
    kosNote: v.optional(v.string()),
  })
    .index("by_branch", ["branchId"])
    .index("by_employee", ["branchId", "employeeName"]),
};
