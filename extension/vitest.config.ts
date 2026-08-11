import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        // Browser glue: observers, chrome.* wiring, form handling. The logic
        // they orchestrate lives in tested pure modules.
        "src/content/index.ts",
        "src/background/index.ts",
        "src/options/options.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
