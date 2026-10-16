import { expect, test } from '@playwright/test';

test('desktop mouse moves without button flags drag sliders and scrolling; dropdown choices need no native popup', async ({ page }) => {
  test.setTimeout(120_000);
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { status: 'no_session' } }));
  await page.goto('./?live=1&settings=1');
  const content = page.locator('.settings-content');
  await page.getByRole('button', { name: 'Scroll settings down' }).click();
  await expect.poll(() => content.evaluate(element => element.scrollTop)).toBeGreaterThan(100);
  await page.getByRole('button', { name: 'Scroll settings up' }).click();
  const select = page.locator('[data-setting=casing]'); await select.click();
  await page.locator('.settings-options').getByRole('option', { name: 'Aged ivory', exact: true }).click();
  await expect(select).toHaveValue('beige');
  const slider = page.locator('[data-setting=brightness]'); await slider.scrollIntoViewIfNeeded();
  // Lively forwards coordinates with buttons=0 during a drag. Native range dragging does not work in that stream.
  await slider.evaluate(element => {
    const bounds = element.getBoundingClientRect(), y = bounds.y + bounds.height / 2;
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, buttons: 1, clientX: bounds.x + 10, clientY: y }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, buttons: 0, clientX: bounds.right - 10, clientY: y }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, clientX: bounds.right - 10, clientY: y }));
  });
  expect(Number(await slider.inputValue())).toBeGreaterThan(1.3);
  const rail = page.getByRole('scrollbar', { name: 'Scroll settings' });
  await rail.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, clientX: bounds.x + 5, clientY: bounds.y + 10 }));
    document.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, buttons: 0, clientX: bounds.x + 5, clientY: bounds.bottom - 10 }));
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await expect(page.locator('#reset-settings')).toBeInViewport();
});

test('paired starter and library exports use the companion; shader preview toggles and keeps the atmosphere', async ({ page }) => {
  test.setTimeout(180_000);
  const exports: { name: string; file: { effects: { id: string; replace: boolean }[] } }[] = [];
  await page.route('http://127.0.0.1:43821/**', route => {
    if (route.request().url().endsWith('/effect-export')) {
      exports.push(route.request().postDataJSON());
      return route.fulfill({ json: { path: 'C:\\RetroWave\\exports\\effect.json' } });
    }
    return route.fulfill({ json: { status: 'no_session' } });
  });
  await page.addInitScript(() => localStorage.setItem('retrowave-settings-v1', JSON.stringify({ reducedMotion: true })));
  await page.goto(`./?live=1&settings=1#bridge=${'a'.repeat(64)}`);
  await page.locator('#custom-effect-starter').click();
  await expect(page.locator('#custom-effect-feedback')).toContainText('Saved JSON:'); expect(exports[0].file.effects[0].replace).toBe(false);
  await page.locator('#custom-effect-file').setInputFiles({ name: 'test.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ version: 1, effects: [{ id: 'test', name: 'Test shader', replace: true, match: { titles: ['Other song'], artists: ['Artist'] }, shader: 'vec4 effect(vec2 uv){return vec4(1.,1.,1.,.2);}' }] })) });
  await expect(page.locator('#custom-effect-feedback')).toContainText('Imported');
  await page.getByRole('button', { name: 'Preview Test shader', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-custom-effect', 'test');
  await expect(page.getByRole('button', { name: 'Stop preview Test shader', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Stop preview Test shader', exact: true }).click();
  await expect(page.locator('#app')).toHaveAttribute('data-custom-effect', '');
  await expect(page.locator('#custom-effects-overlay')).toBeChecked();
  await page.locator('#custom-effect-export').click();
  await expect.poll(() => exports.length).toBe(2); expect(exports[1].file.effects[0].id).toBe('test');
});
