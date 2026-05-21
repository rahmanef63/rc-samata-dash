/**
 * Auth feature types — role + theme preference enums.
 */
import { v } from "convex/values";

export const ROLES = ["super_admin", "owner", "staff"] as const;
export type Role = typeof ROLES[number];
export const roleValidator = v.union(
  v.literal("super_admin"),
  v.literal("owner"),
  v.literal("staff"),
);

export const THEMES = ["light", "dark", "system"] as const;
export type Theme = typeof THEMES[number];
export const themeValidator = v.union(
  v.literal("light"),
  v.literal("dark"),
  v.literal("system"),
);
