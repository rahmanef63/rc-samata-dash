export const BRAND = {
  name: process.env.BRAND_NAME ?? "RC Samata Gowa",
  shortName: process.env.BRAND_SHORT_NAME ?? "RC Samata",
  code: process.env.BRAND_CODE ?? "RC-SAMATA",
  industry: process.env.BRAND_INDUSTRY ?? "QSR",
  franchise: process.env.BRAND_FRANCHISE ?? "Rocket Chicken",
  region: process.env.BRAND_REGION ?? "Sulawesi Selatan",
  location: process.env.BRAND_LOCATION ?? "Gowa, Sulawesi Selatan",
  aiPersona: process.env.BRAND_AI_PERSONA ?? "Business Analyst",
} as const;

export type Brand = typeof BRAND;
