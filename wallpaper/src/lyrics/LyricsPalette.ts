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
  // Prefer a colorful cover swatch, lift its brightness while preserving hue,
  // then add only the white necessary to keep dark colors readable.
  const score = (color: string) => {
    const channels = rgb(color), max = Math.max(...channels), min = Math.min(...channels);
    return (max ? (max - min) / max : 0) * .7 + max / 255 * .3;
  };
  const accent = [...palette].sort((a, b) => score(b) - score(a))[0];
  const channels = rgb(accent), peak = Math.max(...channels);
  const lifted = '#' + channels.map(value => Math.round(peak ? value * Math.max(1, 215 / peak) : 135).toString(16).padStart(2, '0')).join('');
  let coverInk = lifted;
  for (let white = .05; luminance(coverInk) < .24 && white <= 1; white += .05) coverInk = mixColor(lifted, '#ffffff', white);
  const ink = neutral ? '#f5f5f1' : coverInk;
  const highlight = neutral ? '#ffffff' : mixColor(ink, '#ffffff', .18);
  // Use a conservative upper bound for the album backdrop. Its actual gradients
  // are darker; this also handles warm and saturated covers without hue guesses.
  const backdrop = '#' + [0, 1, 2].map(i => Math.max(...palette.map(color => rgb(color)[i])).toString(16).padStart(2, '0')).join('');
  let opacity = 0;
  while ((luminance(ink) + .05) / (luminance(mixColor(backdrop, '#080b0b', opacity)) + .05) < 4.5 && opacity < .95) opacity += .05;
  return { ink, highlight, scrim: `rgba(8,11,11,${Math.min(.95, opacity).toFixed(2)})` };
}
