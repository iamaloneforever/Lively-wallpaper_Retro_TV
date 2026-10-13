import { parseLyrics, type Lyrics, type LyricLine, type Playback } from './Lyrics';

const normalize = (text: string) => text.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export function parseLrclib(raw: unknown, playback: Playback): Lyrics | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  if (typeof data.trackName !== 'string' || typeof data.artistName !== 'string' ||
      normalize(data.trackName) !== normalize(playback.title) || normalize(data.artistName) !== normalize(playback.artist) ||
      typeof data.duration !== 'number' || !Number.isFinite(data.duration) || Math.abs(data.duration - playback.duration) > 2 || data.instrumental === true) return null;
  const lines: LyricLine[] = [];
  if (typeof data.syncedLyrics === 'string' && data.syncedLyrics.length <= 100000) {
    const offset = Number(data.syncedLyrics.match(/\[offset:([+-]?\d+)\]/i)?.[1] || 0) / 1000;
    for (const row of data.syncedLyrics.split(/\r?\n/).slice(0, 2000)) {
      const tags = Array.from(row.matchAll(/\[(\d{1,3}):([0-5]\d)(?:\.(\d{1,3}))?\]/g));
      const text = row.replace(/\[[^\]]*\]/g, '').trim().slice(0, 4000);
      for (const tag of tags) {
        const start = Math.max(0, Number(tag[1]) * 60 + Number(tag[2]) + Number(`0.${tag[3] || '0'}`) - offset);
        if (start <= playback.duration) lines.push({ text, start, end: playback.duration, words: [] });
      }
    }
    lines.sort((a, b) => a.start - b.start);
    lines.forEach((line, i) => { line.end = lines[i + 1]?.start ?? Math.max(line.start + .1, playback.duration); });
    if (lines.some(line => line.text)) return { lines, timed: true, source: 'lrclib', credits: [] };
  }
  if (typeof data.plainLyrics === 'string' && data.plainLyrics.length <= 100000) {
    const plain = data.plainLyrics.split(/\r?\n/).map(text => text.trim()).filter(Boolean).slice(0, 2000);
    if (plain.length) return { lines: plain.map((text, i) => ({ text: text.slice(0, 4000), start: i, end: i + 1, words: [] })), timed: false, source: 'lrclib', credits: [] };
  }
  return null;
}

export interface LookupResult { lyrics: Lyrics | null; detail: string; retryMs?: number }
export async function lookupLyrics(playback: Playback, album: string, key: string, signal: AbortSignal, allowPublic: boolean): Promise<LookupResult> {
  let spicyFailure = '';
  if (key && playback.trackId) {
    try {
      const response = await fetch(`https://api.spicylyrics.org/v1/lyrics/${playback.trackId}`, {
      headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.any([signal, AbortSignal.timeout(6000)]),
    });
    if (response.ok) {
      const lyrics = parseLyrics(await response.json());
      if (lyrics) return { lyrics, detail: 'Spicy Lyrics' };
    } else if (response.status !== 404) {
      if (!allowPublic) return { lyrics: null, detail: `Spicy Lyrics returned ${response.status}. Check the key and allowed origin.`,
        retryMs: response.status === 429 ? Math.max(30, Number(response.headers.get('Retry-After')) || 60) * 1000 : undefined };
      spicyFailure = `Spicy Lyrics returned ${response.status}. `;
    }
    } catch (error) { if (signal.aborted) throw error; if (!allowPublic) throw error; spicyFailure = 'Spicy Lyrics unavailable. '; }
  }
  if (!allowPublic) return { lyrics: null, detail: playback.trackId ? 'No lyrics for this song.' : 'No Spicy track ID. Enable LRCLIB fallback in settings for a public title-based lookup.' };
  const query = new URLSearchParams({ track_name: playback.title, artist_name: playback.artist, duration: String(playback.duration) });
  if (album) query.set('album_name', album);
  const response = await fetch(`https://lrclib.net/api/get?${query}`, { signal });
  if (response.status === 404) {
    const search = new URLSearchParams({ track_name: playback.title, artist_name: playback.artist });
    const fallback = await fetch(`https://lrclib.net/api/search?${search}`, { signal });
    if (!fallback.ok) return { lyrics: null, detail: fallback.status === 404 ? 'No lyrics for this song.' : `LRCLIB search returned ${fallback.status}.`, retryMs: fallback.status === 429 ? 60000 : undefined };
    const rows: unknown = await fallback.json();
    const matches = Array.isArray(rows) ? rows.slice(0, 100).map(row => parseLrclib(row, playback)).filter((lyrics): lyrics is Lyrics => lyrics !== null) : [];
    return matches.length === 1 ? { lyrics: matches[0], detail: 'LRCLIB' } : { lyrics: null, detail: spicyFailure + (matches.length > 1 ? 'LRCLIB match is ambiguous.' : 'No lyrics for this song.') };
  }
  if (!response.ok) return { lyrics: null, detail: `LRCLIB returned ${response.status}.`, retryMs: response.status === 429 ? 60000 : undefined };
  const lyrics = parseLrclib(await response.json(), playback);
  return { lyrics, detail: lyrics ? 'LRCLIB' : 'No matching lyrics for this recording.' };
}
