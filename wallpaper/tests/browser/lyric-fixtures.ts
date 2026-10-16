import { expect, type Page } from '@playwright/test';
export const trackId = 'a'.repeat(22);
export const active = '#SpicyLyricsPage .line.Active:not(.bg-line):not(.musical-line)';
export const fixture = { Type: 'Syllable', StartTime: 0, UploadAttribution: { Uploader: { username: 'Test uploader', url: 'https://spicylyrics.org/uid/123' } }, Content: [
  { Type: 'Vocal', Lead: { StartTime: 0, EndTime: 5, Syllables: [{ Text: 'Silver', StartTime: 0, EndTime: 2 }, { Text: 'echoes', StartTime: 2, EndTime: 5 }] } },
  { Type: 'Vocal', Lead: { StartTime: 5, EndTime: 30, Syllables: [{ Text: 'Floating', StartTime: 5, EndTime: 8 }, { Text: 'home', StartTime: 8, EndTime: 30 }] } },
] };
export type Clock = { title?: string; artist?: string; trackId?: string; duration?: number; position: number; isPlaying: boolean; rate?: number; capturedAtUnixMs?: number; lrcLibAllowed?: boolean; status?: string };
export async function signal(page: Page, title = 'Fixture') { await page.evaluate(title => window.livelyCurrentTrack?.(JSON.stringify({ Title: title, Artist: 'Artist' })), title); }
export async function start(page: Page, body: object = fixture, clock: Clock = { position: 1, isPlaying: false, rate: 1 }, key = true) {
  if (key) await page.addInitScript(() => localStorage.setItem('spicy-bond-spicy-key', 'sl_pk_test'));
  await page.route('http://127.0.0.1:43821/**', route => route.fulfill({ json: { title: 'Fixture', artist: 'Artist', trackId, duration: 120, ...clock } }));
  await page.route('https://api.spicylyrics.org/**', route => route.fulfill({ json: { Body: { source: 'spicy_lyrics', ...body } } }));
  await page.route('https://lrclib.net/**', route => route.fulfill({ status: 404, json: {} }));
  await page.goto('./?live=1'); await signal(page);
}
export async function cover(page: Page, color: string) {
  await page.evaluate(color => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 24; const ctx = canvas.getContext('2d')!; ctx.fillStyle = color; ctx.fillRect(0, 0, 24, 24); window.livelyCurrentTrack?.(JSON.stringify({ Title: 'Fixture', Artist: 'Artist', Thumbnail: canvas.toDataURL() })); }, color);
  await expect.poll(() => page.locator('#app').evaluate(el => el.style.getPropertyValue('--cover-1'))).toBe(color);
}
