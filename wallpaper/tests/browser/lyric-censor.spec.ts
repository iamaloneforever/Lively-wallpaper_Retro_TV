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
