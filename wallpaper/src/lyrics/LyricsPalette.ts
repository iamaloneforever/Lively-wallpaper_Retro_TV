import { mixColor } from '../music/Theme';

const fallback = '#66583f';
const valid = (color: string) => /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
const rgb = (color: string) => [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
export function luminance(color: string): number {
  const linear = rgb(valid(color)).map(value => { const c = value / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; });
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
}
export function lyricPalette(colors: string[], neutral: boolean): { ink: string; highlight: string; scrim: string } {
  const palette = colors.length ? colors.map(valid) : [fallback];
  const ink = neutral ? '#f5f5f1' : mixColor(palette[0], '#ffffff', .9);
  const highlight = neutral ? '#ffffff' : mixColor(palette[2] || palette[0], '#ffffff', .95);
  // Use a conservative upper bound for the album backdrop. Its actual gradients
  // are darker; this also handles warm and saturated covers without hue guesses.
  const backdrop = '#' + [0, 1, 2].map(i => Math.max(...palette.map(color => rgb(color)[i])).toString(16).padStart(2, '0')).join('');
  let opacity = 0;
  while ((luminance(ink) + .05) / (luminance(mixColor(backdrop, '#080b0b', opacity)) + .05) < 4.5 && opacity < .8) opacity += .05;
  return { ink, highlight, scrim: `rgba(8,11,11,${Math.min(.8, opacity).toFixed(2)})` };
}
