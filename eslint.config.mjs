import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "node_modules/**", "drizzle/**", "playwright-report/**", "test-results/**"]),
  {
    // src/domain is pure: no framework, no database, no React. That is what keeps it trivially unit-testable.
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/db", "@/db/*", "@/server", "@/server/*", "@/app/*", "@/components/*"], message: "src/domain must stay pure." },
            { group: ["next", "next/*", "react", "react-dom", "drizzle-orm", "drizzle-orm/*", "postgres"], message: "src/domain must stay pure." },
          ],
        },
      ],
    },
  },
]);
