import path from "node:path";
import react from "@vitejs/plugin-react";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  const testDatabaseEnv = loadEnv(mode, process.cwd(), "TEST_DATABASE_URL");

  return {
    plugins: [react()],
    resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
    test: {
      environment: "jsdom",
      setupFiles: ["./tests/setup.ts"],
      clearMocks: true,
      globals: true,
      env: testDatabaseEnv,
      exclude: ["**/node_modules/**", "**/e2e/**", "**/.next/**", "**/dist/**"],
    },
  };
});
