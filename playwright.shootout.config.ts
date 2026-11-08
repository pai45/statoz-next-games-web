import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e", testMatch: "penalty-shootout.spec.ts", timeout: 90000, expect: { timeout: 20000 }, workers: 1,
  outputDir: "test-results/shootout", reporter: [["list"], ["json", { outputFile: "test-results/shootout-results.json" }]],
  use: { baseURL: (process.env.SHOOTOUT_URL ?? "http://127.0.0.1:3138").replace(/\/?$/, "/"), headless: true, viewport: { width: 1440, height: 960 }, launchOptions: process.env.SHOOTOUT_CHROMIUM ? { executablePath: process.env.SHOOTOUT_CHROMIUM } : {}, screenshot: "only-on-failure", trace: "retain-on-failure" },
});
