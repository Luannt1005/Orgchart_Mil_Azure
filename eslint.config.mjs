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
    // Custom ignores:
    "src/lib/orgchart.js",
  ]),
  // Custom rules
  {
    rules: {
      // Downgrade no-explicit-any to warning (too many legacy usages)
      "@typescript-eslint/no-explicit-any": "warn",
      // Disable unused vars for underscore-prefixed variables
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_"
      }],
      // React Compiler rules - disable false positives
      "react-hooks/preserve-manual-memoization": "off",
      // setState in effect - common pattern for localStorage
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;

