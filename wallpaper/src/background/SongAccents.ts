import type { Track } from '../lively/types';

/** Metadata-only easter eggs. Titles alone never trigger an artist's signature effect. */
export const songAccents = [
  { id: 'blinding-lights', artist: 'The Weeknd', titles: ['Blinding Lights'], effect: 'headlights', description: 'Distant light trails in the cover colors sweep along the horizon.' },
  { id: 'take-on-me', artist: 'a-ha', titles: ['Take On Me'], effect: 'sketch', description: 'A hand-drawn pencil halo traces and dissolves at the edges.' },
  { id: 'midnight-city', artist: 'M83', titles: ['Midnight City'], effect: 'skyline', description: 'A tiny outline city wakes up along the distant horizon.' },
  { id: 'space-oddity', artist: 'David Bowie', titles: ['Space Oddity'], effect: 'orbit', description: 'A lone satellite crosses a quiet orbital path.' },
  { id: 'riders-on-the-storm', artist: 'The Doors', titles: ['Riders on the Storm'], effect: 'storm', description: 'A slow, low-contrast cloud glow moves at the edges.' },
  { id: 'clair-de-lune', artist: 'Claude Debussy', titles: ['Clair de Lune', 'Suite bergamasque: III. Clair de lune'], effect: 'moon', description: 'A silver moon halo emerges above suspended dust.' },
  { id: 'blue-in-green', artist: 'Miles Davis', titles: ['Blue in Green'], effect: 'ripples', description: 'Rings in the cover colors drift through the warm atmosphere.' },
] as const;
export const accentEffects = ['none', 'headlights', 'sketch', 'skyline', 'orbit', 'storm', 'moon', 'ripples'] as const;
export type SongAccent = typeof songAccents[number];
const normalize = (value: string) => value.normalize('NFKD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const title = (value: string) => normalize(value.replace(/\s*[-–—(\[]\s*(?:\d{4}\s+)?remaster(?:ed)?(?:\s+\d{4})?[)\]]?\s*$/i, ''));
export function matchSongAccent(track: Track | null): SongAccent | null {
  if (!track) return null;
  const artist = normalize(track.artist || track.albumArtist), name = title(track.title);
  return songAccents.find(rule => normalize(rule.artist) === artist && rule.titles.some(alias => title(alias) === name)) ?? null;
}
