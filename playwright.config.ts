import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  forbidOnly: !!process.env.CI,
  reporter: [["list"], ["html", { open: "never" }]],
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  use: { baseURL: "http://127.0.0.1:3100" },
  webServer: {
    command:
      "pnpm start --host 127.0.0.1 --port 3100 --strictPort --open false",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    env: { VITE_ENABLE_AUTH: "false" },
  },
});
