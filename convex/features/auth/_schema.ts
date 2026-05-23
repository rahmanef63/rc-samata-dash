import { defineTable } from "convex/server";
import { v } from "convex/values";
import { roleValidator, themeValidator, ROLES } from "./_types";

// Back-compat re-export. New code should import from `./_types`.
export const ROLE_VALUES = ROLES;
export type { Role } from "./_types";

export const authExtensionTables = {
  userRoles: defineTable({
    userId: v.id("users"),
    role: roleValidator,
  }).index("by_user", ["userId"]),

  /**
   * Per-user persistent preferences. Created lazily on first write.
   * Optional fields so new toggles can ship without migrations.
   */
  userPreferences: defineTable({
    userId: v.id("users"),
    theme: v.optional(themeValidator),
    notifAnomaly: v.optional(v.boolean()),
    notifEmail: v.optional(v.boolean()),
    updatedAt: v.optional(v.string()),
  }).index("by_user", ["userId"]),
};
