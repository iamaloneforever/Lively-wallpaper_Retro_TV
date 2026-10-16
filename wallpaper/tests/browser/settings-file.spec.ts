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
  await page.addInitScript(() => { localStorage.setItem('spicy-bond-settings-v1', JSON.stringify({ lyricStyle: 'classic', fps: 30 })); localStorage.setItem('spicy-bond-spicy-key', 'sl_pk_migrated'); });
  let file = { version: 1, config: { ...defaults }, lyricsKey: '' }, revision = '', writes = 0;
  await page.route('http://127.0.0.1:43821/**', route => {
    if (!route.request().url().endsWith('/wallpaper-settings')) return route.fulfill({ json: { status: 'no_session' } });
    if (route.request().method() === 'POST') { file = route.request().postDataJSON().settings; revision = 'a'.repeat(64); writes++; }
    return route.fulfill({ json: { initialized: !!revision, revision, settings: file } });
  });
  await page.goto(`./?live=1&settings=1#bridge=${token}`);
  await expect.poll(() => writes).toBe(1);
  // Receiving the POST is earlier than the browser accepting its acknowledgement.
  await expect(page.locator('#settings-sync-status')).toContainText('Settings saved in wallpaper-settings.json');
  expect(file.config.lyricStyle).toBe('classic'); expect(file.config.fps).toBe(30); expect(file.lyricsKey).toBe('sl_pk_migrated');
  const refreshed = page.waitForResponse(async response => response.url().endsWith('/wallpaper-settings') &&
    response.request().method() === 'GET' && (await response.json()).revision === 'b'.repeat(64));
  file = { ...file, config: { ...file.config, lyricStyle: 'minimal', casing: 'beige' } }; revision = 'b'.repeat(64);
  await refreshed;
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

test('companion JSON saves imported effects, movement and scale and restores them without browser storage', async ({ page }) => {
  test.setTimeout(180_000);
  let file: import('../../src/core/SettingsSync').SettingsDocument = { version: 1, config: { ...defaults, reducedMotion: true }, lyricsKey: '' };
  let revision = 'a'.repeat(64);
  await page.route('http://127.0.0.1:43821/**', route => {
    if (!route.request().url().endsWith('/wallpaper-settings')) return route.fulfill({ json: { status: 'no_session' } });
    if (route.request().method() === 'POST') { file = route.request().postDataJSON().settings; revision = 'b'.repeat(64); }
    return route.fulfill({ json: { initialized: true, revision, settings: file } });
  });
  await page.goto(`./?live=1&settings=1#bridge=${token}`);
  await expect(page.locator('#settings-sync-status')).toContainText('Settings saved');
  await page.locator('#custom-effect-file').setInputFiles({ name: 'effect.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, effects: [{ id: 'companion-effect', name: 'Saved effect', match: { titles: ['My Song'], artists: ['My Artist'] }, layers: [{ type: 'star', color: '#ff22dd' }] }] })) });
  await expect.poll(() => file.customEffects?.file.effects[0]?.id).toBe('companion-effect');
  for (const [key, value] of [['particleMotion', '2.4'], ['particleScale', '2.2']]) {
    await page.locator(`[data-setting=${key}]`).evaluate((element, val) => { (element as HTMLInputElement).value = val; element.dispatchEvent(new Event('input', { bubbles: true })); element.dispatchEvent(new Event('change', { bubbles: true })); }, value);
  }
  await page.locator('#custom-effects-enabled').uncheck();
  await expect.poll(() => file.customEffects?.enabled).toBe(false);
  await expect.poll(() => file.config.particleScale).toBe(2.2);
  await expect(page.locator('#settings-sync-status')).toContainText('Settings saved');
  await page.evaluate(() => localStorage.clear()); await page.reload();
  await expect(page.locator('#custom-effect-list')).toContainText('Saved effect');
  await expect(page.locator('#custom-effects-enabled')).not.toBeChecked();
  await expect(page.locator('[data-setting=particleMotion]')).toHaveValue('2.4');
  await expect(page.locator('[data-setting=particleScale]')).toHaveValue('2.2');
  await page.locator('#custom-effects-enabled').check();
  await page.evaluate(() => window.livelyCurrentTrack?.(JSON.stringify({ Title: 'My Song', Artist: 'My Artist' })));
  await expect(page.locator('#app')).toHaveAttribute('data-custom-effect', 'companion-effect');
});
