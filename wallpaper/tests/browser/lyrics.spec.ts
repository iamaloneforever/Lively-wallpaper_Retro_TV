import { expect, test } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('retrowave-settings-v1', JSON.stringify({ publicLyrics: true })));
  await page.route('https://lrclib.net/**', route => route.fulfill({ status: 404, json: { name: 'TrackNotFound' } }));
});
const trackId = 'a'.repeat(22);
test('setup pairing header and snapshot age anchor lyrics to the native clock', async ({ page }) => {
  const token = 'b'.repeat(64);
  await page.addInitScript(() => localStorage.setItem('retrowave-spicy-key', 'sl_pk_test'));
  let stale = false;
  await page.route('http://127.0.0.1:43821/**', route => {
    expect(route.request().headers()['x-retrowave-key']).toBe(token);
    return route.fulfill({ json: { title: 'Clock test', artist: 'Test artist', trackId, duration: 90,
      position: 4, isPlaying: true, capturedAtUnixMs: Date.now() - (stale ? 5000 : 2000) } });
  });
  await page.route('https://api.spicylyrics.org/**', route => route.fulfill({ json: lyrics }));
  await page.goto(`./?live=1#bridge=${token}`);
  await page.evaluate(() => window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Clock test', Artist: 'Test artist' })));
  await expect(page.locator('.lyric-line.active')).toHaveText('Floating home ');
  stale = true;
  await expect(page.locator('#app')).toHaveAttribute('data-lyrics', 'false');
});
test('provider rate limits do not stop the local clock and host pause freezes text', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('retrowave-spicy-key', 'sl_pk_test'));
  let polls = 0, providers = 0;
  await page.route('http://127.0.0.1:43821/**', route => { polls++; return route.fulfill({ json: { title: 'Clock test', artist: 'Test artist', trackId, duration: 90, position: 1, isPlaying: true } }); });
  await page.route('https://api.spicylyrics.org/**', route => { providers++; return route.fulfill({ status: 429, headers: { 'Retry-After': '60' }, json: {} }); });
  await page.goto('./?live=1');
  await page.evaluate(() => window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Clock test', Artist: 'Test artist' })));
  await expect.poll(() => providers).toBe(1);
  const first = polls;
  // Software WebGL on CI can delay frames; require two real clock polls rather than a wall-clock sleep.
  await expect.poll(() => polls, { timeout: 10000 }).toBeGreaterThan(first + 1);
  expect(providers).toBe(1);
});
test('Lively pause suspends native word animations and resumes from playback', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('retrowave-spicy-key', 'sl_pk_test'));
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { title: 'Clock test', artist: 'Test artist', trackId, duration: 90, position: 1, isPlaying: true } }));
  await page.route('https://api.spicylyrics.org/**', route => route.fulfill({ json: lyrics }));
  await page.goto('./?live=1');
  await page.evaluate(() => window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Clock test', Artist: 'Test artist' })));
  const word = page.locator('.active .lyric-word').last();
  await expect.poll(() => word.evaluate(el => el.getAnimations()[0]?.playState)).toBe('running');
  await page.evaluate(() => window.livelyWallpaperPlaybackChanged?.('{"IsPaused":true}'));
  await expect.poll(() => word.evaluate(el => el.getAnimations()[0]?.playState)).toBe('paused');
  const frozen = await word.evaluate(el => Number(el.getAnimations()[0].currentTime));
  await page.keyboard.press('s');
  await page.locator('[data-setting=lyricColor]').selectOption('neutral');
  await expect.poll(() => word.evaluate(el => el.getAnimations()[0]?.playState)).toBe('paused');
  expect(Math.abs(await word.evaluate(el => Number(el.getAnimations()[0].currentTime)) - frozen)).toBeLessThan(100);
  await page.locator('#close-settings').click();
  await page.evaluate(() => window.livelyWallpaperPlaybackChanged?.('{"IsPaused":false}'));
  await expect.poll(() => word.evaluate(el => el.getAnimations()[0]?.playState)).toBe('running');
});
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
  available = true;
  await expect(page.locator('#app')).toHaveAttribute('data-lyrics', 'true');
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
  await expect(page.locator('#lyrics-status')).toHaveText('No lyrics for this song.');
  await expect(page.locator('#app')).toHaveAttribute('data-lyrics', 'false');
  expect(calls).toBe(0);
  matched = true;
  await expect(page.locator('#app')).toHaveAttribute('data-lyrics', 'true');
  expect(calls).toBe(1);
});

test('documented LRCLIB fallback works without a key or track ID and keeps polling during lookup', async ({ page }) => {
  let polls = 0, position = 1;
  await page.route('http://127.0.0.1:43821/**', route => {
    polls++;
    return route.fulfill({ json: { title: 'Public test', artist: 'Test artist', trackId: '', position, duration: 90, isPlaying: false } });
  });
  let requests = 0;
  await page.route('https://lrclib.net/**', async route => {
    requests++;
    const url = new URL(route.request().url());
    expect(url.pathname).toBe('/api/get');
    expect(url.searchParams.get('track_name')).toBe('Public test');
    expect(url.searchParams.get('duration')).toBe('90');
    expect(route.request().headers().authorization).toBeUndefined();
    await new Promise(resolve => setTimeout(resolve, 4000));
    await route.fulfill({ json: { trackName: 'Public test', artistName: 'Test artist', duration: 90, syncedLyrics: '[00:00.00]First public phrase\n[00:05.00]Second public phrase', plainLyrics: null } });
  });
  await page.route('https://api.spicylyrics.org/**', () => { throw new Error('No Spicy request without a key or ID'); });
  await page.goto('./?live=1&settings=1');
  await page.evaluate(() => window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Public test', Artist: 'Test artist' })));
  await expect(page.locator('.lyric-line.active')).toHaveText('First public phrase', { timeout: 10000 });
  expect(polls).toBeGreaterThanOrEqual(3);
  await expect(page.locator('.lyrics-credit')).toHaveText('Lyrics · LRCLIB');
  expect(await page.locator('.active [data-start]').count()).toBe(0); // Line sync must not invent syllable timing.
  position = 7;
  await expect(page.locator('.lyric-line.active')).toHaveText('Second public phrase');
  expect(requests).toBe(1);
});

test('Line transitions remain continuous and provider syllables follow the paused clock', async ({ page }) => {
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
  const writes = await page.locator('#lyrics').evaluate(async root => {
    let changes = 0;
    const observer = new MutationObserver(records => { changes += records.length; });
    observer.observe(root, { subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    await new Promise(resolve => setTimeout(resolve, 300)); observer.disconnect(); return changes;
  });
  expect(writes).toBe(0); // A paused lyric must not rewrite every glyph's CSS each frame.
  const pulse = await page.locator('.active .lyric-word').first().getAttribute('style');
  await page.waitForTimeout(250);
  expect(await page.locator('.active .lyric-word').first().getAttribute('style')).toBe(pulse);
  expect(await page.locator('.active .lyric-syllable').count()).toBe(2);
  expect(await page.locator('.active .lyric-letter').count()).toBe(0);
  expect(await page.locator('.special').count()).toBe(0);
  position = 7;
  const sampleFrames = page.evaluate(async () => {
    const values: { y: number; t: number }[] = [];
    const start = performance.now();
    while (performance.now() - start < 2200) {
      const row = document.querySelector('[data-line="1"]')!;
      values.push({ y: row.getBoundingClientRect().top, t: performance.now() });
      await new Promise(requestAnimationFrame);
    }
    return values;
  });
  const capture = expect(page.locator('.lyric-line.active')).toHaveText('Floating home ').then(() => page.screenshot({ path: 'test-results/lyrics-transition.png' }));
  const [samples] = await Promise.all([sampleFrames, capture]);
  expect(samples[0].y - samples[samples.length - 1].y).toBeGreaterThan(30);
  for (let i = 1; i < samples.length; i++) {
    const dy = samples[i].y - samples[i - 1].y;
    expect(dy).toBeLessThan(2); // No reversal or jump back down while moving to the active slot.
    expect(Math.abs(dy)).toBeLessThan(12 + (samples[i].t - samples[i - 1].t) * 1.5);
  }
  await expect(page.locator('.lyric-line.active')).toHaveText('Floating home ');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => page.locator('.active .lyric-word').first().evaluate(el => el.getAnimations().length)).toBe(0);
  expect(await page.locator('.active .lyric-syllable').first().evaluate(el => el.getAnimations().length)).toBe(1);
});

test('native syllable animations advance between polls and freeze when playback pauses', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('retrowave-spicy-key', 'sl_pk_test'));
  let playing = false, started = 0;
  // Hold a long phrase paused until WebGL and the lyric layer are ready. Slow startup
  // must not consume the short shared fixture and replace the element under test.
  const animationLyrics = { Body: { id: trackId, Type: 'Syllable', source: 'spicy_lyrics', Content: [
    { Type: 'Vocal', Lead: { StartTime: 0, EndTime: 60, Syllables: [{ Text: 'Continuous', StartTime: 0, EndTime: 60 }] } },
  ] } };
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: {
    title: 'Clock test', artist: 'Test artist', trackId, position: playing ? 2 + (Date.now() - started) / 1000 : 2,
    duration: 90, isPlaying: playing,
  } }));
  await page.route('https://api.spicylyrics.org/**', route => route.fulfill({ json: animationLyrics }));
  await page.goto('./?live=1');
  await page.evaluate(() => window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Clock test', Artist: 'Test artist' })));
  const glyph = page.locator('.active .lyric-syllable').last();
  await expect.poll(() => glyph.evaluate(el => el.getAnimations()[0]?.playState)).toBe('paused');
  started = Date.now(); playing = true;
  await expect.poll(() => glyph.evaluate(el => el.getAnimations()[0]?.playState)).toBe('running');
  const advanced = await glyph.evaluate(async el => {
    const animation = el.getAnimations()[0];
    const first = Number(animation.currentTime);
    await new Promise(resolve => setTimeout(resolve, 180));
    return Number(animation.currentTime) - first;
  });
  expect(advanced).toBeGreaterThan(90);
  playing = false;
  await expect.poll(() => glyph.evaluate(el => el.getAnimations()[0]?.playState)).toBe('paused');
  const drift = await glyph.evaluate(async el => {
    const animation = el.getAnimations()[0];
    const first = Number(animation.currentTime);
    await new Promise(resolve => setTimeout(resolve, 250));
    return Number(animation.currentTime) - first;
  });
  expect(drift).toBe(0);
});

test('public fallback sends no song lookup until its settings toggle is enabled', async ({ page }) => {
  let requests = 0;
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { title: 'Consent fixture', artist: 'Test artist', trackId: '', duration: 90, position: 1, isPlaying: false } }));
  await page.route('https://lrclib.net/**', route => { requests++; return route.fulfill({ status: 404, json: {} }); });
  await page.goto('./?live=1&settings=1');
  await page.locator('[data-setting=publicLyrics]').uncheck();
  await page.evaluate(() => window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Consent fixture', Artist: 'Test artist' })));
  await page.waitForTimeout(1200);
  expect(requests).toBe(0);
  await page.locator('[data-setting=publicLyrics]').check();
  await expect.poll(() => requests).toBe(2); // Exact lookup followed by a search fallback, both after consent.
});
