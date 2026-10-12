import { expect, test } from '@playwright/test';
const trackId = 'a'.repeat(22);
const lyrics = { Body: { id: trackId, Type: 'Syllable', source: 'spicy_lyrics', UploadAttribution: { Uploader: { username: 'Test uploader', url: 'https://spicylyrics.org/uid/123' }, Maker: { username: 'Test maker', url: 'https://spicylyrics.org/uid/456' } }, Content: [
  { Type: 'Vocal', Lead: { StartTime: 0, EndTime: 5, Syllables: [{ Text: 'Silver', StartTime: 0, EndTime: 2 }, { Text: 'echoes', StartTime: 2, EndTime: 5 }] } },
  { Type: 'Vocal', Lead: { StartTime: 5, EndTime: 12, Syllables: [{ Text: 'Floating', StartTime: 5, EndTime: 8 }, { Text: 'home', StartTime: 8, EndTime: 12 }] } },
] } };
test('ghost lyrics follow pause and seek, credit creators, and hide on track changes', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('retrowave-spicy-key', 'sl_pk_test'));
  let position = 1, title = 'Clock test';
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { title, artist: 'Test artist', trackId, position, duration: 90, isPlaying: false, player: 'Browser player' } }));
  let calls = 0;
  await page.route('https://api.spicylyrics.org/**', route => { calls++; expect(route.request().headers().authorization).toBe('Bearer sl_pk_test'); return route.fulfill({ json: lyrics }); });
  await page.goto('./?live=1');
  await page.evaluate(() => window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Clock test', Artist: 'Test artist' })));
  await expect(page.locator('#app')).toHaveAttribute('data-lyrics', 'true');
  await expect(page.locator('.lyric-line.active')).toHaveText('Silver echoes ');
  await expect(page.locator('.lyrics-credit')).toContainText('Spicy Lyrics');
  await expect(page.getByRole('link', { name: 'Uploader: Test uploader' })).toHaveAttribute('href', 'https://spicylyrics.org/uid/123');
  await page.waitForTimeout(2200);
  await expect(page.locator('.lyric-line.active')).toHaveText('Silver echoes '); // Paused snapshot cannot drift.
  position = 7;
  await expect(page.locator('.lyric-line.active')).toHaveText('Floating home ');
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'test-results/ghost-lyrics.png' });
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(1200);
  await page.screenshot({ path: 'test-results/ghost-lyrics-mobile.png' });
  position = 1;
  await expect(page.locator('.lyric-line.active')).toHaveText('Silver echoes ');
  expect(calls).toBe(1);
  title = 'Other song';
  await page.evaluate(() => window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Unmatched song', Artist: 'Test artist' })));
  await expect(page.locator('#app')).toHaveAttribute('data-lyrics', 'false');
  await expect(page.locator('#lyrics')).toBeEmpty();
});
test('missing lyrics leave the TV at its normal size and reject secret keys', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('retrowave-spicy-key', 'sl_pk_test'));
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { title: 'No lyrics', artist: 'Test artist', trackId, position: 1, duration: 90, isPlaying: true } }));
  await page.route('https://api.spicylyrics.org/**', route => route.fulfill({ status: 404, json: { Body: { error: 'lyrics_not_found' } } }));
  await page.goto('./?live=1&settings=1');
  await page.evaluate(() => window.livelyCurrentTrack?.(JSON.stringify({ Title: 'No lyrics', Artist: 'Test artist' })));
  await expect(page.locator('#lyrics-status')).toHaveText('No lyrics for this song.');
  await expect(page.locator('#app')).toHaveAttribute('data-lyrics', 'false');
  await page.locator('#spicy-key').fill('sl_sk_forbidden');
  await page.getByRole('button', { name: 'Save lyrics key' }).click();
  await expect(page.locator('#lyrics-key-feedback')).toContainText('Secret keys cannot be used');
  await expect(page.locator('#spicy-key')).toHaveAttribute('aria-invalid', 'true');
  await page.waitForTimeout(2200); // Multiple playback polls cannot erase validation feedback.
  await expect(page.locator('#lyrics-key-feedback')).toContainText('Secret keys cannot be used');
  await expect(page.locator('#lyrics-status')).toHaveText('No lyrics for this song.');
  expect(await page.evaluate(() => localStorage.getItem('retrowave-spicy-key'))).toBe('sl_pk_test');
});
test('stopped companion hides lyrics rather than drifting', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('retrowave-spicy-key', 'sl_pk_test'));
  let available = true;
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill(available ? { json: { title: 'Clock test', artist: 'Test artist', trackId, position: 1, duration: 90, isPlaying: true } } : { json: { status: 'no_session' } }));
  await page.route('https://api.spicylyrics.org/**', route => route.fulfill({ json: lyrics }));
  await page.goto('./?live=1');
  await page.evaluate(() => window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Clock test', Artist: 'Test artist' })));
  await expect(page.locator('#app')).toHaveAttribute('data-lyrics', 'true'); available = false;
  await expect(page.locator('#app')).toHaveAttribute('data-lyrics', 'false');
});

test('unmatched public catalogue track stays hidden and recovers when an ID is available', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('retrowave-spicy-key', 'sl_pk_test'));
  let matched = false, calls = 0;
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: {
    title: 'Clock test', artist: 'Test artist', trackId: matched ? trackId : '',
    position: 1, duration: 90, isPlaying: false, status: matched ? 'ready' : 'track_unmatched',
  } }));
  await page.route('https://api.spicylyrics.org/**', route => { calls++; return route.fulfill({ json: lyrics }); });
  await page.goto('./?live=1&settings=1');
  await page.evaluate(() => window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Clock test', Artist: 'Test artist' })));
  await expect(page.locator('#lyrics-status')).toContainText('MetaBrainz');
  await expect(page.locator('#app')).toHaveAttribute('data-lyrics', 'false');
  expect(calls).toBe(0);
  matched = true;
  await expect(page.locator('#app')).toHaveAttribute('data-lyrics', 'true');
  expect(calls).toBe(1);
});

test('Motion keeps line transitions continuous and letter effects follow the paused clock', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('retrowave-spicy-key', 'sl_pk_test'));
  let position = 1;
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: {
    title: 'Motion test', artist: 'Test artist', trackId, position, duration: 90, isPlaying: false,
  } }));
  await page.route('https://api.spicylyrics.org/**', route => route.fulfill({ json: lyrics }));
  await page.goto('./?live=1');
  await page.evaluate(() => window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Motion test', Artist: 'Test artist' })));
  await expect(page.locator('.lyric-line.active')).toHaveText('Silver echoes ');
  await page.waitForTimeout(1400);
  const pulse = await page.locator('.active .lyric-word').first().getAttribute('style');
  await page.waitForTimeout(250);
  expect(await page.locator('.active .lyric-word').first().getAttribute('style')).toBe(pulse);
  expect(await page.locator('.active .lyric-letter').count()).toBeGreaterThan(5);
  await expect(page.locator('.active .special').first()).toBeVisible();
  position = 7;
  const samples = await page.evaluate(async () => {
    const values: { y: number; t: number }[] = [];
    const start = performance.now();
    while (performance.now() - start < 2200) {
      const row = document.querySelector('[data-line="1"]')!;
      values.push({ y: row.getBoundingClientRect().top, t: performance.now() });
      await new Promise(requestAnimationFrame);
    }
    return values;
  });
  expect(samples[0].y - samples[samples.length - 1].y).toBeGreaterThan(30);
  for (let i = 1; i < samples.length; i++) {
    const dy = samples[i].y - samples[i - 1].y;
    expect(dy).toBeLessThan(2); // No reversal or jump back down while moving to the active slot.
    expect(Math.abs(dy)).toBeLessThan(12 + (samples[i].t - samples[i - 1].t) * 1.5);
  }
  await expect(page.locator('.lyric-line.active')).toHaveText('Floating home ');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.locator('.active .lyric-word').first().evaluate(el => el.style.getPropertyValue('--pulse'))).toBe('0.0000');
});
