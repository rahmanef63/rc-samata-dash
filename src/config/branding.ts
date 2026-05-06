export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "RC Samata Gowa",
  shortName: process.env.NEXT_PUBLIC_BRAND_SHORT_NAME ?? "RC Samata",
  code: process.env.NEXT_PUBLIC_BRAND_CODE ?? "RC-SAMATA",
  industry: process.env.NEXT_PUBLIC_BRAND_INDUSTRY ?? "QSR",
  franchise: process.env.NEXT_PUBLIC_BRAND_FRANCHISE ?? "Rocket Chicken",
  region: process.env.NEXT_PUBLIC_BRAND_REGION ?? "Sulawesi Selatan",
  location: process.env.NEXT_PUBLIC_BRAND_LOCATION ?? "Gowa, Sulawesi Selatan",
  aiPersona: process.env.NEXT_PUBLIC_BRAND_AI_PERSONA ?? "Business Analyst",
} as const;

export type Brand = typeof BRAND;
