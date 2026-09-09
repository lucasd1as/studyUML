import "dotenv/config";
import { defineConfig } from "@playwright/test";

const PORT = 3100;
const TEST_DB = process.env.DATABASE_URL_TEST ?? "postgres://studyuml:studyuml@localhost:5432/studyuml_test";

/** Runs the smoke test against a production build (`pnpm test:e2e` builds first) and the test database. */
export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        // Sandboxes with a preinstalled Chromium can point here instead of running `playwright install`.
        ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
          : {}),
      },
    },
  ],
  webServer: {
    command: `pnpm start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { DATABASE_URL: TEST_DB, DEV_USER_EMAIL: "e2e@studyuml.local" },
  },
});
