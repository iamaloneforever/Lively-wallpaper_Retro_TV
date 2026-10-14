import { expect, test } from '@playwright/test';
import { active, fixture, signal, start, trackId } from './lyric-fixtures';

test('timing adjustment applies to highlights, survives reload, and keeps native seeks', async ({ page }) => {
  const clock = { position: 4.5, isPlaying: false }; await start(page, fixture, clock);
  await expect(page.locator(active)).toHaveText('Silverechoes');
  await page.keyboard.press('s');
  await page.locator('[data-setting=lyricOffset]').evaluate(element => {
    const input = element as HTMLInputElement; input.value = '1'; input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await expect(page.locator(active)).toHaveText('Floatinghome');
  await page.reload(); await signal(page);
  await expect(page.locator(active)).toHaveText('Floatinghome');
  clock.position = 1; await expect(page.locator(active)).toHaveText('Silverechoes');
  await page.keyboard.press('s'); await expect(page.locator('[data-setting=lyricOffset]')).toHaveValue('1');
});

test('every enabled lyric source is checked and timed lyrics win over plain text', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('retrowave-spicy-key', 'sl_pk_test'); localStorage.setItem('retrowave-settings-v1', JSON.stringify({ publicLyrics: true })); });
  const requests: string[] = [];
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { title: 'Fixture', artist: 'Artist', trackId, duration: 120, position: 1, isPlaying: false } }));
  await page.route('https://api.spicylyrics.org/**', route => { requests.push('Spicy'); return route.fulfill({ json: { Body: { Type: 'Static', Lines: [{ Text: 'Static Spicy text' }] } } }); });
  await page.route('https://lrclib.net/**', route => { requests.push('LRCLIB'); return route.fulfill({ json: { trackName: 'Fixture', artistName: 'Artist', duration: 120, syncedLyrics: '[00:00]Synced lyrics\n[00:05]Next phrase' } }); });
  await page.goto('./?live=1'); await signal(page);
  await expect(page.locator(active)).toHaveText('Synced lyrics');
  expect(requests).toContain('Spicy'); expect(requests).toContain('LRCLIB');
});
