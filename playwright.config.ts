import nextEnv from "@next/env";
import { defineConfig, devices } from "@playwright/test";

nextEnv.loadEnvConfig(process.cwd());

const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error("TEST_DATABASE_URL is required for Playwright");
}

const e2eOrigin = "http://localhost:3100";

const webServerEnv = Object.fromEntries(
  Object.entries({
    ...process.env,
    DATABASE_URL: testDatabaseUrl,
    ALLOW_SEED: "true",
    BETTER_AUTH_URL: e2eOrigin,
    NEXT_DIST_DIR: ".next-e2e",
    PORT: "3100",
    NODE_ENV: "production",
  }).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: e2eOrigin,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npx tsx src/db/seed.ts && npx next build && npx next start --port 3100",
    url: e2eOrigin,
    reuseExistingServer: false,
    timeout: 180_000,
    env: webServerEnv,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

