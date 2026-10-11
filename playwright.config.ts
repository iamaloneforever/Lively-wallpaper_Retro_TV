import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4173/Lively-wallpaper_Retro_TV/', headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
  webServer: { command: 'pnpm preview', url: 'http://127.0.0.1:4173/Lively-wallpaper_Retro_TV/', reuseExistingServer: !process.env.CI },
});
