import { expect, test } from '@playwright/test';

test('audio bursts produce bounded, continuous particle motion and zero sensitivity disables pulses', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { status: 'no_session' } }));
  await page.addInitScript(() => {
    localStorage.setItem('retrowave-settings-v1', JSON.stringify({ manualTheme: 'rock', particleStyle: 'embers', performancePreset: 'low', fps: 30 }));
    const state = { bass: 0, treble: 0, samples: [] as { phase: number; bass: number; treble: number }[] };
    (window as unknown as { atmosphereAudio: typeof state }).atmosphereAudio = state;
    const names = new WeakMap<WebGLUniformLocation, string>();
    const prototype = WebGL2RenderingContext.prototype;
    const location = prototype.getUniformLocation, vector = prototype.uniform3f, scalar = prototype.uniform1f;
    prototype.getUniformLocation = function(program, name) {
      const result = location.call(this, program, name); if (result) names.set(result, name); return result;
    };
    prototype.uniform3f = function(uniform, x, y, z) {
      if (uniform && names.get(uniform) === 'bands') { state.bass = x; state.treble = z; }
      vector.call(this, uniform, x, y, z);
    };
    prototype.uniform1f = function(uniform, value) {
      if (uniform && names.get(uniform) === 'emberTime') state.samples.push({ phase: value, bass: state.bass, treble: state.treble });
      scalar.call(this, uniform, value);
    };
  });
  await page.goto('./?live=1');
  await expect(page.locator('#app')).toHaveAttribute('data-theme', 'rock');
  const background = await page.locator('#app').evaluate(element => getComputedStyle(element).backgroundImage);
  const result = await page.evaluate(async () => {
    const state = (window as unknown as { atmosphereAudio: { bass: number; treble: number; samples: { phase: number; bass: number; treble: number }[] } }).atmosphereAudio;
    state.samples.length = 0;
    for (let i = 0; i < 36; i++) {
      window.livelyAudioListener?.(Array(128).fill(i % 6 < 3 ? 1 : 0));
      await new Promise(requestAnimationFrame);
    }
    return state.samples;
  });
  expect(result.length).toBeGreaterThan(3);
  expect(result.some(sample => sample.bass > 0)).toBe(true);
  for (let i = 1; i < result.length; i++) {
    expect(result[i].phase - result[i - 1].phase).toBeGreaterThanOrEqual(0);
    expect(result[i].phase - result[i - 1].phase).toBeLessThan(.07);
    expect(Math.abs(result[i].bass - result[i - 1].bass)).toBeLessThan(.14);
    expect(result[i].treble).toBeLessThan(.55);
  }
  await page.locator('[data-setting=reactivity]').evaluate(element => {
    (element as HTMLInputElement).value = '0'; element.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { atmosphereAudio: { bass: number } }).atmosphereAudio.bass)).toBe(0);
  expect(await page.locator('#app').evaluate(element => getComputedStyle(element).backgroundImage)).toBe(background);
  expect(errors).toEqual([]);
});
