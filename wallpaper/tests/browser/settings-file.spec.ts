import { expect, test } from '@playwright/test';
import { defaults } from '../../src/core/Config';
const token = 'd'.repeat(64);

test('saved JSON restores wallpaper and lyric settings after browser storage is cleared', async ({ page }) => {
  let file = { version: 1, config: { ...defaults, mode: 'vinyl', casing: 'beige', lyricStyle: 'minimal', lyricSize: 1.25 }, lyricsKey: 'sl_pk_fixture' };
  let revision = 'a'.repeat(64), writes = 0;
  await page.route('http://127.0.0.1:43821/**', route => {
    if (!route.request().url().endsWith('/wallpaper-settings')) return route.fulfill({ json: { status: 'no_session' } });
    expect(route.request().headers()['x-retrowave-key']).toBe(token);
    if (route.request().method() === 'POST') { const body = route.request().postDataJSON(); expect(body.expectedRevision).toBe(revision); file = body.settings; revision = 'b'.repeat(64); writes++; }
    return route.fulfill({ json: { initialized: true, revision, settings: file } });
  });
  await page.goto(`./?live=1&settings=1#bridge=${token}`);
  await expect(page.locator('[data-setting=lyricStyle]')).toHaveValue('minimal');
  await expect(page.locator('#spicy-key')).toHaveValue('sl_pk_fixture');
  await expect(page.locator('#app')).toHaveAttribute('data-mode', 'vinyl'); expect(writes).toBe(0);
  await page.locator('[data-setting=lyricColor]').selectOption('neutral');
  await expect.poll(() => writes).toBe(1);
  await expect(page.locator('#settings-sync-status')).toContainText('Settings saved in wallpaper-settings.json');
  await page.evaluate(() => localStorage.clear()); await page.reload();
  await expect(page.locator('[data-setting=lyricColor]')).toHaveValue('neutral');
  await expect(page.locator('[data-setting=casing]')).toHaveValue('beige');
  await expect(page.locator('[data-setting=lyricSize]')).toHaveValue('1.25');
  await expect(page.locator('#spicy-key')).toHaveValue('sl_pk_fixture'); expect(writes).toBe(1);
});

test('first connection migrates browser preferences once and updates the wallpaper when the file changes', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('retrowave-settings-v1', JSON.stringify({ lyricStyle: 'classic', fps: 30 })); localStorage.setItem('retrowave-spicy-key', 'sl_pk_migrated'); });
  let file = { version: 1, config: { ...defaults }, lyricsKey: '' }, revision = '', writes = 0;
  await page.route('http://127.0.0.1:43821/**', route => {
    if (!route.request().url().endsWith('/wallpaper-settings')) return route.fulfill({ json: { status: 'no_session' } });
    if (route.request().method() === 'POST') { file = route.request().postDataJSON().settings; revision = 'a'.repeat(64); writes++; }
    return route.fulfill({ json: { initialized: !!revision, revision, settings: file } });
  });
  await page.goto(`./?live=1&settings=1#bridge=${token}`);
  await expect.poll(() => writes).toBe(1);
  expect(file.config.lyricStyle).toBe('classic'); expect(file.config.fps).toBe(30); expect(file.lyricsKey).toBe('sl_pk_migrated');
  file = { ...file, config: { ...file.config, lyricStyle: 'minimal', casing: 'beige' } }; revision = 'b'.repeat(64);
  await expect(page.locator('[data-setting=lyricStyle]')).toHaveValue('minimal'); await expect(page.locator('[data-setting=casing]')).toHaveValue('beige');
  await page.reload(); await expect(page.locator('[data-setting=lyricStyle]')).toHaveValue('minimal'); expect(writes).toBe(1);
});

test('changes made while saving is offline survive a reload and sync on reconnection', async ({ page }) => {
  let file = { version: 1, config: { ...defaults, casing: 'beige' }, lyricsKey: '' }, online = false;
  await page.route('http://127.0.0.1:43821/**', route => {
    if (!route.request().url().endsWith('/wallpaper-settings')) return route.fulfill({ json: { status: 'no_session' } });
    if (route.request().method() === 'POST') {
      if (!online) return route.fulfill({ status: 503, json: {} });
      file = route.request().postDataJSON().settings;
    }
    return route.fulfill({ json: { initialized: true, revision: 'a'.repeat(64), settings: file } });
  });
  await page.goto(`./?live=1&settings=1#bridge=${token}`);
  await expect(page.locator('[data-setting=casing]')).toHaveValue('beige');
  await page.locator('[data-setting=mode]').selectOption('vinyl');
  await expect(page.locator('#settings-sync-status')).toContainText('Could not save the JSON file');
  online = true; await page.reload();
  await expect.poll(() => file.config.mode).toBe('vinyl');
  await expect(page.locator('[data-setting=casing]')).toHaveValue('beige');
  await expect(page.locator('#settings-sync-status')).toContainText('Settings saved in wallpaper-settings.json');
});
