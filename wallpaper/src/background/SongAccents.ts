import type { Track } from '../lively/types';

export const accentEffects = [
  'none', 'headlights', 'sketch', 'skyline', 'orbit', 'storm', 'moon', 'ripples',
  'shooting-stars', 'blooms', 'rain-curtain', 'lightning', 'globe', 'circuit', 'clock',
  'prism', 'sunrise', 'petals', 'snow', 'waves', 'vinyl', 'bouncing-tv', 'disco',
] as const;
interface SongAccentRule {
  id: string; artist: string; artists?: readonly string[]; titles: readonly string[];
  effect: typeof accentEffects[number]; description: string;
}

/** Metadata-only easter eggs. Titles alone never trigger an artist's signature effect. */
export const songAccents = [
  { id: 'blinding-lights', artist: 'The Weeknd', titles: ['Blinding Lights'], effect: 'headlights', description: 'Distant light trails in the cover colors sweep along the horizon.' },
  { id: 'take-on-me', artist: 'a-ha', titles: ['Take On Me'], effect: 'sketch', description: 'A hand-drawn pencil halo traces and dissolves at the edges.' },
  { id: 'midnight-city', artist: 'M83', titles: ['Midnight City'], effect: 'skyline', description: 'A tiny outline city wakes up along the distant horizon.' },
  { id: 'space-oddity', artist: 'David Bowie', titles: ['Space Oddity'], effect: 'orbit', description: 'A lone satellite crosses a quiet orbital path.' },
  { id: 'riders-on-the-storm', artist: 'The Doors', titles: ['Riders on the Storm'], effect: 'storm', description: 'A slow, low-contrast cloud glow moves at the edges.' },
  { id: 'clair-de-lune', artist: 'Claude Debussy', titles: ['Clair de Lune', 'Suite bergamasque: III. Clair de lune'], effect: 'moon', description: 'A silver moon halo emerges above suspended dust.' },
  { id: 'blue-in-green', artist: 'Miles Davis', titles: ['Blue in Green'], effect: 'ripples', description: 'Rings in the cover colors drift through the warm atmosphere.' },
  { id: 'a-sky-full-of-stars', artist: 'Coldplay', titles: ['A Sky Full of Stars'], effect: 'shooting-stars', description: 'Slow shooting stars leave fine trails at the edges.' },
  { id: 'starman', artist: 'David Bowie', titles: ['Starman'], effect: 'shooting-stars', description: 'A small comet drifts through a distant star field.' },
  { id: 'space-song', artist: 'Beach House', titles: ['Space Song'], effect: 'shooting-stars', description: 'Tiny drifting meteors move around the television.' },
  { id: 'firework', artist: 'Katy Perry', titles: ['Firework'], effect: 'blooms', description: 'Small spark blooms expand and dissolve without flashes.' },
  { id: 'purple-rain', artist: 'Prince', titles: ['Purple Rain'], effect: 'rain-curtain', description: 'Fine rain falls through the existing cover colors.' },
  { id: 'thunderstruck', artist: 'AC/DC', artists: ['ACDC'], titles: ['Thunderstruck'], effect: 'lightning', description: 'Quiet branching electrical filaments trace the edges.' },
  { id: 'around-the-world', artist: 'Daft Punk', titles: ['Around the World'], effect: 'globe', description: 'A tiny wireframe globe rotates near the horizon.' },
  { id: 'harder-better-faster-stronger', artist: 'Daft Punk', titles: ['Harder, Better, Faster, Stronger'], effect: 'circuit', description: 'Small circuit paths carry softly moving signal dots.' },
  { id: 'time', artist: 'Pink Floyd', titles: ['Time'], effect: 'clock', description: 'A faint clock dial moves with elapsed animation time, independently of tempo.' },
  { id: 'bohemian-rhapsody', artist: 'Queen', titles: ['Bohemian Rhapsody'], effect: 'prism', description: 'Prismatic line petals rotate in a quiet kaleidoscope.' },
  { id: 'mr-blue-sky', artist: 'Electric Light Orchestra', titles: ['Mr. Blue Sky'], effect: 'sunrise', description: 'A small dawn arc and soft rays emerge at the edge.' },
  { id: 'here-comes-the-sun', artist: 'The Beatles', titles: ['Here Comes the Sun'], effect: 'sunrise', description: 'A delicate sunrise outline rises beyond the television.' },
  { id: 'strawberry-fields-forever', artist: 'The Beatles', titles: ['Strawberry Fields Forever'], effect: 'petals', description: 'Tiny petal outlines drift slowly downward.' },
  { id: 'flowers', artist: 'Miley Cyrus', titles: ['Flowers'], effect: 'petals', description: 'Soft flower petals tumble at the edges.' },
  { id: 'cherry-blossom', artist: 'Lana Del Rey', titles: ['Cherry Blossom'], effect: 'petals', description: 'Small blossom silhouettes drift through the cover gradient.' },
  { id: 'snowfall', artist: 'Øneheart', artists: ['reidenshi', 'Øneheart, reidenshi', 'Øneheart & reidenshi', 'Øneheart; reidenshi'], titles: ['snowfall'], effect: 'snow', description: 'Soft snow crystals fall gently around the television.' },
  { id: 'experience', artist: 'Ludovico Einaudi', titles: ['Experience'], effect: 'clock', description: 'A slow pendulum sweeps beneath a faint dial.' },
  { id: 'river-flows-in-you', artist: 'Yiruma', titles: ['River Flows in You'], effect: 'waves', description: 'Fine river-like waves flow along the lower edge.' },
  { id: 'take-five', artist: 'The Dave Brubeck Quartet', artists: ['Dave Brubeck Quartet', 'Dave Brubeck'], titles: ['Take Five'], effect: 'vinyl', description: 'A small record outline rotates with a drifting tonearm highlight.' },
  { id: 'never-gonna-give-you-up', artist: 'Rick Astley', titles: ['Never Gonna Give You Up'], effect: 'bouncing-tv', description: 'A tiny television outline bounces slowly around the edges.' },
  { id: 'stayin-alive', artist: 'Bee Gees', titles: ['Stayin’ Alive', 'Stayin\' Alive'], effect: 'disco', description: 'A miniature disco sphere scatters a few soft orbiting glints.' },
] as const satisfies readonly SongAccentRule[];
export type SongAccent = typeof songAccents[number];
const normalize = (value: string) => value.normalize('NFKD').toLowerCase().replace(/ø/g, 'o').replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
// Strip only recognized trailing metadata. Meaningful subtitles stay part of the title.
const version = /^(?:(?:\d{4} )?remaster(?:ed)?(?: \d{4})?(?: version)?|live(?: (?:at|from|in|on) .+| \d{4})?|(?:acoustic|unplugged|instrumental|mono|stereo|sped up|slowed(?: down)?(?: (?:and )?reverb)?)(?: version)?|(?:(?:radio|single|album|extended|original|club|mono|stereo) )?(?:edit|mix|version)|(?:.+ )?remix|(?:feat|ft|featuring) .+)$/;
export function songTitle(value: string): string {
  let result = value.trim();
  // Several catalogues stack labels: “Song (Live at Wembley) - 2011 Remaster”.
  for (let i = 0; i < 8; i++) {
    const bracket = result.match(/^(.*)\s*[([]([^()[\]]+)[)\]]\s*$/u);
    const dash = result.match(/^(.*)\s+[-–—]\s+(.+)$/u);
    const suffix = bracket || dash;
    if (suffix && version.test(normalize(suffix[2]))) { result = suffix[1].trim(); continue; }
    const featured = result.match(/^(.*?)\s+(?:feat\.?|ft\.?|featuring)\s+.+$/iu);
    if (featured) { result = featured[1].trim(); continue; }
    break;
  }
  return normalize(result);
}
const artistSeparator = /\s*[,;|\n、，]\s*|\s+(?:&|and|with|feat\.?|ft\.?|featuring|x|×|vs\.?|\/)\s+/iu;
export function songArtists(track: Pick<Track, 'artist' | 'albumArtist'>): string[] {
  const credit = (track.artist.trim() || track.albumArtist).slice(0, 2048);
  return [normalize(credit), ...credit.split(artistSeparator).map(normalize)];
}
export const songArtist = normalize;
// Compile once. A full artist alias or a complete credited artist must match; never a substring.
const rules = songAccents.map(rule => ({
  rule, titles: new Set(rule.titles.map(songTitle)),
  artists: new Set([rule.artist, ...('artists' in rule ? rule.artists : [])].map(normalize)),
}));
export function matchSongAccent(track: Track | null): SongAccent | null {
  if (!track) return null;
  const artists = songArtists(track);
  const name = songTitle(track.title.slice(0, 2048));
  return rules.find(entry => entry.titles.has(name) && artists.some(artist => entry.artists.has(artist)))?.rule ?? null;
}
