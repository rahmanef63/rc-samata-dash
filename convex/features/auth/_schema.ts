import { defineTable } from "convex/server";
import { v } from "convex/values";

export const ROLE_VALUES = ["super_admin", "owner", "staff"] as const;
export type Role = (typeof ROLE_VALUES)[number];

export const authExtensionTables = {
  userRoles: defineTable({
    userId: v.id("users"),
    role: v.union(
      v.literal("super_admin"),
      v.literal("owner"),
      v.literal("staff"),
    ),
  }).index("by_user", ["userId"]),

  /**
   * Per-user persistent preferences. Created lazily on first write.
   * Optional fields so new toggles can ship without migrations.
   */
  userPreferences: defineTable({
    userId: v.id("users"),
    theme: v.optional(
      v.union(v.literal("light"), v.literal("dark"), v.literal("system")),
    ),
    defaultBranchId: v.optional(v.id("branches")),
    notifAnomaly: v.optional(v.boolean()),
    notifEmail: v.optional(v.boolean()),
    updatedAt: v.optional(v.string()),
  }).index("by_user", ["userId"]),
};
