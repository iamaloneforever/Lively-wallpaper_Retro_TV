import { expect, test } from '@playwright/test';
import * as THREE from 'three';

test.beforeEach(async ({ page }) => {
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { status: 'no_session' } }));
});
test('wheel, keyboard and scrollbar reach every control without changing channel', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 360 });
  await page.goto('./?settings=1&live=1');
  const content = page.locator('.settings-content');
  await page.screenshot({ path: 'test-results/settings-top.png' });
  await content.hover(); await page.mouse.wheel(0, 800);
  await expect.poll(() => content.evaluate(el => el.scrollTop)).toBeGreaterThan(100);
  await content.focus(); await page.keyboard.press('End');
  await expect(page.locator('#reset-settings')).toBeInViewport();
  await expect(page.locator('#app')).toHaveAttribute('data-mode', 'broadcast');
  await page.screenshot({ path: 'test-results/settings-bottom.png' });
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(360);
  await page.keyboard.press('Home');
  await expect.poll(() => content.evaluate(el => el.scrollTop)).toBe(0);
  const bounds = await content.boundingBox();
  await page.mouse.move(bounds!.x + bounds!.width - 6, bounds!.y + 25);
  await page.mouse.down(); await page.mouse.move(bounds!.x + bounds!.width - 6, bounds!.y + bounds!.height - 20, { steps: 10 }); await page.mouse.up();
  await expect.poll(() => content.evaluate(el => el.scrollTop)).toBeGreaterThan(100);
  await page.locator('[data-setting=lyricStyle]').selectOption('classic');
  await expect(page.locator('[data-setting=lyricStyle]')).toHaveValue('classic');
  await page.locator('#spicy-key').fill('s');
  await expect(page.locator('#settings')).toBeVisible();
});
test('all settings persist, outputs update immediately and reset restores defaults', async ({ page }) => {
  await page.goto('./?settings=1&live=1');
  await page.locator('[data-setting=lyricStyle]').selectOption('minimal');
  await page.locator('[data-setting=lyricColor]').selectOption('neutral');
  await page.locator('[data-setting=lyricSize]').evaluate(el => { (el as HTMLInputElement).value = '1.2'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('[data-setting=lyricIntensity]').evaluate(el => { (el as HTMLInputElement).value = '0.4'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('[data-setting=casing]').selectOption('beige');
  await page.locator('[data-setting=mode]').selectOption('vinyl');
  await page.locator('[data-setting=fps]').selectOption('30');
  for (const key of ['scanlines', 'curvature', 'aberration', 'noise', 'glow', 'reflections', 'interference', 'particles', 'antenna', 'clock', 'lyrics']) await page.locator(`[data-setting=${key}]`).uncheck();
  await page.locator('[data-setting=publicLyrics]').check();
  await page.locator('[data-setting=lowPower]').check();
  await page.reload();
  await expect(page.locator('[data-setting=lyricStyle]')).toHaveValue('minimal');
  await expect(page.locator('[data-setting=lyricSize]')).toHaveValue('1.2');
  await expect(page.locator('[data-setting=lyricSize]').locator('..').locator('output')).toHaveText('1.2');
  await expect(page.locator('#app')).toHaveAttribute('data-mode', 'vinyl');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('retrowave-settings-v1')!));
  expect(saved).toMatchObject({ fps: 30, casing: 'beige', lyricIntensity: .4, lyricColor: 'neutral', publicLyrics: true, lowPower: true });
  for (const key of ['scanlines', 'curvature', 'aberration', 'noise', 'glow', 'reflections', 'interference', 'particles', 'antenna', 'clock', 'lyrics']) expect(saved[key]).toBe(false);
  await page.locator('#reset-settings').click();
  await expect(page.locator('[data-setting=lyricStyle]')).toHaveValue('smooth');
  await expect(page.locator('[data-setting=lyricSize]')).toHaveValue('1');
  await expect(page.locator('[data-setting=scanlines]')).toBeChecked();
  for (let i = 0; i < 5; i++) { await page.locator('#close-settings').click(); await page.keyboard.press('s'); await expect(page.locator('#settings')).toBeVisible(); }
});
test('high DPI and the reduced CSS viewport at 150 percent zoom remain bounded', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 260, height: 360 }, deviceScaleFactor: 3, hasTouch: true });
  const page = await context.newPage();
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { status: 'no_session' } }));
  await page.goto('./?settings=1&live=1');
  const content = page.locator('.settings-content');
  const scrollBounds = await content.boundingBox();
  const session = await context.newCDPSession(page);
  const x = scrollBounds!.x + 6, y = scrollBounds!.y + scrollBounds!.height - 20;
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) {
    await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 15 }] });
    await page.waitForTimeout(20);
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => content.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await page.locator('#reset-settings').scrollIntoViewIfNeeded();
  await expect(page.locator('#reset-settings')).toBeInViewport();
  const bounds = await page.locator('#settings').boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(360);
  expect(await page.locator('.settings-content').evaluate(el => getComputedStyle(el).touchAction)).toBe('pan-y');
  await page.screenshot({ path: 'test-results/settings-dpi-zoom.png' });
  await context.close();
});
test('physical dial, screen button and selector agree after rapid switching', async ({ page }) => {
  await page.goto('./?live=1');
  const canvas = page.locator('#scene > canvas'); await expect(canvas).toBeVisible();
  const bounds = await canvas.boundingBox();
  // Project the known cabinet pivot using the unchanged default camera.
  const camera = new THREE.PerspectiveCamera(34, bounds!.width / bounds!.height, .1, 80);
  camera.position.set(1.3, 1.2, 15.8); camera.lookAt(0, .5, 0); camera.updateMatrixWorld();
  const pivot = new THREE.Vector3(2.67, .95, 1.65).applyAxisAngle(new THREE.Vector3(0, 1, 0), -.09).project(camera);
  await page.mouse.click(bounds!.x + (pivot.x + 1) * bounds!.width / 2, bounds!.y + (1 - pivot.y) * bounds!.height / 2);
  await expect(page.locator('#app')).toHaveAttribute('data-mode', 'vinyl');
  await page.screenshot({ path: 'test-results/channel-vinyl.png' });
  for (let i = 0; i < 10; i++) await page.locator('#channel-button').click();
  await expect(page.locator('#channel-number')).toHaveText('02');
  await page.keyboard.press('s'); await page.locator('[data-setting=mode]').selectOption('broadcast');
  await page.locator('#close-settings').click();
  await expect(page.locator('#channel-number')).toHaveText('01');
  await page.screenshot({ path: 'test-results/channel-broadcast.png' });
  await page.reload(); await expect(page.locator('#app')).toHaveAttribute('data-mode', 'broadcast');
});
