import type { AuditBranch } from "../types";

export const branches: AuditBranch[] = [
  { id: "RC-2940", name: "Rocket Chicken - Diponegoro", address: "Jl. Pangeran Diponegoro No. 12, Yogyakarta" },
  { id: "RC-2941", name: "Rocket Chicken - Sudirman", address: "Jl. Jenderal Sudirman No. 45, Yogyakarta" },
];

export const regionFilters = ["All Branches", "Yogyakarta", "Solo"] as const;
