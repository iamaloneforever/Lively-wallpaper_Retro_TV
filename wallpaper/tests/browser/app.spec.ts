import { expect, test } from '@playwright/test';
test.beforeEach(async ({ page }) => {
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { status: 'no_session' } }));
});
test('production subpath loads a real WebGL scene, demo and controls without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto('./');
  await expect(page.locator('#scene > canvas')).toBeVisible();
  await expect(page.locator('#signal')).toContainText('BROWSER DEMO', { timeout: 10000 });
  await expect(page.locator('#accessible-track')).toContainText('Demo: After the rain');
  const webgl = await page.locator('#scene > canvas').evaluate(canvas => Boolean((canvas as HTMLCanvasElement).getContext('webgl2')));
  expect(webgl).toBe(true);
  await expect(page.getByRole('button')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Find song', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Switch display channel' }).click(); await expect(page.locator('#app')).toHaveAttribute('data-mode', 'vinyl');
  await page.screenshot({ path: 'test-results/desktop.png' }); expect(errors).toEqual([]);
});
test('settings change the cabinet and advance fictional records', async ({ page }) => {
  await page.goto('./');
  await expect(page.locator('#accessible-track')).toContainText('Demo: After the rain', { timeout: 10000 });
  await page.keyboard.press('s');
  await page.locator('[data-setting=casing]').selectOption('beige');
  await expect(page.locator('[data-setting=casing]')).toHaveValue('beige');
  await page.getByRole('button', { name: 'Next fictional record' }).click();
  await expect(page.locator('#accessible-track')).toHaveText('Demo: Midnight on the coast — Juniper FM');
  await page.getByRole('button', { name: 'Toggle television power' }).click(); await expect(page.locator('#power-button')).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Close settings' }).click();
  await expect(page.locator('#settings')).toBeHidden();
});
test('real callbacks replace demo and null metadata restores standby', async ({ page }) => {
  await page.goto('./'); await expect(page.locator('#signal')).toContainText('BROWSER DEMO', { timeout: 10000 });
  await page.evaluate(() => window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Real title <script>', Artist: 'Real artist', AlbumTitle: 'Real album' })));
  await expect(page.locator('#signal')).toContainText('LIVELY CONNECTED'); await expect(page.locator('#accessible-track')).toHaveText('Real title <script> — Real artist');
  await expect(page.locator('#app')).toHaveAttribute('data-source', 'live');
  await page.evaluate(() => { window.livelyAudioListener?.(Array(128).fill(15)); window.livelyCurrentTrack?.('invalid'); });
  await expect(page.locator('#accessible-track')).toContainText('Real title');
  await expect(page.locator('#diagnostics')).toContainText('Live audio callback connected');
  await expect(page.locator('#diagnostics')).not.toContainText('Waiting for real system data');
  await page.evaluate(() => window.livelyCurrentTrack?.('null')); await expect(page.locator('#accessible-track')).toContainText('Standby');
});
test('live-only mode never fabricates metadata, including audio-only hosts', async ({ page }) => {
  await page.goto('./?live=1'); await page.waitForTimeout(3000);
  await expect(page.locator('#app')).toHaveAttribute('data-source', 'waiting'); await expect(page.locator('#accessible-track')).not.toContainText('Demo');
  await page.evaluate(() => window.livelyAudioListener?.(Array(128).fill(0.5)));
  await expect(page.locator('#signal')).toContainText('LIVELY CONNECTED'); await expect(page.locator('#accessible-track')).not.toContainText('Demo');
});
test('responsive controls remain within a narrow viewport and settings persist', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('./');
  await page.keyboard.press('s'); await page.locator('[data-setting=mode]').selectOption('vinyl');
  await page.getByRole('button', { name: 'Close settings' }).click(); await page.reload(); await expect(page.locator('#app')).toHaveAttribute('data-mode', 'vinyl');
  const bounds = await page.locator('.controls').boundingBox(); expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: 'test-results/mobile.png' });
});
test('WebGL context restores and drag rotates the television', async ({ page }) => {
  await page.goto('./'); const canvas = page.locator('#scene > canvas'); await expect(canvas).toBeVisible();
  await canvas.evaluate(c => { const gl = (c as HTMLCanvasElement).getContext('webgl2')!; const extension = gl.getExtension('WEBGL_lose_context'); extension?.loseContext(); setTimeout(() => extension?.restoreContext(), 150); });
  await page.waitForTimeout(500); const b = await canvas.boundingBox(); await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height / 2); await page.mouse.down(); await page.mouse.move(b!.x + b!.width / 2 + 100, b!.y + b!.height / 2); await page.mouse.up();
  await expect(page.locator('#channel-button')).toBeEnabled();
});

test('cover colors drive the background and clear on standby', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./?live=1');
  await page.evaluate(() => {
    const cover = document.createElement('canvas'); cover.width = cover.height = 24;
    const ctx = cover.getContext('2d')!; ctx.fillStyle = '#e03040'; ctx.fillRect(0, 0, 24, 24);
    window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Palette test', Thumbnail: cover.toDataURL('image/png') }));
  });
  await expect.poll(() => page.locator('#app').evaluate(el => el.style.getPropertyValue('--cover-1'))).toBe('#e03040');
  await page.keyboard.press('s');
  const theme = () => page.evaluate(() => {
    const button = getComputedStyle(document.querySelector('#channel-button')!);
    const menu = getComputedStyle(document.querySelector('#settings')!);
    return [getComputedStyle(document.querySelector('#app')!).backgroundImage, button.backgroundColor, button.color, menu.backgroundColor, getComputedStyle(document.querySelector('.switch')!).backgroundColor];
  });
  const firstTheme = await theme();
  await page.evaluate(() => {
    const cover = document.createElement('canvas'); cover.width = cover.height = 24;
    const ctx = cover.getContext('2d')!; ctx.fillStyle = '#2060e0'; ctx.fillRect(0, 0, 24, 24);
    window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Blue cover', Thumbnail: cover.toDataURL('image/png') }));
  });
  await expect.poll(() => page.locator('#app').evaluate(el => el.style.getPropertyValue('--cover-1'))).toBe('#2060e0');
  const secondTheme = await theme();
  secondTheme.forEach((color, i) => expect(color).not.toBe(firstTheme[i]));
  await page.evaluate(() => window.livelyCurrentTrack?.('null'));
  await expect.poll(() => page.locator('#app').evaluate(el => el.style.getPropertyValue('--cover-1'))).toBe('#66583f');
});
