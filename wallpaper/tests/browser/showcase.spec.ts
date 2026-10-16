import { test, expect } from '@playwright/test';
import { brand } from '../../src/core/Brand';

test('desktop showcase uses the current identity, media and playable 30 fps demo', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('./showcase/');
  await expect(page).toHaveTitle(`${brand.name} — In motion`);
  await expect(page.locator('nav .identity')).toHaveText(brand.name);
  await expect(page.locator('.cover')).toHaveAttribute('alt', `${brand.name} — ${brand.tagline} For Windows`);
  await expect(page.getByRole('link', { name: 'Get it for Windows' })).toHaveAttribute('href', `${brand.repository}/releases/latest`);
  expect(await page.locator('h1').evaluate(element => getComputedStyle(element).fontFamily)).toContain('Arial');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
  for (const image of await page.locator('img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
    const ratios = await image.evaluate(element => {
      const image = element as HTMLImageElement, box = image.getBoundingClientRect();
      return [box.width / box.height, image.naturalWidth / image.naturalHeight];
    });
    expect(ratios[0]).toBeCloseTo(ratios[1], 2);
  }
  const video = page.locator('video');
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).duration)).toBe(12);
  expect(await video.evaluate(element => [(element as HTMLVideoElement).videoWidth, (element as HTMLVideoElement).videoHeight])).toEqual([960, 540]);
  await video.evaluate(element => { (element as HTMLVideoElement).currentTime = 8.4; });
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).seeking)).toBe(false);
  expect(await video.evaluate(element => (element as HTMLVideoElement).currentTime)).toBeCloseTo(8.4, 1);
  await video.evaluate(element => { (element as HTMLVideoElement).currentTime = 9.2; });
  await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).seeking)).toBe(false);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/spicy-bond-showcase.png', fullPage: true });
});
