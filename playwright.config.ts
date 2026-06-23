import { defineConfig } from "@playwright/test";

// E2E against the dev server. Phone-frame app, so a mobile viewport is primary.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    // Dedicated port + strictPort so e2e never latches onto another project's
    // dev server (the default 5173+ range can be occupied by siblings).
    baseURL: "http://localhost:5188",
    viewport: { width: 430, height: 880 },
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "npm run dev -- --port 5188 --strictPort",
    url: "http://localhost:5188",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
