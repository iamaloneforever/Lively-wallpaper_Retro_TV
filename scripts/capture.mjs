import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
await page.goto('http://127.0.0.1:4173/Lively-wallpaper_Retro_TV/');
await page.waitForFunction(() => document.querySelector('#app')?.dataset.source === 'demo');
await page.waitForFunction(() => document.querySelector('.scene canvas')?.width > 0);
// Let the first CRT tuning transition render before capturing the desktop.
await page.evaluate(() => new Promise(resolve => {
  let frames = 0;
  const rendered = () => ++frames >= 90 ? resolve() : requestAnimationFrame(rendered);
  requestAnimationFrame(rendered);
}));
await mkdir('docs/images', { recursive: true });
await page.screenshot({ path: 'docs/images/desktop-preview.png' });
await browser.close();
