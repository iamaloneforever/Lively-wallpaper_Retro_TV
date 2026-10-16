import { expect, test } from '@playwright/test';
import { active, fixture, signal, start, trackId } from './lyric-fixtures';

test('upstream renderer follows paused playback and seeks without another lyric request', async ({ page }) => {
  const clock = { position: 1, isPlaying: false }; await start(page, fixture, clock);
  await expect(page.locator(active)).toHaveText('Silverechoes');
  await expect(page.getByRole('link', { name: 'Uploader: Test uploader' })).toHaveAttribute('href', 'https://spicylyrics.org/uid/123');
  const polls = await page.locator(active).getAttribute('data-line');
  await expect.poll(() => page.locator(active).getAttribute('data-line')).toBe(polls);
  clock.position = 7; await expect(page.locator(active)).toHaveText('Floatinghome');
  clock.position = 1; await expect(page.locator(active)).toHaveText('Silverechoes');
});
test('authenticated snapshot age anchors playback and stale clocks hide lyrics', async ({ page }) => {
  const token = 'b'.repeat(64); await page.addInitScript(() => localStorage.setItem('spicy-bond-spicy-key', 'sl_pk_test'));
  let stale = false;
  await page.route('http://127.0.0.1:43821/**', route => { expect(route.request().headers()['x-retrowave-key']).toBe(token); return route.fulfill({ json: { title: 'Fixture', artist: 'Artist', trackId, duration: 120, position: 4, isPlaying: true, capturedAtUnixMs: Date.now() - (stale ? 5000 : 2000) } }); });
  await page.route('https://api.spicylyrics.org/**', route => route.fulfill({ json: { Body: fixture } }));
  await page.goto(`./?live=1#bridge=${token}`); await signal(page);
  await expect(page.locator(active)).toHaveText('Floatinghome'); stale = true;
  await expect(page.locator('#app')).toHaveAttribute('data-lyrics', 'false');
});
test('LRCLIB renders and seeks for a non-Spotify player without a key or track ID', async ({ page }) => {
  let position = 1, calls = 0;
  await page.addInitScript(() => localStorage.setItem('spicy-bond-settings-v1', JSON.stringify({ publicLyrics: true })));
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { title: 'Fixture', artist: 'Artist', player: 'VLC', position, duration: 120, isPlaying: false } }));
  await page.route('https://lrclib.net/**', route => { calls++; return route.fulfill({ json: { trackName: 'Fixture', artistName: 'Artist', duration: 120, syncedLyrics: '[00:00.00]First public phrase\n[00:05.00]Second public phrase' } }); });
  await page.goto('./?live=1'); await signal(page);
  await expect(page.locator(active)).toHaveText('First public phrase');
  expect(await page.evaluate(() => 'Spicetify' in window)).toBe(false);
  await expect(page.locator('.LyricsProvider')).toHaveText('Provided by: LRCLIB');
  expect(await page.locator('#SpicyLyricsPage .word,.letter').count()).toBe(0);
  position = 7; await expect(page.locator(active)).toHaveText('Second public phrase'); expect(calls).toBe(1);
});
test('LRCLIB off overrides companion permission and survives reload', async ({ page }) => {
  let calls = 0;
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { title: 'Fixture', artist: 'Artist', position: 1, duration: 120, isPlaying: false, lrcLibAllowed: true } }));
  await page.route('https://lrclib.net/**', route => { calls++; return route.fulfill({ json: { trackName: 'Fixture', artistName: 'Artist', duration: 120, syncedLyrics: '[00:00.00]Allowed public text' } }); });
  await page.goto('./?settings=1&live=1'); await signal(page);
  await expect(page.locator('#lyrics-status')).toContainText('Enable LRCLIB'); expect(calls).toBe(0);
  await page.locator('[data-setting=publicLyrics]').check(); await expect(page.locator(active)).toHaveText('Allowed public text');
  await page.locator('[data-setting=publicLyrics]').uncheck(); await expect(page.locator('#lyrics')).toBeEmpty();
  const used = calls; await page.reload(); await signal(page); await expect(page.locator('#lyrics-status')).toContainText('Enable LRCLIB'); expect(calls).toBe(used);
});
test('provider backoff does not stop independent companion polling', async ({ page }) => {
  let polls = 0, providers = 0;
  await page.addInitScript(() => localStorage.setItem('spicy-bond-spicy-key', 'sl_pk_test'));
  await page.route('http://127.0.0.1:43821/**', route => { polls++; return route.fulfill({ json: { title: 'Fixture', artist: 'Artist', trackId, position: 1, duration: 120, isPlaying: true } }); });
  await page.route('https://api.spicylyrics.org/**', route => { providers++; return route.fulfill({ status: 429, headers: { 'Retry-After': '60' }, json: {} }); });
  await page.goto('./?live=1'); await signal(page); await expect.poll(() => providers).toBe(1);
  const initial = polls; await expect.poll(() => polls).toBeGreaterThan(initial + 1); expect(providers).toBe(1);
});
test('missing or replaced media clears the upstream renderer', async ({ page }) => {
  await start(page); await expect(page.locator(active)).toBeVisible();
  await signal(page, 'Other track'); await expect(page.locator('#lyrics')).toBeEmpty();
  await signal(page); await expect(page.locator(active)).toBeVisible();
  await page.evaluate(() => window.livelyCurrentTrack?.('null')); await expect(page.locator('#app')).toHaveAttribute('data-lyrics', 'false');
});
test('companion disconnect clears lyrics and reconnect rebuilds them', async ({ page }) => {
  const clock = { position: 1, isPlaying: false, title: 'Fixture' }; await start(page, fixture, clock);
  await expect(page.locator(active)).toBeVisible(); clock.title = 'No matching session';
  await expect(page.locator('#lyrics')).toBeEmpty(); clock.title = 'Fixture'; await expect(page.locator(active)).toBeVisible();
});
test('Lively pause freezes upstream style updates and resumes from the native clock', async ({ page }) => {
  const clock = { position: 1, isPlaying: false }; await start(page, fixture, clock); await expect(page.locator(active)).toBeVisible();
  await page.evaluate(() => window.livelyWallpaperPlaybackChanged?.('{"IsPaused":true}'));
  const style = await page.locator(active).getAttribute('style');
  clock.position = 7;
  await page.waitForTimeout(200); expect(await page.locator(active).getAttribute('style')).toBe(style);
  await page.evaluate(() => window.livelyWallpaperPlaybackChanged?.('{"IsPaused":false}')); await expect(page.locator(active)).toHaveText('Floatinghome');
});
test('a delayed response for an old song cannot restore its renderer', async ({ page }) => {
  let release!: () => void; let requested = false;
  await page.addInitScript(() => localStorage.setItem('spicy-bond-spicy-key', 'sl_pk_test'));
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { title: 'Fixture', artist: 'Artist', trackId, position: 1, duration: 120, isPlaying: false } }));
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('https://api.spicylyrics.org/**', async route => { requested = true; await held; await route.fulfill({ json: { Body: fixture } }).catch(() => {}); });
  await page.goto('./?live=1'); await signal(page); await expect.poll(() => requested).toBe(true);
  await signal(page, 'New track'); release(); await expect(page.locator('#lyrics')).toBeEmpty(); await expect(page.locator('#app')).toHaveAttribute('data-lyrics', 'false');
});
test('missing lyrics keep the normal TV layout and reject secret keys', async ({ page }) => {
  await start(page); await page.keyboard.press('s');
  await page.locator('#spicy-key').fill('sl_sk_secret'); await page.locator('#save-lyrics-key').click();
  await expect(page.locator('#lyrics-key-feedback')).toContainText('Secret keys cannot'); expect(await page.evaluate(() => localStorage.getItem('spicy-bond-spicy-key'))).toBe('sl_pk_test');
  await page.locator('[data-setting=lyrics]').uncheck(); await expect(page.locator('#app')).toHaveAttribute('data-lyrics', 'false');
});
