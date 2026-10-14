import { expect, test } from '@playwright/test';
import { active, fixture, signal } from './lyric-fixtures';

const original = 'Fly Me to the Moon 2008 version';
const title = 'Fly Me to the Moon';
const selectedId = 'b'.repeat(22);
const trackKey = 'c'.repeat(64);
const token = 'd'.repeat(64);

test('missing lyrics open an editable picker; choosing a Spotify recording preserves the native title and clock', async ({ page }) => {
  let position = 1;
  const queries: string[] = [];
  await page.addInitScript(() => localStorage.setItem('retrowave-spicy-key', 'sl_pk_test'));
  await page.route('http://127.0.0.1:43821/**', route => {
    const url = new URL(route.request().url());
    expect(route.request().headers()['x-retrowave-key']).toBe(token);
    if (url.pathname === '/music-search') {
      queries.push(url.searchParams.get('title')!);
      expect(url.searchParams.get('trackKey')).toBe(trackKey);
      return route.fulfill({ json: { trackKey, candidates: url.searchParams.get('title') === title ? [{ title, artist: 'Artist', album: 'Original recording', duration: 120, provider: 'Experimental Spotify', spotifyId: selectedId }] : [], queries: [`Experimental Spotify: ${url.searchParams.get('title')} — Artist`], detail: '' } });
    }
    if (url.pathname === '/lyrics-status') return route.fulfill({ json: {} });
    return route.fulfill({ json: { title: original, artist: 'Artist', trackId: 'a'.repeat(22), trackKey, duration: 120, position, isPlaying: false } });
  });
  await page.route('https://api.spicylyrics.org/**', route => route.request().url().endsWith(selectedId) ? route.fulfill({ json: { Body: fixture } }) : route.fulfill({ status: 404, json: {} }));
  await page.goto(`./?live=1#bridge=${token}`); await signal(page, original);
  await expect(page.getByRole('dialog', { name: 'Find your song' })).toBeVisible();
  await expect(page.locator('#song-picker-native')).toHaveText(`${original} — Artist`);
  await expect(page.getByLabel('Song name', { exact: true })).toHaveValue(original);
  await expect.poll(() => queries.includes(original)).toBe(true);
  await page.getByLabel('Song name', { exact: true }).fill(title);
  await expect(page.locator('#song-picker-query')).toContainText(`Experimental Spotify: ${title}`);
  await expect(page.locator('.song-picker-result')).toContainText(selectedId);
  await page.locator('.song-picker-result').click();
  await expect(page.locator('#song-picker')).not.toBeVisible();
  await expect(page.locator(active)).toHaveText('Silverechoes');
  await expect(page.locator('#accessible-track')).toHaveText(`${original} — Artist`);
  position = 7; await expect(page.locator(active)).toHaveText('Floatinghome');
  await page.getByRole('button', { name: 'Find song', exact: true }).click();
  await expect(page.getByLabel('Song name', { exact: true })).toHaveValue(title);
  await page.getByRole('button', { name: 'Close song picker' }).click();
  await expect(page.getByRole('button', { name: 'Find song', exact: true })).toBeFocused();
});

test('LRCLIB recording selection loads by ID after correcting the title; dismissal stays dismissed', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('retrowave-settings-v1', JSON.stringify({ publicLyrics: true })));
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { title: original, artist: 'Artist', duration: 120, position: 1, isPlaying: false } }));
  await page.route('https://lrclib.net/**', route => {
    const url = new URL(route.request().url());
    const recording = { id: 42, trackName: title, artistName: 'Artist', albumName: 'Original', duration: 120, syncedLyrics: '[00:00]Chosen lyrics\n[00:05]Next phrase' };
    if (url.pathname === '/api/get/42') return route.fulfill({ json: recording });
    if (url.pathname === '/api/search') return route.fulfill({ json: url.searchParams.get('track_name') === title ? [recording] : [] });
    return route.fulfill({ status: 404, json: {} });
  });
  await page.goto('./?live=1'); await signal(page, original);
  await expect(page.locator('#song-picker')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.locator('#song-picker')).not.toBeVisible();
  await page.waitForTimeout(750); await expect(page.locator('#song-picker')).not.toBeVisible();
  await page.getByRole('button', { name: 'Find song', exact: true }).click();
  await page.getByLabel('Song name', { exact: true }).fill(title);
  await expect(page.locator('.song-picker-result')).toContainText('Lyrics ID: 42');
  await page.locator('.song-picker-result').click();
  await expect(page.locator(active)).toHaveText('Chosen lyrics');
  await signal(page, 'Another song');
  await expect(page.locator('#lyrics')).toBeEmpty(); await expect(page.locator('#song-picker')).not.toBeVisible();
});

test('typing debounces requests and rejects delayed results for an older search', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('retrowave-settings-v1', JSON.stringify({ publicLyrics: true })));
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { title: original, artist: 'Artist', duration: 120, position: 1, isPlaying: false } }));
  let release!: () => void; const held = new Promise<void>(resolve => { release = resolve; }); let staleStarted = false;
  const queries: string[] = [];
  await page.route('https://lrclib.net/**', async route => {
    const url = new URL(route.request().url()), query = url.searchParams.get('track_name') || '';
    if (url.pathname !== '/api/search') return route.fulfill({ status: 404, json: {} });
    queries.push(query);
    if (query === 'Old search') { staleStarted = true; await held; }
    await route.fulfill({ json: query === 'Old search' || query === title ? [{ id: query === title ? 42 : 43, trackName: query, artistName: 'Artist', duration: 120, plainLyrics: 'Lyrics' }] : [] }).catch(() => {});
  });
  await page.goto('./?live=1'); await signal(page, original); await expect(page.locator('#song-picker')).toBeVisible();
  const input = page.getByLabel('Song name', { exact: true });
  await input.fill('Old search'); await expect.poll(() => staleStarted).toBe(true);
  await input.fill('Fly'); await input.fill('Fly Me'); await input.fill(title);
  await expect(page.locator('.song-picker-result strong')).toHaveText(title); release();
  await expect(page.locator('.song-picker-result strong')).toHaveText(title);
  expect(queries).not.toContain('Fly'); expect(queries).not.toContain('Fly Me');
  await page.keyboard.press('Tab'); await expect(page.getByLabel('Artist (optional)')).toBeFocused();
});

test('finding lyrics in settings cancels deferred automatic opening', async ({ page }) => {
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { title: original, artist: 'Artist', duration: 120, position: 1, isPlaying: false } }));
  await page.route('https://lrclib.net/**', route => route.fulfill({ json: { trackName: original, artistName: 'Artist', duration: 120, syncedLyrics: '[00:00]Found in settings' } }));
  await page.goto('./?live=1&settings=1'); await signal(page, original);
  await expect(page.locator('#lyrics-status')).toContainText('Enable LRCLIB');
  await expect(page.locator('#song-picker')).not.toBeVisible();
  await page.locator('[data-setting=publicLyrics]').check();
  await expect(page.locator(active)).toHaveText('Found in settings');
  await page.getByRole('button', { name: 'Close settings' }).click();
  await page.waitForTimeout(750); await expect(page.locator('#song-picker')).not.toBeVisible();
});
