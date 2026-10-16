import { defineConfig } from '@playwright/test';
import identity from './branding.json' with { type: 'json' };
const base = process.env.VITE_BASE_PATH || `/${identity.slug}/`;
export default defineConfig({
  testDir: './wallpaper/tests/browser', fullyParallel: true,
  // Software-rendered WebGL on hosted runners needs exclusive browser resources.
  workers: process.env.CI ? 1 : undefined,
  timeout: process.env.CI ? 60_000 : 30_000,
  globalTimeout: (process.env.CI ? 10 : 5) * 60_000,
  expect: { timeout: process.env.CI ? 10_000 : 5_000 },
  use: {
    baseURL: `http://127.0.0.1:4173${base}`,
    headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    // Keep a desktop layout without spending hosted-runner CPU on a 1280x720 software framebuffer.
    // Narrow and high-DPI tests still create their own explicit viewports/contexts.
    viewport: process.env.CI ? { width: 960, height: 540 } : { width: 1280, height: 720 },
    launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] },
    // Continuous trace screenshots force expensive software-WebGL readbacks.
    // Keep DOM/network traces and explicit visual/failure screenshots instead.
    trace: { mode: 'retain-on-failure', screenshots: false, snapshots: true, sources: true }, screenshot: 'only-on-failure',
  },
  webServer: { command: 'pnpm preview', url: `http://127.0.0.1:4173${base}`, reuseExistingServer: !process.env.CI },
});
