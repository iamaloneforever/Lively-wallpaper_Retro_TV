import { expect, test } from '@playwright/test';
import { active, signal, start } from './lyric-fixtures';

test('explicit lyric words can be censored, restored and saved without reloading lyrics or changing their timing', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 640, height: 360 });
  await page.addInitScript(() => { if (!localStorage.getItem('retrowave-settings-v1')) localStorage.setItem('retrowave-settings-v1', JSON.stringify({ performancePreset: 'low', reducedMotion: true })); });
  const body = { Type: 'Syllable', Content: [{ Type: 'Vocal', Lead: { StartTime: 0, EndTime: 20, Syllables: [
    { Text: 'fuck', IsPartOfWord: true, StartTime: 0, EndTime: 5 },
    { Text: 'ing', StartTime: 5, EndTime: 10 }, { Text: 'world', StartTime: 10, EndTime: 20 },
  ] } }] };
  let lookups = 0; page.on('request', request => { if (request.url().startsWith('https://api.spicylyrics.org/')) lookups++; });
  await start(page, body, { position: 1, isPlaying: false });
  await expect(page.locator(active)).toHaveText('fuckingworld');
  await page.keyboard.press('s');
  const toggle = page.locator('[data-setting=censorLyrics]');
  await toggle.check(); await expect(page.locator(active)).toHaveText('*******world');
  await toggle.uncheck(); await expect(page.locator(active)).toHaveText('fuckingworld');
  await toggle.check(); await expect(page.locator(active)).toHaveText('*******world');
  expect(lookups).toBe(1);
  await page.reload(); await signal(page);
  await expect(page.locator(active)).toHaveText('*******world');
  await page.keyboard.press('s'); await expect(toggle).toBeChecked();
});

test('an older paired companion cannot switch censorship off when acknowledging settings', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 640, height: 360 });
  await page.addInitScript(() => {
    localStorage.setItem('retrowave-spicy-key', 'sl_pk_test');
    if (!localStorage.getItem('retrowave-settings-v1')) localStorage.setItem('retrowave-settings-v1', JSON.stringify({ performancePreset: 'low', reducedMotion: true }));
  });
  let writes = 0;
  await page.route('http://127.0.0.1:43821/**', route => {
    if (route.request().url().endsWith('/wallpaper-settings')) {
      const settings = route.request().method() === 'POST' ? route.request().postDataJSON().settings : { version: 1, config: { performancePreset: 'low', reducedMotion: true }, lyricsKey: 'sl_pk_test' };
      if (route.request().method() === 'POST') writes++;
      delete settings.config.censorLyrics; // Older companions discard unknown keys.
      return route.fulfill({ json: { initialized: true, revision: 'a'.repeat(64), settings } });
    }
    return route.fulfill({ json: { title: 'Fixture', artist: 'Artist', trackId: 'a'.repeat(22), duration: 120, position: 1, isPlaying: false } });
  });
  await page.route('https://api.spicylyrics.org/**', route => route.fulfill({ json: { Body: { source: 'spicy_lyrics', Type: 'Line', Content: [{ Type: 'Vocal', Text: 'shit happens', StartTime: 0, EndTime: 20 }] } } }));
  await page.goto(`./?live=1#bridge=${'b'.repeat(64)}`); await signal(page);
  await expect(page.locator(active)).toHaveText('shit happens');
  await page.keyboard.press('s');
  const toggle = page.locator('[data-setting=censorLyrics]');
  await toggle.click();
  await expect(page.locator(active)).toHaveText('**** happens');
  await expect.poll(() => writes).toBeGreaterThan(0);
  await expect(page.locator('#settings-sync-status')).toContainText('Update the companion');
  await expect(toggle).toBeChecked();
  await page.reload(); await signal(page);
  await expect(page.locator(active)).toHaveText('**** happens');
  await page.keyboard.press('s'); await expect(toggle).toBeChecked();
  await toggle.click(); await expect(page.locator(active)).toHaveText('shit happens');
});
