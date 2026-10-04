import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "src/routeTree.gen.ts",
      "public/mockServiceWorker.js",
      "playwright-report/**",
      "test-results/**",
      "reports/**",
      ".tanstack/**",
    ],
  },
  {
    files: ["src/**/*.{ts,tsx}", "tests/**/*.ts", "*.config.ts"],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);
