import { defineTable } from "convex/server";
import { v } from "convex/values";

export const reportsTables = {
  weeklyReports: defineTable({
    fileName: v.string(),
    fileStorageId: v.optional(v.id("_storage")),
    periodStart: v.string(),
    periodEnd: v.string(),
    uploadedBy: v.string(),
    uploadedAt: v.number(),
    status: v.union(v.literal("pending"), v.literal("processed"), v.literal("error")),
    validationStatus: v.optional(v.union(v.literal("clean"), v.literal("needs_review"), v.literal("validated"))),
    validationNotes: v.optional(v.array(v.object({
      severity: v.string(),
      category: v.string(),
      message: v.string(),
      tip: v.string(),
    }))),
    unknownSheets: v.optional(v.array(v.string())),
    expenseCount: v.optional(v.number()),
    salesCount: v.optional(v.number()),
    vendorCount: v.optional(v.number()),
    inventoryCount: v.optional(v.number()),
    leftoverCount: v.optional(v.number()),
    kasPeriodeCount: v.optional(v.number()),
    salesControlCount: v.optional(v.number()),
    creditPurchaseCount: v.optional(v.number()),
    foodCostSummaryCount: v.optional(v.number()),
    transferCount: v.optional(v.number()),
    hppCount: v.optional(v.number()),
    costAnalysisCount: v.optional(v.number()),
    cashFlowCount: v.optional(v.number()),
    incentiveCount: v.optional(v.number()),
  })
    .index("by_period", ["periodStart"])
    .index("by_uploadedAt", ["uploadedAt"]),

  productSales: defineTable({
    reportId: v.id("weeklyReports"),
    businessDate: v.string(),
    productName: v.string(),
    qty: v.number(),
    amount: v.number(),
    unitPrice: v.number(),
    foodCostItem: v.optional(v.number()),
    channel: v.optional(v.string()),
  })
    .index("by_report", ["reportId"])
    .index("by_date", ["businessDate"])
    .index("by_report_channel", ["reportId", "channel"]),

  vendorPurchases: defineTable({
    reportId: v.id("weeklyReports"),
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
    .index("by_week", ["weekStart"]),

  inventoryValuation: defineTable({
    reportId: v.id("weeklyReports"),
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
    .index("by_date", ["valuationDate"])
    .index("by_category", ["categoryId"]),

  leftoverItems: defineTable({
    reportId: v.id("weeklyReports"),
    businessDate: v.string(),
    itemName: v.string(),
    qty: v.number(),
  })
    .index("by_report", ["reportId"])
    .index("by_date", ["businessDate"]),

  dailyCashSummary: defineTable({
    reportId: v.id("weeklyReports"),
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
    .index("by_date", ["businessDate"]),

  salesControl: defineTable({
    reportId: v.id("weeklyReports"),
    businessDate: v.string(),
    netSales: v.number(),
    customerCount: v.number(),
    spendingPower: v.number(),
    targetSales: v.number(),
    achievementPct: v.number(),
  })
    .index("by_report", ["reportId"])
    .index("by_date", ["businessDate"]),

  creditPurchases: defineTable({
    reportId: v.id("weeklyReports"),
    purchaseDate: v.string(),
    supplierName: v.string(),
    itemName: v.string(),
    invoiceNo: v.optional(v.string()),
    qty: v.number(),
    unitPrice: v.number(),
    totalAmount: v.number(),
    dueDate: v.optional(v.string()),
    creditDays: v.optional(v.number()),
    paidDate: v.optional(v.string()),
  })
    .index("by_report", ["reportId"])
    .index("by_date", ["purchaseDate"]),

  foodCostSummary: defineTable({
    reportId: v.id("weeklyReports"),
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
    .index("by_period", ["periodStart"])
    .index("by_category", ["categoryId"]),

  transferItems: defineTable({
    reportId: v.id("weeklyReports"),
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
    .index("by_period", ["periodStart"])
    .index("by_category", ["categoryId"]),

  productHPP: defineTable({
    reportId: v.id("weeklyReports"),
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
    .index("by_product", ["productName"])
    .index("by_report_class", ["reportId", "pricingClass"]),

  costAnalysis: defineTable({
    reportId: v.id("weeklyReports"),
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
    .index("by_period", ["periodStart"]),

  dailyCashFlow: defineTable({
    reportId: v.id("weeklyReports"),
    businessDate: v.string(),
    openingBalance: v.number(),
    salesInflow: v.number(),
    otherInflow: v.number(),
    expenseOutflow: v.number(),
    otherOutflow: v.number(),
    closingBalance: v.number(),
  })
    .index("by_report", ["reportId"])
    .index("by_date", ["businessDate"]),

  employeeIncentives: defineTable({
    reportId: v.id("weeklyReports"),
    periodStart: v.string(),
    employeeName: v.string(),
    incentiveType: v.string(),
    amount: v.number(),
    notes: v.optional(v.string()),
  })
    .index("by_report", ["reportId"])
    .index("by_period", ["periodStart"]),

  productChanges: defineTable({
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
  }).index("by_period", ["periodLabel"]),

  kpiTargets: defineTable({
    effectiveFrom: v.string(),
    kpiCode: v.string(),
    kpiLabel: v.string(),
    targetValue: v.number(),
    warningThreshold: v.number(),
    dangerThreshold: v.number(),
    unit: v.string(),
    direction: v.union(v.literal("lower_is_better"), v.literal("higher_is_better")),
  }).index("by_kpi", ["kpiCode"]),

  employeeAllowances: defineTable({
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
  }).index("by_employee", ["employeeName"]),
};
