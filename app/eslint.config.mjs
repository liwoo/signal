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
  ]),
  // SIGNAL project conventions
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: {
      // Named exports only in components/lib/hooks/data
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportDefaultDeclaration",
          message:
            "Use named exports (export function X) instead of export default. Exception: Next.js page/layout files.",
        },
      ],
      // No direct storage access outside the storage layer
      "no-restricted-globals": [
        "error",
        {
          name: "localStorage",
          message:
            "Use helpers from src/lib/storage/local.ts instead of direct localStorage access.",
        },
        {
          name: "sessionStorage",
          message:
            "Use helpers from src/lib/storage/local.ts instead of direct sessionStorage access.",
        },
      ],
    },
  },
  // Allow default exports in Next.js route files (pages, layouts, etc.)
  {
    files: [
      "src/app/**/page.tsx",
      "src/app/**/layout.tsx",
      "src/app/**/loading.tsx",
      "src/app/**/error.tsx",
      "src/app/**/not-found.tsx",
      "src/app/**/template.tsx",
    ],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
  // Storage layer is allowed to use localStorage/sessionStorage
  {
    files: ["src/lib/storage/**"],
    rules: {
      "no-restricted-globals": "off",
    },
  },
  // Game logic must stay pure — no React or Next.js imports
  {
    files: ["src/lib/game/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react",
              message:
                "Files in lib/game/ must be pure functions. No React imports.",
            },
            {
              name: "next",
              message:
                "Files in lib/game/ must be pure functions. No Next.js imports.",
            },
            {
              name: "next/navigation",
              message:
                "Files in lib/game/ must be pure functions. No Next.js imports.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
