import { describe, expect, it } from 'vitest';
import { extractPalette, standbyPalette } from '../../src/music/ArtworkPalette';

describe('album cover palette', () => {
  it('keeps dominant distinct cover colors rather than averaging them together', () => {
    const pixels = new Uint8ClampedArray([...Array(10).fill([220, 30, 40, 255]).flat(), ...Array(5).fill([20, 80, 200, 255]).flat(), 230, 200, 30, 255]);
    expect(extractPalette(pixels)).toEqual(['#dc1e28', '#1450c8', '#e6c81e']);
  });
  it('uses standby colors when the artwork is fully transparent', () => {
    expect(extractPalette(new Uint8ClampedArray([255, 0, 0, 0]))).toEqual(standbyPalette);
  });
  it('provides three valid shades for monochrome artwork', () => {
    const palette = extractPalette(new Uint8ClampedArray([200, 100, 50, 255]));
    expect(palette[0]).toBe('#c86432'); expect(new Set(palette).size).toBe(3);
    palette.forEach(color => expect(color).toMatch(/^#[0-9a-f]{6}$/));
  });
});
