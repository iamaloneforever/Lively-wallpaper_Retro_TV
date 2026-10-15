import { expect, test, type Page } from '@playwright/test';
import { accentEffects, songAccents } from '../../src/background/SongAccents';

const weights = (page: Page) => page.evaluate(() => (window as unknown as { songWeights?: number[] }).songWeights || []);
test.beforeEach(async ({ page }) => {
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { status: 'no_session' } }));
  await page.addInitScript(count => {
    const prototype = WebGL2RenderingContext.prototype, original = prototype.uniform1fv;
    prototype.uniform1fv = function(location, data, ...rest) {
      const values = Array.from(data);
      if (values.length === count) (window as unknown as { songWeights: number[] }).songWeights = values;
      original.call(this, location, data, ...rest);
    };
  }, accentEffects.length);
});

// Every recording still reaches the real GPU; bound the amount of rendering in one case.
for (let offset = 0; offset < songAccents.length; offset += 7) {
  const rules = songAccents.slice(offset, offset + 7);
  test(`song easter eggs ${offset + 1}-${offset + rules.length} reach the GPU and preserve cover colors`, async ({ page }) => {
    test.setTimeout(120_000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./?live=1');
    const background = await page.locator('#app').evaluate(element => getComputedStyle(element).backgroundImage);
    for (const rule of rules) {
      await page.evaluate(row => window.livelyCurrentTrack?.(JSON.stringify({ Title: row.title, Artist: row.artist })), { title: rule.titles[0], artist: rule.artist });
      await expect.poll(async () => (await weights(page))[accentEffects.indexOf(rule.effect)], { message: rule.id }).toBe(1);
      expect(await page.locator('#app').evaluate(element => getComputedStyle(element).backgroundImage)).toBe(background);
    }
    expect(errors).toEqual([]);
  });
}

test('song accents respect their toggle, persist after reload and reject cover artists', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./?live=1&settings=1');
  await page.evaluate(() => window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Firework', Artist: 'Katy Perry' })));
  await expect.poll(async () => (await weights(page))[accentEffects.indexOf('blooms')]).toBe(1);
  await page.locator('[data-setting=songAccents]').uncheck();
  await expect.poll(async () => (await weights(page))[0]).toBe(1);
  await page.reload(); await expect(page.locator('[data-setting=songAccents]')).not.toBeChecked();
  await page.locator('[data-setting=songAccents]').check();
  await page.evaluate(() => window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Firework', Artist: 'A cover band' })));
  await expect.poll(async () => (await weights(page))[0]).toBe(1);
  await page.evaluate(() => window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Firework', Artist: 'Katy Perry' })));
  await expect.poll(async () => (await weights(page))[accentEffects.indexOf('blooms')]).toBe(1);
  await page.evaluate(() => window.livelyCurrentTrack?.('null'));
  await expect.poll(async () => (await weights(page))[0]).toBe(1);
  expect(errors).toEqual([]);
});

test('new song accents crossfade through rapid changes and Lively pause resumes safely', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => {
    localStorage.setItem('retrowave-settings-v1', JSON.stringify({ transitionDuration: .3 }));
  });
  await page.goto('./?live=1');
  await page.evaluate(rows => {
    for (let i = 0; i < 120; i++) {
      const row = rows[i % rows.length];
      window.livelyCurrentTrack?.(JSON.stringify({ Title: row.title, Artist: row.artist }));
    }
    window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Never Gonna Give You Up', Artist: 'Rick Astley' }));
  }, songAccents.map(rule => ({ title: rule.titles[0], artist: rule.artist })));
  await expect.poll(async () => (await weights(page))[accentEffects.indexOf('bouncing-tv')]).toBe(1);
  await page.evaluate(() => window.livelyWallpaperPlaybackChanged?.(JSON.stringify({ IsPaused: true })));
  const paused = await weights(page); await page.waitForTimeout(150); expect(await weights(page)).toEqual(paused);
  await page.evaluate(() => {
    window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Around the World', Artist: 'Daft Punk' }));
    window.livelyWallpaperPlaybackChanged?.(JSON.stringify({ IsPaused: false }));
  });
  await expect.poll(async () => (await weights(page))[accentEffects.indexOf('globe')]).toBe(1);
  await page.screenshot({ path: 'test-results/song-easter-eggs.png' }); expect(errors).toEqual([]);
});
