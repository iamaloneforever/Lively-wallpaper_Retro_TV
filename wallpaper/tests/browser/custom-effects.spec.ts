import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { effectStorageKey, shapes } from '../../src/background/CustomEffects';

const effect = (id = 'my-effect', extra: Record<string, unknown> = {}) => ({
  id, name: `Effect ${id}`, match: { titles: ['My Song'], artists: ['My Artist'] },
  layers: [{ type: 'circle', x: .08, y: .9, size: .12, color: '#ff22dd', opacity: .9 }], ...extra,
});
const uploadText = (page: Page, text: string) => page.locator('#custom-effect-file').setInputFiles({ name: 'effect.json', mimeType: 'application/json', buffer: Buffer.from(text) });
const upload = (page: Page, effects: Record<string, unknown>[]) => uploadText(page, JSON.stringify({ version: 1, effects }));
const setTrack = (page: Page, title = 'My Song', artist = 'My Artist') => page.evaluate(row => window.livelyCurrentTrack?.(JSON.stringify(row)), { Title: title, Artist: artist });
const active = (page: Page) => page.locator('#app').getAttribute('data-custom-effect');
const saved = (page: Page) => page.evaluate(key => localStorage.getItem(key), effectStorageKey);

test.beforeEach(async ({ page }) => {
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { status: 'no_session' } }));
  await page.addInitScript(() => {
    localStorage.setItem('spicy-bond-settings-v1', JSON.stringify({ reducedMotion: true, transitionDuration: .3, analogIntensity: 0, particles: false, clock: false, noise: false }));
    const locations = new WeakMap<WebGLUniformLocation, string>();
    const customPrograms = new WeakSet<WebGLProgram>(); let custom = false;
    const prototype = WebGL2RenderingContext.prototype, get = prototype.getUniformLocation, set = prototype.uniform1f;
    const use = prototype.useProgram, draw = prototype.drawElements;
    prototype.getUniformLocation = function(program, name) {
      const location = get.call(this, program, name);
      if (location) locations.set(location, name);
      if (location && name === 'uOpacity') customPrograms.add(program);
      return location;
    };
    prototype.uniform1f = function(location, value) {
      if (location && locations.get(location) === 'uTime') (window as unknown as { customTime: number }).customTime = value;
      return set.call(this, location, value);
    };
    prototype.useProgram = function(program) { custom = !!program && customPrograms.has(program); return use.call(this, program); };
    prototype.drawElements = function(mode, count, type, offset) {
      if (custom) {
        const metrics = window as unknown as { customDraws?: number }; metrics.customDraws = (metrics.customDraws || 0) + 1;
      }
      return draw.call(this, mode, count, type, offset);
    };
  });
});

test('imports, visibly renders, matches recordings, exports and persists an effect', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('./?live=1&settings=1');
  await setTrack(page);
  await upload(page, [effect()]);
  await expect(page.locator('#custom-effect-feedback')).toContainText('Imported 1 effect');
  await expect.poll(() => active(page)).toBe('my-effect');
  await page.locator('#close-settings').click();
  const withEffect = await page.screenshot({ clip: { x: 0, y: 0, width: 140, height: 130 } });
  await page.keyboard.press('s');
  await page.locator('#custom-effects-enabled').uncheck();
  await expect.poll(() => active(page)).toBe('');
  await page.locator('#close-settings').click();
  const withoutEffect = await page.screenshot({ clip: { x: 0, y: 0, width: 140, height: 130 } });
  expect(withEffect.equals(withoutEffect)).toBe(false);
  await page.keyboard.press('s'); await page.locator('#custom-effects-enabled').check();
  await setTrack(page, 'My Song (Live) - 2024 Remaster', 'Guest; My Artist');
  await expect.poll(() => active(page)).toBe('my-effect');
  await setTrack(page, 'My Song', 'My Artist Tribute');
  await expect.poll(() => active(page)).toBe('');
  await page.getByRole('button', { name: 'Preview Effect my-effect', exact: true }).click();
  await expect(page.locator('#custom-effect-status')).toContainText('Previewing');
  await expect.poll(() => active(page)).toBe('my-effect');
  await page.locator('#custom-effect-stop').click(); await expect.poll(() => active(page)).toBe('');
  const download = page.waitForEvent('download'); await page.locator('#custom-effect-export').click();
  const exported = await download;
  expect(exported.suggestedFilename()).toBe('spicy-bond-effects.json');
  const path = await exported.path(); expect(JSON.parse(readFileSync(path!, 'utf8')).effects[0].id).toBe('my-effect');
  await page.reload(); await setTrack(page);
  await expect.poll(() => active(page)).toBe('my-effect');
  await page.getByRole('button', { name: 'Disable Effect my-effect', exact: true }).click();
  await expect.poll(() => active(page)).toBe('');
  await page.reload(); await setTrack(page); await expect.poll(() => active(page)).toBe('');
  await page.getByRole('button', { name: 'Enable Effect my-effect', exact: true }).click();
  await expect.poll(() => active(page)).toBe('my-effect');
  await page.getByRole('button', { name: 'Remove Effect my-effect', exact: true }).click();
  await expect.poll(() => active(page)).toBe('');
  expect(errors).toEqual([]);
});

test('invalid JSON, values, shader programs and storage failure preserve the working library', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('./?live=1&settings=1'); await setTrack(page); await upload(page, [effect()]);
  await expect.poll(() => active(page)).toBe('my-effect');
  const original = await saved(page);
  for (const [text, message] of [
    ['{', 'invalid JSON'],
    [JSON.stringify({ version: 1, effects: [effect('bad', { layers: [{ type: 'ring', scaleX: 0 }] })] }), 'scaleX'],
    [JSON.stringify({ version: 1, effects: [effect('bad', { layers: undefined, shader: 'vec4 effect(vec2 uv){return unknownFunction(uv);}' })] }), 'shader could not compile'],
  ]) {
    await uploadText(page, text);
    await expect(page.locator('#custom-effect-feedback')).toContainText(message);
    expect(await saved(page)).toBe(original); expect(await active(page)).toBe('my-effect');
  }
  await page.evaluate(key => {
    const set = Storage.prototype.setItem;
    Storage.prototype.setItem = function(name, value) { if (name === key) throw new DOMException('Full', 'QuotaExceededError'); set.call(this, name, value); };
  }, effectStorageKey);
  await upload(page, [effect('new')]);
  await expect(page.locator('#custom-effect-feedback')).toContainText('Could not save effects');
  expect(await saved(page)).toBe(original); expect(await active(page)).toBe('my-effect');
  expect(errors).toEqual([]);
});

test('all shape types and expert shaders compile at wide and narrow sizes', async ({ page }) => {
  test.setTimeout(90_000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('./?live=1&settings=1'); await setTrack(page);
  const layers = shapes.map((type, index) => ({ type, count: 6, x: .1 + index * .12, size: .03, rotation: { keyframes: [[0, 0], [10, 360]], loop: true }, opacity: { value: .4, audio: 'bass', amount: .3 } }));
  await upload(page, [effect('all-shapes', { layers })]);
  await expect(page.locator('#custom-effect-feedback')).toContainText('Imported 1 effect');
  await expect.poll(() => active(page)).toBe('all-shapes');
  const shader = JSON.parse(readFileSync('wallpaper/public/effects/aurora-shader.json', 'utf8')).effects[0];
  await upload(page, [{ ...shader, match: { titles: ['My Song'], artists: ['My Artist'] } }]);
  await expect.poll(() => active(page)).toBe('custom-aurora');
  for (const width of [420, 960]) { await page.setViewportSize({ width, height: 540 }); await page.screenshot({ path: `test-results/custom-aurora-${width}.png` }); }
  expect(errors).toEqual([]);
});

test('custom shaders respect animation and system reduced-motion controls', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  // Timing/state checks need a small software-WebGL framebuffer; the compile case covers both layout sizes.
  await page.setViewportSize({ width: 640, height: 360 });
  await page.goto('./?live=1&settings=1'); await setTrack(page);
  const shader = JSON.parse(readFileSync('wallpaper/public/effects/aurora-shader.json', 'utf8')).effects[0];
  await upload(page, [{ ...shader, match: { titles: ['My Song'], artists: ['My Artist'] } }]);
  await expect.poll(() => active(page)).toBe('custom-aurora');
  const time = () => page.evaluate(() => (window as unknown as { customTime: number }).customTime);
  await page.locator('[data-setting=reducedMotion]').uncheck();
  await expect.poll(time).toBeGreaterThan(.05);
  await page.locator('[data-setting=backgroundAnimation]').uncheck();
  await page.waitForTimeout(100); const frozen = await time(); await page.waitForTimeout(150); expect(await time()).toBe(frozen);
  await page.locator('[data-setting=backgroundAnimation]').check();
  await expect.poll(time).toBeGreaterThan(frozen);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(100); const reduced = await time(); await page.waitForTimeout(150); expect(await time()).toBe(reduced);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect.poll(time).toBeGreaterThan(reduced);
  expect(errors).toEqual([]);
});

test('custom shaders restart on recording changes and stop drawing in standby', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  // Timing/state checks need a small software-WebGL framebuffer; the compile case covers both layout sizes.
  await page.setViewportSize({ width: 640, height: 360 });
  await page.goto('./?live=1&settings=1'); await setTrack(page);
  const shader = JSON.parse(readFileSync('wallpaper/public/effects/aurora-shader.json', 'utf8')).effects[0];
  await upload(page, [{ ...shader, match: { titles: ['My Song'], artists: ['My Artist'] } }]);
  await expect.poll(() => active(page)).toBe('custom-aurora');
  const time = () => page.evaluate(() => (window as unknown as { customTime: number }).customTime);
  await page.locator('[data-setting=reducedMotion]').uncheck(); await expect.poll(time).toBeGreaterThan(.05);
  await page.locator('[data-setting=reducedMotion]').check();
  await setTrack(page, 'Other song'); await expect.poll(() => active(page)).toBe('');
  await setTrack(page); await expect.poll(() => active(page)).toBe('custom-aurora');
  await expect.poll(time).toBe(0);
  const draws = () => page.evaluate(() => (window as unknown as { customDraws: number }).customDraws);
  await page.locator('#power-button').click();
  await page.waitForTimeout(150); const standby = await draws(); await page.waitForTimeout(150); expect(await draws()).toBe(standby);
  await page.locator('#power-button').click(); await expect.poll(draws).toBeGreaterThan(standby);
  expect(errors).toEqual([]);
});

test('downloads a starter for current metadata and ships usable authoring examples', async ({ page, request }) => {
  test.setTimeout(60_000);
  await page.goto('./?live=1&settings=1'); await setTrack(page);
  const download = page.waitForEvent('download'); await page.locator('#custom-effect-starter').click();
  const path = await (await download).path();
  const starter = JSON.parse(readFileSync(path!, 'utf8'));
  expect(starter.effects[0].match).toMatchObject({ titles: ['My Song'], artists: ['My Artist'] });
  await uploadText(page, JSON.stringify(starter));
  await expect.poll(() => active(page)).toBe('my-song-effect');
  for (const name of ['guide.html', 'effect.schema.json', 'neon-orbit.json', 'aurora-shader.json']) {
    const response = await request.get(`effects/${name}`); expect(response.status()).toBe(200);
  }
});
