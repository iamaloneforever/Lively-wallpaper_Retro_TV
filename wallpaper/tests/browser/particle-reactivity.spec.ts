import { expect, test } from '@playwright/test';
import { particleVisibility } from '../../src/background/ParticleMotion';

test('audio bursts produce bounded, continuous particle motion and zero sensitivity disables pulses', async ({ page }) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { status: 'no_session' } }));
  await page.addInitScript(() => {
    localStorage.setItem('spicy-bond-settings-v1', JSON.stringify({ manualTheme: 'rock', particleStyle: 'embers', performancePreset: 'low', fps: 30 }));
    const state = { bass: 0, treble: 0, samples: [] as { positions: number[]; bass: number; treble: number }[] };
    (window as unknown as { atmosphereAudio: typeof state }).atmosphereAudio = state;
    const names = new WeakMap<WebGLUniformLocation, string>();
    const prototype = WebGL2RenderingContext.prototype;
    const location = prototype.getUniformLocation, vector = prototype.uniform3f, upload = prototype.bufferSubData;
    prototype.getUniformLocation = function(program, name) {
      const result = location.call(this, program, name); if (result) names.set(result, name); return result;
    };
    prototype.uniform3f = function(uniform, x, y, z) {
      if (uniform && names.get(uniform) === 'bands') { state.bass = x; state.treble = z; }
      vector.call(this, uniform, x, y, z);
    };
    prototype.bufferSubData = function(target: number, offset: number, data: AllowSharedBufferSource | ArrayBufferView, ...rest: number[]) {
      // The dynamic position buffer is the actual input to the particle vertex shader.
      if (target === this.ARRAY_BUFFER && data instanceof Float32Array && data.length === 768 * 3) {
        state.samples.push({ positions: Array.from(data.slice(0, 96 * 3)), bass: state.bass, treble: state.treble });
      }
      Reflect.apply(upload, this, [target, offset, data, ...rest]);
    };
  });
  await page.goto('./?live=1');
  await expect(page.locator('#app')).toHaveAttribute('data-theme', 'rock');
  const background = await page.locator('#app').evaluate(element => getComputedStyle(element).backgroundImage);
  const result = await page.evaluate(async () => {
    const state = (window as unknown as { atmosphereAudio: { bass: number; treble: number; samples: { positions: number[]; bass: number; treble: number }[] } }).atmosphereAudio;
    state.samples.length = 0;
    for (let i = 0; i < 36; i++) {
      window.livelyAudioListener?.(Array(128).fill(i % 6 < 3 ? 1 : 0));
      if (i % 6 === 0) {
        const input = document.querySelector<HTMLSelectElement>('[data-setting=particleStyle]')!;
        input.value = ['embers', 'sparkles', 'rain', 'dust', 'bokeh', 'fireflies'][i / 6];
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      await new Promise(requestAnimationFrame);
    }
    return state.samples;
  });
  expect(result.length).toBeGreaterThan(3);
  expect(result.some(sample => sample.bass > 0)).toBe(true);
  let visibleMotion = 0;
  for (let i = 1; i < result.length; i++) {
    for (let p = 0; p < result[i].positions.length; p += 3) {
      const [x, y] = result[i].positions.slice(p, p + 2), [previousX, previousY] = result[i - 1].positions.slice(p, p + 2);
      if (particleVisibility(x, y) > 0 || particleVisibility(previousX, previousY) > 0) {
        const distance = Math.hypot(x - previousX, y - previousY);
        visibleMotion = Math.max(visibleMotion, distance);
        expect(distance).toBeLessThan(.0015);
      }
    }
    expect(Math.abs(result[i].bass - result[i - 1].bass)).toBeLessThan(.14);
    expect(result[i].treble).toBeLessThan(.55);
  }
  expect(visibleMotion).toBeGreaterThan(.000001);
  await page.locator('[data-setting=reactivity]').evaluate(element => {
    (element as HTMLInputElement).value = '0'; element.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await expect.poll(() => page.evaluate(() => (window as unknown as { atmosphereAudio: { bass: number } }).atmosphereAudio.bass)).toBe(0);
  expect(await page.locator('#app').evaluate(element => getComputedStyle(element).backgroundImage)).toBe(background);
  expect(errors).toEqual([]);
});
