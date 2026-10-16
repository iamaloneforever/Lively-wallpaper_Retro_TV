import { test, expect } from '@playwright/test';

test('wallpaper exposes keyboard-accessible shipped licenses and exact source materials', async ({ page }) => {
  await page.goto('./?live=1');
  const entry = page.getByRole('link', { name: 'Source and licenses', exact: true }).first();
  await expect(entry).toBeVisible();
  await entry.focus(); await expect(entry).toBeFocused();
  const opened = page.waitForEvent('popup'); await page.keyboard.press('Enter');
  const legal = await opened;
  await expect(legal).toHaveURL(new URL('licenses/', page.url()).href);
  await expect(legal.getByRole('heading', { name: 'Source and licenses', exact: true })).toBeVisible();
  await expect(legal.getByRole('heading', { name: 'Spicy Bond modifications to Spicy — 2026-10-15' })).toBeVisible();
  await expect(legal.getByRole('link', { name: 'Download complete corresponding source snapshot' })).toHaveAttribute('href', 'source.zip');
  for (const name of ['AGPL-3.0.txt', 'SpicyBond-MIT.txt', 'd3-ease-3.0.1.txt', 'simplebar-core-1.3.2.txt', 'lodash-es-4.18.1.txt', 'spr-MIT.txt']) {
    const response = await legal.request.get(new URL(name, legal.url()).toString()); expect(response.ok()).toBeTruthy();
    expect((await response.body()).length).toBeGreaterThan(1000);
  }
  const source = await legal.request.get(new URL('source.zip', legal.url()).toString()); expect(source.ok()).toBeTruthy();
  expect((await source.body()).subarray(0, 4).toString('hex')).toBe('504b0304');
});

test('settings source entry participates in dialog keyboard focus', async ({ page }) => {
  await page.goto('./?settings=1&live=1');
  const settings = page.getByRole('dialog', { name: 'Fine tuning' });
  const entry = settings.getByRole('link', { name: 'Source and licenses', exact: true });
  await entry.focus(); await expect(entry).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(settings.getByRole('link', { name: 'Complete corresponding source snapshot' })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(settings).toBeHidden();
});
