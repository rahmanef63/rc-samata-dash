import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "convex/_generated/**",
    "coverage/**",
  ]),
  {
    rules: {
      // Downgrade React-19 / react-compiler rules to warn — they catch
      // real footguns but legacy shadcn / pre-cutover code still triggers
      // them. Promote back to error after the targeted refactor pass.
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      // shadcn boilerplate emits empty interfaces; pattern is intentional.
      "@typescript-eslint/no-empty-object-type": "warn",
      // CRUD helpers + xlsx parsers cross the type boundary frequently —
      // tightening project-wide would force a refactor sweep. Warn only.
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      // Shadcn primitives forward props with empty marker types and use
      // a few render-time patterns; upstream code is not ours to refactor.
      "@typescript-eslint/no-empty-object-type": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
    },
  },
  {
    files: ["tests/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
]);

export default eslintConfig;
