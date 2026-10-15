import { expect, test } from '@playwright/test';
import * as THREE from 'three';
import { defaults } from '../../src/core/Config';

test.beforeEach(async ({ page }) => {
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { status: 'no_session' } }));
});

test('opening settings preserves scene cadence instead of skipping eight frames', async ({ page }) => {
  await page.goto('./?settings=1&live=1');
  await expect(page.locator('#scene > canvas')).toBeVisible();
  const sample = () => page.locator('#scene > canvas').evaluate(async canvas => {
    const gl = (canvas as HTMLCanvasElement).getContext('webgl2')!;
    const clear = gl.clear;
    const drawn = new Set<number | null>();
    gl.clear = function(mask: number) { drawn.add(document.timeline.currentTime as number | null); clear.call(this, mask); };
    try {
      const started = performance.now();
      let callbacks = 0;
      do { await new Promise(requestAnimationFrame); callbacks++; }
      while (callbacks < 24 || performance.now() - started < 500);
      return { frames: drawn.size, fps: drawn.size * 1000 / (performance.now() - started) };
    } finally { gl.clear = clear; }
  });
  const modalFrames = await sample();
  expect(modalFrames.frames).toBeGreaterThan(0);
  await page.locator('#close-settings').click();
  const closedFrames = await sample();
  expect(modalFrames.fps).toBeGreaterThan(closedFrames.fps * .7);
});

test('change-only host events save settings and survive a reload', async ({ page }) => {
  await page.goto('./?settings=1&live=1');
  await page.locator('[data-setting=lyrics]').evaluate(el => {
    (el as HTMLInputElement).checked = false;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect(page.locator('#settings-save-status')).toHaveText('Settings saved automatically.');
  await page.reload();
  await expect(page.locator('[data-setting=lyrics]')).not.toBeChecked();
});

test('blocked host storage is reported instead of silently claiming a save', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError'); };
  });
  await page.goto('./?settings=1&live=1');
  await page.locator('[data-setting=clock]').uncheck();
  await expect(page.locator('#settings-save-status')).toContainText('blocked persistent storage');
  await expect(page.locator('[data-setting=clock]')).not.toBeChecked();
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
test('lyric appearance persists, outputs update immediately and reset restores defaults', async ({ page }) => {
  await page.goto('./?settings=1&live=1');
  await page.locator('[data-setting=lyricStyle]').selectOption('minimal');
  await page.locator('[data-setting=lyricColor]').selectOption('neutral');
  await page.locator('[data-setting=lyricSize]').evaluate(el => { (el as HTMLInputElement).value = '1.2'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('[data-setting=lyricIntensity]').evaluate(el => { (el as HTMLInputElement).value = '0.4'; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.reload();
  await expect(page.locator('[data-setting=lyricStyle]')).toHaveValue('minimal');
  await expect(page.locator('[data-setting=lyricSize]')).toHaveValue('1.2');
  await expect(page.locator('[data-setting=lyricSize]').locator('..').locator('output')).toHaveText('1.2');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('retrowave-settings-v1')!));
  expect(saved).toMatchObject({ lyricSize: 1.2, lyricIntensity: .4, lyricColor: 'neutral' });
  await page.locator('#reset-settings').click();
  await expect(page.locator('[data-setting=lyricStyle]')).toHaveValue('smooth');
  await expect(page.locator('[data-setting=lyricSize]')).toHaveValue('1');
  await expect(page.locator('[data-setting=scanlines]')).toBeChecked();
});
test('display and playback preferences persist and reset restores defaults', async ({ page }) => {
  await page.goto('./?settings=1&live=1');
  await page.locator('[data-setting=casing]').selectOption('beige');
  await page.locator('[data-setting=mode]').selectOption('vinyl');
  await page.locator('[data-setting=fps]').selectOption('30');
  await page.locator('[data-setting=publicLyrics]').check();
  await page.locator('[data-setting=lowPower]').check();
  await page.reload();
  await expect(page.locator('#app')).toHaveAttribute('data-mode', 'vinyl');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('retrowave-settings-v1')!));
  expect(saved).toMatchObject({ fps: 30, casing: 'beige', publicLyrics: true, lowPower: true });
  await page.locator('#reset-settings').click();
  const reset = await page.evaluate(() => JSON.parse(localStorage.getItem('retrowave-settings-v1')!));
  expect(reset).toMatchObject({ fps: defaults.fps, casing: defaults.casing, mode: defaults.mode, publicLyrics: defaults.publicLyrics, lowPower: defaults.lowPower });
});

// Keep each scenario focused: all toggles still receive real pointer input, reload
// persistence and reset assertions without one scenario monopolizing the CI budget.
for (const [group, keys] of [
  ['CRT effects', ['scanlines', 'curvature', 'aberration']],
  ['surface effects', ['noise', 'glow', 'interference']],
  ['reflections', ['reflections']],
  ['display', ['particles', 'antenna', 'clock']],
  ['lyrics and performance', ['lyrics', 'publicLyrics', 'lowPower']],
] as const) {
  test(`${group} toggles persist and reset individually`, async ({ page }) => {
    await page.goto('./?settings=1&live=1');
    for (const key of keys) await page.locator(`[data-setting=${key}]`).setChecked(!defaults[key]);
    await page.reload();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('retrowave-settings-v1')!));
    const changed = Object.fromEntries(keys.map(key => [key, !defaults[key]]));
    // Read independent checkbox states together to avoid a traced GPU snapshot per assertion.
    const states = () => page.locator('input[type=checkbox][data-setting]').evaluateAll(inputs => Object.fromEntries(inputs.map(input => {
      const checkbox = input as HTMLInputElement;
      return [checkbox.dataset.setting!, checkbox.checked];
    })));
    expect(saved).toMatchObject(changed);
    await expect.poll(states).toMatchObject(changed);
    await page.locator('#reset-settings').click();
    await expect.poll(states).toMatchObject(Object.fromEntries(keys.map(key => [key, defaults[key]])));
  });
}

test('settings remain usable after repeated opening and closing', async ({ page }) => {
  // Five real pointer/keyboard cycles plus traced software-WebGL frames can exceed one minute.
  test.setTimeout(90_000);
  await page.goto('./?settings=1&live=1');
  for (let i = 0; i < 5; i++) {
    await page.locator('#close-settings').click();
    await expect(page.locator('#settings')).toBeHidden();
    await page.keyboard.press('s');
    await expect(page.locator('#settings')).toBeVisible();
  }
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
test('physical dial and selector agree and persist after reload', async ({ page }) => {
  await page.goto('./?live=1');
  const canvas = page.locator('#scene > canvas'); await expect(canvas).toBeVisible();
  const bounds = await page.locator('.tv-viewport').boundingBox();
  // Project the known cabinet pivot using the unchanged default camera.
  const camera = new THREE.PerspectiveCamera(34, bounds!.width / bounds!.height, .1, 80);
  camera.position.set(1.3, 1.2, 15.8); camera.lookAt(0, .5, 0); camera.updateMatrixWorld();
  const pivot = new THREE.Vector3(2.67, .95, 1.65).applyAxisAngle(new THREE.Vector3(0, 1, 0), -.09).project(camera);
  await page.mouse.click(bounds!.x + (pivot.x + 1) * bounds!.width / 2, bounds!.y + (1 - pivot.y) * bounds!.height / 2);
  await expect(page.locator('#app')).toHaveAttribute('data-mode', 'vinyl');
  await page.keyboard.press('s'); await page.locator('[data-setting=mode]').selectOption('broadcast');
  await page.locator('#close-settings').click();
  await expect(page.locator('#channel-number')).toHaveText('01');
  await page.screenshot({ path: 'test-results/channel-broadcast.png' });
  await page.reload(); await expect(page.locator('#app')).toHaveAttribute('data-mode', 'broadcast');
});
test('the channel button preserves its state through ten rapid switches and reload', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('retrowave-settings-v1')) localStorage.setItem('retrowave-settings-v1', JSON.stringify({ mode: 'vinyl' }));
  });
  await page.goto('./?live=1');
  await expect(page.locator('#channel-number')).toHaveText('02');
  // Send real pointer input in one burst while the scene animates.
  await page.locator('#channel-button').click({ clickCount: 9 });
  await expect(page.locator('#channel-number')).toHaveText('01');
  await page.locator('#channel-button').click();
  await expect(page.locator('#channel-number')).toHaveText('02');
  await expect(page.locator('#app')).toHaveAttribute('data-mode', 'vinyl');
  await page.screenshot({ path: 'test-results/channel-vinyl.png' });
  await page.reload(); await expect(page.locator('#app')).toHaveAttribute('data-mode', 'vinyl');
});
