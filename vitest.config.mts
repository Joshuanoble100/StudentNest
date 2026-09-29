import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["node_modules", ".next", "e2e"],
    setupFiles: ["src/test/setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(process.cwd(), "src") },
  },
});
