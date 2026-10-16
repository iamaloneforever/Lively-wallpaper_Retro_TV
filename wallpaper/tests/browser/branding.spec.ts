import { expect, test } from '@playwright/test';
import { brand } from '../../src/core/Brand';

test('new profiles have the Spicy Bond title, production logo and publishable default key', async ({ page }) => {
  await page.goto('./?live=1&settings=1');
  await expect(page).toHaveTitle('Spicy Bond — Feel the connection.');
  await expect(page.locator('#spicy-key')).toHaveValue(brand.lyricsKey);
  await expect(page.locator('link[rel=icon]')).toHaveAttribute('href', /brand\/logo.svg$/);
  await page.locator('#spicy-key').fill('');
  await page.locator('#save-lyrics-key').click();
  await page.reload();
  await expect(page.locator('#spicy-key')).toHaveValue('');
});

test('legacy browser preferences survive rebranding and a blank key remains blank', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('retrowave-settings-v1', JSON.stringify({ mode: 'vinyl', lyricSize: 1.2, lyrics: false }));
    localStorage.setItem('retrowave-spicy-key', '');
    localStorage.setItem('retrowave-custom-effects-v1-enabled', 'false');
    localStorage.setItem('retrowave-custom-effects-v1-overlay', 'false');
  });
  await page.goto('./?live=1&settings=1');
  await expect(page.locator('#app')).toHaveAttribute('data-mode', 'vinyl');
  await expect(page.locator('[data-setting=lyricSize]')).toHaveValue('1.2');
  await expect(page.locator('[data-setting=lyrics]')).not.toBeChecked();
  await expect(page.locator('#spicy-key')).toHaveValue('');
  await expect(page.locator('#custom-effects-enabled')).not.toBeChecked();
  await expect(page.locator('#custom-effects-overlay')).not.toBeChecked();
  await page.reload();
  await expect(page.locator('#app')).toHaveAttribute('data-mode', 'vinyl');
});

test('song preview renders lyrics offline and yields to native playback', async ({ page }) => {
  const lookups: string[] = [];
  await page.route(/https:\/\/(api.spicylyrics.org|lrclib.net)\//, route => { lookups.push(route.request().url()); return route.abort(); });
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { status: 'no_session' } }));
  await page.goto('./');
  await expect(page.locator('#app')).toHaveAttribute('data-lyrics', 'true', { timeout: 15000 });
  await expect(page.locator('.LyricsProvider')).toHaveText('Public-domain song · Spicy Bond visual preview');
  await page.keyboard.press('s');
  await page.locator('#next-track').click();
  await page.locator('#close-settings').click();
  await expect(page.locator('#accessible-track')).toHaveText('Demo: Amazing Grace — John Newton');
  await expect(page.locator('#lyrics')).toContainText('Amazing');
  expect(lookups).toEqual([]);
  await page.evaluate(() => window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Native song', Artist: 'Native artist' })));
  await expect(page.locator('#app')).toHaveAttribute('data-source', 'live');
  await expect(page.locator('#next-track')).toBeDisabled();
});
