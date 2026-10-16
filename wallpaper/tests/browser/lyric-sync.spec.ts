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
  await page.addInitScript(() => { localStorage.setItem('spicy-bond-spicy-key', 'sl_pk_test'); localStorage.setItem('spicy-bond-settings-v1', JSON.stringify({ publicLyrics: true })); });
  const requests: string[] = [];
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { title: 'Fixture', artist: 'Artist', trackId, duration: 120, position: 1, isPlaying: false } }));
  await page.route('https://api.spicylyrics.org/**', route => { requests.push('Spicy'); return route.fulfill({ json: { Body: { Type: 'Static', Lines: [{ Text: 'Static Spicy text' }] } } }); });
  await page.route('https://lrclib.net/**', route => { requests.push('LRCLIB'); return route.fulfill({ json: { trackName: 'Fixture', artistName: 'Artist', duration: 120, syncedLyrics: '[00:00]Synced lyrics\n[00:05]Next phrase' } }); });
  await page.goto('./?live=1'); await signal(page);
  await expect(page.locator(active)).toHaveText('Synced lyrics');
  expect(requests).toContain('Spicy'); expect(requests).toContain('LRCLIB');
});

test('a late catalogue ID does not clear working synced lyrics or interrupt native seeks', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('spicy-bond-spicy-key', 'sl_pk_test'); localStorage.setItem('spicy-bond-settings-v1', JSON.stringify({ publicLyrics: true })); });
  let id = '', position = 1, searching = false, release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { title: 'Fixture', artist: 'Artist', trackId: id, duration: 120, position, isPlaying: false } }));
  await page.route('https://lrclib.net/**', route => id ? route.fulfill({ status: 404, json: [] }) : route.fulfill({ json: { trackName: 'Fixture', artistName: 'Artist', duration: 120, syncedLyrics: '[00:00]First phrase\n[00:05]Second phrase' } }));
  await page.route('https://api.spicylyrics.org/**', async route => { searching = true; await held; await route.fulfill({ json: { Body: { Type: 'Static', Lines: [{ Text: 'Untimed replacement' }] } } }).catch(() => {}); });
  await page.goto('./?live=1'); await signal(page);
  await expect(page.locator(active)).toHaveText('First phrase');
  id = trackId; await expect.poll(() => searching).toBe(true);
  await expect(page.locator(active)).toHaveText('First phrase');
  position = 7; await expect(page.locator(active)).toHaveText('Second phrase');
  release(); await page.waitForTimeout(750); await expect(page.locator(active)).toHaveText('Second phrase');
});
