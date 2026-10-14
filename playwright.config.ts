import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  // 2 workers: los specs abren su propio PrismaClient y el pooler
  // (session mode, 15 conexiones) tumba el engine con 6 en paralelo.
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3101",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npx next start -p 3101",
    port: 3101,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
