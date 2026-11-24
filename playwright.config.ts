import { defineConfig, devices } from "@playwright/test";

/**
 * One end-to-end smoke test against the real static export (`out/`), served
 * with the same routing rules as CloudFront (scripts/preview.mjs).
 * Run `npm run build` first.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node scripts/preview.mjs --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 20_000,
  },
});
