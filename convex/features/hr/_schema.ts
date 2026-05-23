/**
 * HR — staff master + schedules + compensation
 *
 * `staff` is distinct from `users` (auth/login). A staff can exist
 * without a user account (SV lapor via SPV WA), and a user may not
 * be a staff (owner-only).
 */
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const staffRoleValidator = v.union(
  v.literal("owner"),
  v.literal("manager"),
  v.literal("supervisor"),
  v.literal("kasir"),
  v.literal("cook"),
  v.literal("server"),
  v.literal("delivery"),
  v.literal("admin"),
  v.literal("other"),
);

export const tunjanganTypeValidator = v.union(
  v.literal("luar_kota"),
  v.literal("kost"),
  v.literal("subsidi_transport"),
  v.literal("makan"),
  v.literal("other"),
);

export const performanceCategoryValidator = v.union(
  v.literal("excellent"),
  v.literal("good"),
  v.literal("average"),
  v.literal("poor"),
);

export const hrTables = {
  staff: defineTable({
    fullName: v.string(),
    nickname: v.optional(v.string()),
    role: staffRoleValidator,
    phone: v.optional(v.string()),
    hireDate: v.optional(v.string()),
    isActive: v.boolean(),
    userId: v.optional(v.id("users")),   // link to login if any
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_active", ["isActive"])
    .index("by_role", ["role"])
    .index("by_user", ["userId"]),

  staffSchedules: defineTable({
    staffId: v.id("staff"),
    periodMonth: v.string(),     // "2026-05"
    shiftPattern: v.string(),    // free-form: "P-P-P-L-P-P-P-L" or similar
    daysWorked: v.number(),
    daysOff: v.number(),
    notes: v.optional(v.string()),
  }).index("by_staff_period", ["staffId", "periodMonth"]),

  staffPiket: defineTable({
    weekPeriod: v.string(),               // "2026-W21"
    areaPiket: v.string(),                // "Dapur" | "Frontend" | etc.
    staffIds: v.array(v.string()),        // staff.id array — loose by design
    notes: v.optional(v.string()),
  }).index("by_week", ["weekPeriod"]),

  staffPerformance: defineTable({
    staffId: v.id("staff"),
    periodMonth: v.string(),
    kategoriPerforma: performanceCategoryValidator,
    score: v.optional(v.number()),
    notes: v.optional(v.string()),
    reviewedBy: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_staff_period", ["staffId", "periodMonth"]),

  tunjanganKaryawan: defineTable({
    staffId: v.id("staff"),
    periodMonth: v.string(),              // "2026-05"
    tipeTunjangan: tunjanganTypeValidator,
    amount: v.number(),
    notes: v.optional(v.string()),
    transactionId: v.optional(v.id("transactions")),
    createdAt: v.number(),
  })
    .index("by_staff_period", ["staffId", "periodMonth"])
    .index("by_transaction", ["transactionId"]),

  splLembur: defineTable({
    karyawanStaffId: v.id("staff"),
    supervisorStaffId: v.id("staff"),     // pemberi perintah
    date: v.string(),                     // YYYY-MM-DD
    hours: v.number(),
    rate: v.optional(v.number()),
    amount: v.number(),
    reason: v.optional(v.string()),
    transactionId: v.optional(v.id("transactions")),
    createdAt: v.number(),
  })
    .index("by_karyawan_date", ["karyawanStaffId", "date"])
    .index("by_supervisor_date", ["supervisorStaffId", "date"]),
};
