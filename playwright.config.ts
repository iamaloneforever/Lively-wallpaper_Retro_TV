import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', fullyParallel: true,
  // Software-rendered WebGL on hosted runners needs exclusive browser resources.
  workers: process.env.CI ? 1 : undefined,
  timeout: process.env.CI ? 60_000 : 30_000,
  globalTimeout: 5 * 60_000,
  expect: { timeout: process.env.CI ? 10_000 : 5_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173/Lively-wallpaper_Retro_TV/',
    headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    trace: 'retain-on-failure', screenshot: 'only-on-failure',
  },
  webServer: { command: 'pnpm preview', url: 'http://127.0.0.1:4173/Lively-wallpaper_Retro_TV/', reuseExistingServer: !process.env.CI },
});
