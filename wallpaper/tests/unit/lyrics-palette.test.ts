import { expect, it } from 'vitest';
import { lyricPalette, luminance } from '../../src/lyrics/LyricsPalette';
import { mixColor } from '../../src/music/Theme';

it('keeps active ink above 4.5:1 even against the brightest album backdrop', () => {
  for (const cover of ['#ffffff', '#080909', '#ff0000', '#ffdd00', '#00ff00', '#0000ff']) {
    const palette = lyricPalette([cover, cover, cover], false);
    const opacity = Number(palette.scrim.match(/,([\d.]+)\)$/)![1]);
    const contrast = (luminance(palette.ink) + .05) / (luminance(mixColor(cover, '#080b0b', opacity)) + .05);
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  }
});
it('provides stable neutral colors and a safe fallback for malformed palettes', () => {
  expect(lyricPalette(['#ff0000'], true).ink).toBe('#f5f5f1');
  expect(lyricPalette(['#0000ff'], true).highlight).toBe('#ffffff');
  expect(lyricPalette([], false)).toEqual(lyricPalette(['invalid'], false));
});
