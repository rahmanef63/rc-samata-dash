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
};
