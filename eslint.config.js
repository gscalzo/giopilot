import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // extension/ is a self-contained workspace with its own toolchain (see extension/docs/adr/0003).
    ignores: ["dist/**", "coverage/**", "node_modules/**", ".giopilot/**", "extension/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      complexity: ["error", 5],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Tests favour expressiveness over strictness.
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
