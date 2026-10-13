import { expect, test, type Page } from '@playwright/test';

const id = 'a'.repeat(22);
async function start(page: Page, body: object, clock = { position: 1, isPlaying: false, rate: 1 }, title = 'Fixture') {
  await page.addInitScript(() => localStorage.setItem('retrowave-spicy-key', 'sl_pk_test'));
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { title, artist: 'Artist', trackId: id, duration: 120, ...clock } }));
  await page.route('https://api.spicylyrics.org/**', route => route.fulfill({ json: { Body: { source: 'spicy_lyrics', ...body } } }));
  await page.goto('./?live=1');
  await page.evaluate(title => window.livelyCurrentTrack?.(JSON.stringify({ Title: title, Artist: 'Artist' })), title);
}
test('syllable timestamps remain exact, invalid timings retain text, and colors follow singing', async ({ page }) => {
  const clock = { position: 1, isPlaying: false, rate: 1 };
  await start(page, { Type: 'Syllable', Content: [{ Type: 'Vocal', Lead: { StartTime: 0, EndTime: 20, Syllables: [
    { Text: 'Moon', StartTime: 0, EndTime: 2, IsPartOfWord: true },
    { Text: 'light!', StartTime: 2, EndTime: 5 },
    { Text: 'unscheduled?', StartTime: -1, EndTime: 9 },
  ] } }] }, clock);
  const parts = page.locator('.active .lyric-syllable');
  await expect(parts).toHaveCount(3);
  await expect(parts.nth(0)).toHaveAttribute('data-start', '0');
  await expect(parts.nth(1)).toHaveAttribute('data-start', '2');
  expect(await parts.nth(2).getAttribute('data-start')).toBeNull();
  expect(await page.locator('.lyric-letter,.special').count()).toBe(0);
  const color = (i: number) => parts.nth(i).evaluate(el => getComputedStyle(el).color);
  const sung = await color(0), waiting = await color(1), unclocked = await color(2);
  expect(sung).not.toBe(waiting);
  clock.position = 3;
  await expect.poll(() => color(1)).not.toBe(waiting);
  expect(await color(2)).toBe(unclocked);
  clock.position = 1;
  await expect.poll(() => color(0)).toBe(sung);
  await page.screenshot({ path: 'test-results/lyrics-syllables.png' });
});
for (const [name, text] of [
  ['rtl', 'سلام  دنیا! مرحباً بالعالم، موسیقی 🎵'],
  ['mixed', 'سلام Spotify 2026 — e\u0301cho 👩‍🎤'],
  ['long', ('A long flowing line with punctuation!  ' .repeat(12)) + '\nA second visual row'],
] as const) {
  test(`${name} lyrics retain Unicode, whitespace and a readable active area`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await start(page, { Type: 'Line', Content: [{ Type: 'Vocal', Text: text, StartTime: 0, EndTime: 100 }] });
    const row = page.locator('.lyric-line.active');
    await expect(row).toHaveText(text.trim());
    expect(await row.locator('[data-start]').count()).toBe(0);
    const bounds = await row.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
    expect(bounds!.height).toBeLessThanOrEqual(844 * .28 + 1);
    await expect.poll(() => page.locator('#lyrics').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
    await page.screenshot({ path: `test-results/lyrics-${name}.png` });
  });
}
test('untimed lyrics show the entire readable scrollable text without karaoke', async ({ page }) => {
  await start(page, { Type: 'Static', Lines: Array.from({ length: 20 }, (_, i) => ({ Text: `Untimed phrase ${i}` })) });
  await expect(page.locator('.lyric-line.static')).toHaveCount(20);
  expect(await page.locator('#lyrics [data-start]').count()).toBe(0);
  await page.locator('.lyric-line.static').last().scrollIntoViewIfNeeded();
  await expect(page.locator('.lyric-line.static').last()).toBeInViewport();
});
test('timed Arabic syllables stay inline and connected within a complete word', async ({ page }) => {
  await start(page, { Type: 'Syllable', Content: [{ Type: 'Vocal', Lead: { StartTime: 0, EndTime: 10, Syllables: [
    { Text: 'س', StartTime: 0, EndTime: 3, IsPartOfWord: true }, { Text: 'لام', StartTime: 3, EndTime: 8 },
  ] } }] });
  const word = page.locator('.active .lyric-word');
  await expect(word).toHaveText('سلام ');
  expect(await word.locator('.lyric-syllable').count()).toBe(2);
  expect(await word.locator('.lyric-syllable').first().evaluate(el => getComputedStyle(el).display)).toBe('inline');
  await expect.poll(() => page.locator('#lyrics').evaluate(el => getComputedStyle(el).opacity)).toBe('1');
  await page.screenshot({ path: 'test-results/lyrics-rtl-syllables.png' });
});
test('color presets stay legible on light, dark and saturated album palettes', async ({ page }) => {
  await start(page, { Type: 'Line', Content: [{ Type: 'Vocal', Text: 'High contrast album lyrics', StartTime: 0, EndTime: 100 }] });
  await expect(page.locator('.lyric-line.active')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [name, color] of [['light', '#fff9d0'], ['dark', '#080909'], ['saturated', '#e00028']]) {
    await page.evaluate(color => {
      const cover = document.createElement('canvas'); cover.width = cover.height = 24;
      const ctx = cover.getContext('2d')!; ctx.fillStyle = color; ctx.fillRect(0, 0, 24, 24);
      window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Fixture', Artist: 'Artist', Thumbnail: cover.toDataURL() }));
    }, color);
    await expect.poll(() => page.locator('#app').evaluate(el => el.style.getPropertyValue('--cover-1'))).toBe(color);
    const values = await page.locator('.active').evaluate(el => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = getComputedStyle(el).color; ctx.fillRect(0, 0, 1, 1);
      return Array.from(ctx.getImageData(0, 0, 1, 1).data).slice(0, 3);
    });
    expect(Math.min(...values)).toBeGreaterThanOrEqual(225);
    await page.screenshot({ path: `test-results/lyrics-album-${name}.png` });
  }
});
test('low power keeps timing highlights while suppressing word movement', async ({ page }) => {
  const clock = { position: 1, isPlaying: false, rate: 2 };
  await start(page, { Type: 'Syllable', Content: [{ Type: 'Vocal', Lead: { StartTime: 0, EndTime: 60, Syllables: [{ Text: 'Sustained', StartTime: 0, EndTime: 60 }] } }] }, clock);
  await expect(page.locator('.active')).toBeVisible();
  await page.keyboard.press('s'); await page.locator('[data-setting=lowPower]').check();
  const word = page.locator('.active .lyric-word');
  await expect.poll(() => word.evaluate(el => el.getAnimations().length)).toBe(0);
  const part = page.locator('.active .lyric-syllable');
  await expect.poll(() => part.evaluate(el => el.getAnimations()[0]?.currentTime)).toBe(1000);
  clock.position = 10;
  await expect.poll(() => part.evaluate(el => el.getAnimations()[0]?.currentTime)).toBe(10000);
  clock.isPlaying = true;
  await expect.poll(() => part.evaluate(el => el.getAnimations()[0]?.playbackRate)).toBe(2);
});
test('a delayed lyric response from a replaced track cannot reappear', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('retrowave-spicy-key', 'sl_pk_test'));
  let title = 'Old track', request = false;
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { title, artist: 'Artist', trackId: title === 'Old track' ? id : '', position: 1, duration: 90, isPlaying: false } }));
  let release!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('https://api.spicylyrics.org/**', async route => {
    request = true; await held;
    await route.fulfill({ json: { Body: { Type: 'Static', Lines: [{ Text: 'Old text' }] } } }).catch(() => {});
  });
  await page.goto('./?live=1');
  await page.evaluate(() => window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Old track', Artist: 'Artist' })));
  await expect.poll(() => request).toBe(true);
  title = 'New track';
  await page.evaluate(() => window.livelyCurrentTrack?.(JSON.stringify({ Title: 'New track', Artist: 'Artist' })));
  await expect(page.locator('#lyrics-status')).toContainText('Enable LRCLIB fallback');
  release();
  await expect(page.locator('#lyrics')).toBeEmpty();
  await expect(page.locator('#app')).toHaveAttribute('data-lyrics', 'false');
});
