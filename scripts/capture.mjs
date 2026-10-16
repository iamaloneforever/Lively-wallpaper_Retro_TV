import { chromium } from '@playwright/test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { finishDemoVideo } from './finish-demo.mjs';
import { renderBrandCover } from './brand-artwork.mjs';
import { defaultBase } from './brand.mjs';

const base = process.env.CAPTURE_URL || `http://127.0.0.1:4173${process.env.VITE_BASE_PATH || defaultBase}`;
const video = process.argv.includes('--video') || process.argv.includes('--video-only');
const videoOnly = process.argv.includes('--video-only');
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined,
  channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
  args: process.env.CAPTURE_SOFTWARE === '1' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : [],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
async function snap(target, options) {
  await target.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  const session = await target.context().newCDPSession(target);
  const { data } = await session.send('Page.captureScreenshot', { format: options.path.endsWith('.jpg') ? 'jpeg' : 'png', ...(options.path.endsWith('.jpg') ? { quality: 92 } : {}), captureBeyondViewport: false });
  await writeFile(options.path, Buffer.from(data, 'base64')); await session.detach();
}
const errors = []; page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
try {
await mkdir('docs/images', { recursive: true }); await mkdir('docs/media', { recursive: true });
if (!videoOnly) {
await page.addInitScript(() => localStorage.setItem('spicy-bond-settings-v1', JSON.stringify({ fps: 30, clock: false })));
await page.clock.install();
await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForFunction(() => document.querySelector('#app')?.dataset.lyrics === 'true', null, { timeout: 120000 });
console.log('Song preview and lyric renderer ready.');
await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
await page.clock.fastForward(3500);
await snap(page, { animations: 'disabled', path: 'docs/images/desktop-preview.png' });
await page.locator('#channel-button').evaluate(element => element.click()); await page.clock.fastForward(1300);
await snap(page, { animations: 'disabled', path: 'docs/images/vinyl-lyrics.png' });
await page.locator('#next-track').evaluate(element => element.click()); await page.clock.fastForward(6500);
await snap(page, { animations: 'disabled', path: 'docs/images/amazing-grace.png' });
await page.keyboard.press('s');
await page.locator('[data-setting="manualTheme"]').selectOption('jazz', { force: true });
await page.locator('[data-setting="particleStyle"]').selectOption('bokeh', { force: true });
await page.locator('#close-settings').evaluate(element => element.click()); await page.clock.fastForward(4500);
await snap(page, { animations: 'disabled', path: 'docs/images/effects-preview.png' });
console.log('Captured lyrics, vinyl, song, effects screenshots from the running app.');

await renderBrandCover(browser);

}
if (video) {
  const frames = await mkdtemp(join(tmpdir(), 'spicy-bond-frames-'));
  try {
    await page.close();
    const movie = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
    await movie.addInitScript(() => localStorage.setItem('spicy-bond-settings-v1', JSON.stringify({ fps: 30, clock: false })));
    await movie.clock.install();
    await movie.goto(base, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await movie.waitForFunction(() => document.querySelector('#app')?.dataset.lyrics === 'true', null, { timeout: 120000 });
    await movie.clock.pauseAt(await movie.evaluate(() => Date.now() + 1000));
    const fps = 30, seconds = 12, count = fps * seconds;
    for (let frame = 0; frame < count; frame++) {
      if (frame === 120) await movie.locator('#channel-button').evaluate(element => element.click());
      if (frame === 240) await movie.locator('#next-track').evaluate(element => element.click());
      // Advance animation time evenly; capture overhead does not change playback speed.
      await movie.clock.fastForward(Math.floor((frame + 1) * 1000 / fps) - Math.floor(frame * 1000 / fps));
      await snap(movie, { animations: 'disabled', path: join(frames, `${String(frame).padStart(5, '0')}.jpg`) });
      if (frame % 90 === 0) console.log(`Video frames ${frame}/${count}`);
    }
    await mkdir('.build/media-source', { recursive: true });
    const raw = '.build/media-source/spicy-bond-raw.mp4';
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', String(fps), '-i', join(frames, '%05d.jpg'), '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', raw]);
    await finishDemoVideo(raw);

  } finally { await rm(frames, { recursive: true, force: true }); }
}
} finally { await browser.close(); }
if (errors.length) throw new Error(errors.join('\n'));
