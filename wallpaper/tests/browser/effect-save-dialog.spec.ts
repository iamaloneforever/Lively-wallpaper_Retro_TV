import { expect, test } from '@playwright/test';
const token = 'b'.repeat(64);

test('exports wait for the native save dialog, prevent duplicates and handle cancel without showing copy-only JSON', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 640, height: 360 });
  await page.addInitScript(() => localStorage.setItem('spicy-bond-settings-v1', JSON.stringify({ performancePreset: 'low', reducedMotion: true, particles: false })));
  let count = 0, release!: () => void;
  const choosing = new Promise<void>(resolve => { release = resolve; });
  await page.route('http://127.0.0.1:43821/**', async route => {
    if (!route.request().url().endsWith('/effect-export')) return route.fulfill({ json: { status: 'no_session' } });
    expect(route.request().postDataJSON().chooseLocation).toBe(true); count++;
    if (count === 1) { await choosing; return route.fulfill({ json: { path: 'C:\\Chosen folder\\my effect.json', dialog: true } }); }
    return route.fulfill({ json: { cancelled: true, dialog: true } });
  });
  await page.goto(`./?live=1&settings=1#bridge=${token}`);
  await page.locator('#custom-effect-starter').click();
  await expect(page.locator('#custom-effect-feedback')).toContainText('Windows Save As dialog');
  await page.waitForTimeout(5500);
  await expect(page.locator('#custom-effect-json-field')).toBeHidden();
  await expect(page.locator('#custom-effect-copy')).toBeHidden();
  await page.locator('#custom-effect-starter').click();
  await expect(page.locator('#custom-effect-feedback')).toContainText('already open'); expect(count).toBe(1);
  release(); await expect(page.locator('#custom-effect-feedback')).toContainText('Saved JSON: C:\\Chosen folder\\my effect.json');
  await page.locator('#custom-effect-starter').click();
  await expect(page.locator('#custom-effect-feedback')).toHaveText('Save canceled.');
  await expect(page.locator('#custom-effect-json-field')).toBeHidden(); expect(count).toBe(2);
});

test('an unavailable native export explains the update without displaying JSON', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await page.addInitScript(() => {
    localStorage.setItem('spicy-bond-settings-v1', JSON.stringify({ performancePreset: 'low', reducedMotion: true, particles: false }));
  });
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ status: route.request().url().endsWith('/effect-export') ? 404 : 200, json: { status: 'no_session' } }));
  await page.goto(`./?live=1&settings=1#bridge=${token}`);
  await page.locator('#custom-effect-starter').click();
  await expect(page.locator('#custom-effect-feedback')).toContainText('Update the companion');
  await expect(page.locator('#custom-effect-json-field, #custom-effect-copy')).toHaveCount(0);
});
