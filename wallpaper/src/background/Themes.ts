export const effectTypes = ['dust', 'sparkles', 'embers', 'rain', 'bokeh', 'fireflies'] as const;
/** Order is the shader environment index. Keep IDs stable for saved preferences. */
export const themes = [
  { id: 'synthwave', name: 'Synthwave / Retrowave', effects: { dust: .25, sparkles: .6, embers: .15 }, speed: 0.65, atmosphere: 'Neon glints · drifting dust · receding light streaks' },
  { id: 'electronic', name: 'Electronic / EDM', effects: { sparkles: .65, dust: .15, bokeh: .2 }, speed: 1, atmosphere: 'Orbital sparkles · digital halos · bokeh' },
  { id: 'pop', name: 'Pop', effects: { sparkles: .45, bokeh: .45, dust: .1 }, speed: 0.8, atmosphere: 'Confetti glints · bokeh · ribbon trails' },
  { id: 'rock', name: 'Rock / Metal', effects: { embers: .6, dust: .3, sparkles: .1 }, speed: 0.9, atmosphere: 'Embers · ash · restrained electrical arcs' },
  { id: 'hiphop', name: 'Hip-Hop / Rap', effects: { embers: .25, sparkles: .3, dust: .45 }, speed: 0.65, atmosphere: 'Bass-lit dust · sparks · graphic light bars' },
  { id: 'jazz', name: 'Jazz / Blues', effects: { dust: .7, bokeh: .25, sparkles: .05 }, speed: 0.3, atmosphere: 'Soft dust · velvet smoke · wandering spotlights' },
  { id: 'classical', name: 'Classical', effects: { dust: .55, sparkles: .45 }, speed: 0.22, atmosphere: 'Suspended motes · slow light rays' },
  { id: 'ambient', name: 'Ambient / Chill', effects: { dust: .5, fireflies: .4, sparkles: .1 }, speed: 0.2, atmosphere: 'Fireflies · drifting dust · aurora wisps' },
  { id: 'lofi', name: 'Lo-Fi', effects: { rain: .5, dust: .4, bokeh: .1 }, speed: 0.25, atmosphere: 'Gentle rain · dust · distant bokeh' },
  { id: 'soul', name: 'R&B / Soul', effects: { bokeh: .5, dust: .35, sparkles: .15 }, speed: 0.4, atmosphere: 'Liquid highlights · soft bokeh · drifting dust' },
  { id: 'indie', name: 'Indie / Alternative', effects: { dust: .4, fireflies: .4, sparkles: .2 }, speed: 0.45, atmosphere: 'Fireflies · organic drifting dust · textured light' },
] as const;
export const particleStyles = ['auto', ...effectTypes] as const;
export type ParticleStyle = typeof particleStyles[number];
export const isParticleStyle = (value: unknown): value is ParticleStyle => particleStyles.some(style => style === value);
export type ThemeId = typeof themes[number]['id'];
export const isThemeId = (value: unknown): value is ThemeId => themes.some(theme => theme.id === value);

// Specific subgenres precede their broader families; boundaries avoid matching “trap” in “soundtrack”.
const aliases: readonly [ThemeId, RegExp][] = [
  ['lofi', /\b(lo fi|lofi|chillhop)\b/],
  ['synthwave', /\b(synthwave|retrowave|synth wave|retro wave|outrun|darksynth|dreamwave|vaporwave|synthpop|synth pop|new wave)\b/],
  ['ambient', /\b(ambient|chill|chillout|downtempo|meditation|new age)\b/],
  ['soul', /\b(r and b|r b|rnb|soul|neo soul|motown)\b/],
  ['hiphop', /\b(hip hop|hiphop|rap|trap|drill|grime|boom bap)\b/],
  ['jazz', /\b(jazz|blues|bebop|swing|bossa nova)\b/],
  ['classical', /\b(classical|orchestral|orchestra|baroque|opera|chamber|symphony|symphonies|soundtrack|score)\b/],
  ['indie', /\b(indie|alternative|art rock|shoegaze|dream pop|post rock)\b/],
  ['rock', /\b(rock|metal|punk|grunge|hardcore)\b/],
  ['electronic', /\b(electronic|electronica|edm|house|techno|trance|dubstep|drum and bass|dnb|dance|garage|breakbeat|electro)\b/],
  ['pop', /\b(pop|k pop|j pop|disco|dancehall|reggaeton)\b/],
];
export function normalizeGenre(genres: readonly string[]): ThemeId | null {
  for (const genre of genres.slice(0, 30)) {
    const normalized = genre.slice(0, 160).normalize('NFKD').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
    for (const [id, pattern] of aliases) if (pattern.test(normalized)) return id;
  }
  return null;
}
