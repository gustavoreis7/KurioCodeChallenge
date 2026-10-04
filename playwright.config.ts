import { defineConfig } from "@playwright/test";

const baseURL = process.env.TEST_BASE_URL ?? "http://127.0.0.1:5173";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  snapshotPathTemplate:
    "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}",
  timeout: 180_000,
  expect: {
    timeout: 30_000,
    toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.01 },
  },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "reports/e2e" }],
  ],
  use: {
    baseURL,
    channel: process.env.CI ? undefined : "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: "desktop",
      use: { browserName: "chromium", viewport: { width: 1440, height: 1000 } },
    },
    {
      name: "mobile",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
