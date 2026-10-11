export type ArtworkPalette = [string, string, string];
export const standbyPalette: ArtworkPalette = ['#66583f', '#31473c', '#333d43'];
/** Quantized dominant colors sampled once per cover. */
export function extractPalette(pixels: Uint8ClampedArray): ArtworkPalette {
  const bins = new Map<string, { count: number; sum: number[] }>();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 128) continue;
    const rgb = [pixels[i], pixels[i + 1], pixels[i + 2]];
    const key = rgb.map(v => Math.floor(v / 32)).join(',');
    const bin = bins.get(key) || { count: 0, sum: [0, 0, 0] };
    bin.count++; rgb.forEach((v, j) => { bin.sum[j] += v; }); bins.set(key, bin);
  }
  const ranked = [...bins.values()].sort((a, b) => b.count - a.count).map(bin => bin.sum.map(v => Math.round(v / bin.count)));
  if (!ranked.length) return [...standbyPalette];
  const colors: number[][] = [];
  for (const rgb of ranked) {
    if (colors.every(color => rgb.reduce((distance, value, i) => distance + Math.abs(value - color[i]), 0) > 70)) colors.push(rgb);
    if (colors.length === 3) break;
  }
  while (colors.length < 3) colors.push(colors[0].map(v => Math.round(v * (colors.length === 1 ? 0.65 : 0.4))));
  return colors.map(rgb => `#${rgb.map(v => v.toString(16).padStart(2, '0')).join('')}`) as ArtworkPalette;
}
