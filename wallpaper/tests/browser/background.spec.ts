import { expect, test } from '@playwright/test';
import { themes } from '../../src/background/Themes';
import { createHash } from 'node:crypto';

const track = (genre: string, title = 'Atmosphere test') => JSON.stringify({ Title: title, Artist: 'Fixture artist', Genres: genre ? [genre] : [] });
test.beforeEach(async ({ page }) => { await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { status: 'no_session' } })); });
test('all eleven genres render atmosphere while preserving the cover-color background', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.emulateMedia({ reducedMotion: 'reduce' }); await page.goto('./?live=1');
  const images = new Set<string>();
  const background = await page.locator('#app').evaluate(element => getComputedStyle(element).backgroundImage);
  for (const theme of themes) {
    await page.evaluate(payload => window.livelyCurrentTrack?.(payload), track(theme.name, theme.id));
    await expect(page.locator('#app')).toHaveAttribute('data-theme', theme.id);
    const image = await page.screenshot({ path: `test-results/theme-${theme.id}.png`, clip: { x: 0, y: 0, width: 180, height: 180 } });
    images.add(createHash('sha256').update(image).digest('hex'));
    expect(await page.locator('#app').evaluate(element => getComputedStyle(element).backgroundImage)).toBe(background);
  }
  expect(images.size).toBeGreaterThan(1); expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/genre-environment.png' });
});
test('manual theme and atmospheric preferences persist after reload', async ({ page }) => {
  await page.goto('./?live=1&settings=1');
  await page.evaluate(payload => window.livelyCurrentTrack?.(payload), track('jazz'));
  await expect(page.locator('#app')).toHaveAttribute('data-theme', 'jazz');
  await page.locator('[data-setting=manualTheme]').selectOption('lofi');
  await page.locator('[data-setting=particleStyle]').selectOption('sparkles');
  await page.locator('[data-setting=performancePreset]').selectOption('low');
  await page.locator('[data-setting=reducedMotion]').check();
  await expect(page.locator('#app')).toHaveAttribute('data-theme', 'lofi');
  await page.reload(); await expect(page.locator('[data-setting=particleStyle]')).toHaveValue('sparkles');
  await expect(page.locator('[data-setting=performancePreset]')).toHaveValue('low'); await expect(page.locator('[data-setting=reducedMotion]')).toBeChecked();
  await expect(page.locator('#app')).toHaveAttribute('data-theme', 'lofi');
});
test('automatic genre detection respects the default theme and its toggle', async ({ page }) => {
  await page.goto('./?live=1&settings=1');
  await page.locator('[data-setting=defaultTheme]').selectOption('ambient');
  await page.evaluate(payload => window.livelyCurrentTrack?.(payload), track('unclassified'));
  await expect(page.locator('#app')).toHaveAttribute('data-theme', 'ambient');
  await page.locator('[data-setting=autoGenre]').uncheck();
  await page.evaluate(payload => window.livelyCurrentTrack?.(payload), track('rock'));
  await expect(page.locator('#app')).toHaveAttribute('data-theme', 'ambient');
  await page.locator('[data-setting=autoGenre]').check(); await expect(page.locator('#app')).toHaveAttribute('data-theme', 'rock');
});
for (const style of ['sparkles', 'dust', 'rain', 'embers', 'bokeh', 'fireflies']) {
  test(`${style} particles work with live audio`, async ({ page }) => {
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto('./?live=1&settings=1');
    await page.locator('[data-setting=particleStyle]').selectOption(style);
    await page.evaluate(payload => { window.livelyCurrentTrack?.(payload); window.livelyAudioListener?.(Array(128).fill(.5)); }, track('electronic', style));
    await expect(page.locator('#app')).toHaveAttribute('data-theme', 'electronic');
    await page.getByRole('button', { name: 'Close settings' }).click();
    await page.screenshot({ path: `test-results/particles-${style}.png` });
    expect(errors).toEqual([]);
  });
}
test('rapid genre changes and malformed audio preserve the display controls', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('./?live=1');
  await page.evaluate(() => {
    for (let i = 0; i < 200; i++) window.livelyCurrentTrack?.(JSON.stringify({ Title: `Track ${i}`, Artist: 'Fixture', Genres: [i % 2 ? 'rock' : 'jazz'] }));
    window.livelyAudioListener?.([NaN, Infinity, -4]);
  });
  await expect(page.locator('#app')).toHaveAttribute('data-theme', 'rock');
  await page.getByRole('button', { name: 'Switch display channel' }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-mode', 'vinyl');
  await expect(page.locator('#scene > canvas')).toHaveCount(1); expect(errors).toEqual([]);
  await page.screenshot({ path: 'test-results/atmospheric-effects.png' });
});
test('companion enrichment works with lyrics disabled and ignores mismatched songs', async ({ page }) => {
  const token = 'e'.repeat(64); let title = 'Different song', nowPlayingCalls = 0;
  await page.addInitScript(() => localStorage.setItem('retrowave-settings-v1', JSON.stringify({ lyrics: false, defaultTheme: 'ambient' })));
  await page.route('http://127.0.0.1:43821/now-playing', route => {
    nowPlayingCalls++;
    return route.fulfill({ json: { title, artist: 'Fixture artist', genres: ['jazz'], capturedAtUnixMs: Date.now() } });
  });
  await page.goto(`./?live=1#bridge=${token}`);
  await page.evaluate(payload => window.livelyCurrentTrack?.(payload), track(''));
  await expect(page.locator('#app')).toHaveAttribute('data-theme', 'ambient');
  await expect.poll(() => nowPlayingCalls).toBeGreaterThan(0);
  title = 'Atmosphere test'; await expect(page.locator('#app')).toHaveAttribute('data-theme', 'jazz');
});
