const path = require("node:path");
const { defineConfig, devices } = require("@playwright/test");

const rootDir = path.resolve(__dirname, "..");
const apiPort = process.env.PORT ?? "4000";

module.exports = defineConfig({
  testDir: ".",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  outputDir: "../playwright-report",
  timeout: 60_000,
  globalSetup: "./global-setup.js",
  use: {
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "bash scripts/e2e-up.sh",
    url: `http://localhost:${apiPort}/health`,
    cwd: rootDir,
    timeout: 180_000,
    reuseExistingServer: !process.env.CI,
  },
});
