import { expect, test } from '@playwright/test';
import { themes } from '../../src/background/Themes';

test.beforeEach(async ({ page }) => { await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { status: 'no_session' } })); });
test('repeated genre changes reuse GPU buffers, programs and textures', async ({ page }) => {
  test.setTimeout(180_000);
  await page.addInitScript(() => {
    const counts: Record<string, number> = { createBuffer: 0, createProgram: 0, createTexture: 0 };
    (window as unknown as { resourceCounts: typeof counts }).resourceCounts = counts;
    const prototype = WebGL2RenderingContext.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;
    for (const name of Object.keys(counts)) {
      const original = prototype[name];
      prototype[name] = function(this: WebGL2RenderingContext, ...args: unknown[]) { counts[name]++; return original.apply(this, args); };
    }
  });
  await page.goto('./?live=1'); await expect(page.locator('#scene > canvas')).toBeVisible();
  await page.evaluate(async () => { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); });
  const baseline = await page.evaluate(() => (window as unknown as { resourceCounts: Record<string, number> }).resourceCounts);
  expect(baseline.createBuffer).toBeGreaterThan(0); expect(baseline.createProgram).toBeGreaterThan(0);
  await page.evaluate(async genres => {
    for (let i = 0; i < 120; i++) {
      window.livelyCurrentTrack?.(JSON.stringify({ Title: `Recording ${i}`, Artist: 'Fixture', Genres: [genres[i % genres.length]] }));
      if (i % 10 === 0) { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); }
    }
    await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
  }, themes.map(theme => theme.name));
  expect(await page.evaluate(() => (window as unknown as { resourceCounts: Record<string, number> }).resourceCounts)).toEqual(baseline);
  await expect(page.locator('#scene > canvas')).toHaveCount(1);
});
test('Lively pause suspends all rendering and resume restores it', async ({ page }) => {
  await page.goto('./?live=1'); await expect(page.locator('#scene > canvas')).toBeVisible();
  const result = await page.locator('#scene > canvas').evaluate(async element => {
    const gl = (element as HTMLCanvasElement).getContext('webgl2')!, original = gl.clear;
    let clears = 0; gl.clear = function(mask) { clears++; original.call(this, mask); };
    try {
      window.livelyWallpaperPlaybackChanged?.(JSON.stringify({ IsPaused: true }));
      await new Promise(resolve => setTimeout(resolve, 200)); const paused = clears;
      window.livelyWallpaperPlaybackChanged?.(JSON.stringify({ IsPaused: false }));
      await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame);
      return { paused, resumed: clears };
    } finally { gl.clear = original; }
  });
  expect(result.paused).toBe(0); expect(result.resumed).toBeGreaterThan(0);
});
test('empty atmosphere pixels preserve the original colored gradient exactly', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('retrowave-settings-v1', JSON.stringify({ manualTheme: 'rock', particles: false, analogIntensity: 0, reducedMotion: true })));
  await page.goto('./?live=1'); await expect(page.locator('#app')).toHaveAttribute('data-theme', 'rock');
  await page.evaluate(async () => { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); });
  const clip = { x: 0, y: 0, width: 8, height: 8 };
  const atmosphere = await page.screenshot({ clip });
  await page.locator('#scene > canvas').evaluate(element => { element.style.visibility = 'hidden'; });
  const originalGradient = await page.screenshot({ clip });
  expect(atmosphere.equals(originalGradient)).toBe(true);
});
