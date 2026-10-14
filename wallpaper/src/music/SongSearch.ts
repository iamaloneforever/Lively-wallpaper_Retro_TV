import type { Playback } from '../lyrics/Lyrics';

export interface SongCandidate {
  title: string; artist: string; album: string; duration: number; provider: string;
  spotifyId: string; mbid: string; lrcId?: number;
}
export interface SongSearchResult { candidates: SongCandidate[]; queries: string[]; detail: string }
const text = (value: unknown): string => typeof value === 'string' ? value.slice(0, 512).trim() : '';
export function parseCandidate(value: unknown): SongCandidate | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const title = text(row.title), artist = text(row.artist);
  const spotifyId = /^[A-Za-z0-9]{22}$/.test(text(row.spotifyId)) ? text(row.spotifyId) : '';
  const mbid = /^[a-f0-9-]{36}$/i.test(text(row.mbid)) ? text(row.mbid) : '';
  const lrcId = typeof row.lrcId === 'number' && Number.isSafeInteger(row.lrcId) && row.lrcId > 0 ? row.lrcId : undefined;
  if (!title || !artist || (!spotifyId && !mbid && !lrcId)) return null;
  return { title, artist, album: text(row.album), provider: text(row.provider), spotifyId, mbid, lrcId,
    duration: typeof row.duration === 'number' && Number.isFinite(row.duration) && row.duration > 0 ? row.duration : 0 };
}
export function bridgeHeaders(): Record<string, string> {
  const token = new URLSearchParams(location.hash.slice(1)).get('bridge');
  return token && /^[a-f0-9]{64}$/.test(token) ? { 'X-RetroWave-Key': token } : {};
}
export async function searchSongs(title: string, artist: string, playback: Playback, allowPublic: boolean, signal: AbortSignal): Promise<SongSearchResult> {
  const candidates: SongCandidate[] = [], queries: string[] = [], details: string[] = [];
  const operations: Promise<void>[] = [];
  // The companion owns provider configuration and credentials. Never call Spotify from the page.
  if (bridgeHeaders()['X-RetroWave-Key']) operations.push((async () => {
    try {
      const query = new URLSearchParams({ title, artist, trackKey: playback.trackKey || '' });
      const response = await fetch(`http://127.0.0.1:43821/music-search?${query}`, { headers: bridgeHeaders(), signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Catalogue search unavailable. Update the companion and check Music Finder settings.');
      const data = await response.json();
      if (data.trackKey !== playback.trackKey) throw new Error('The playing song changed.');
      if (Array.isArray(data.candidates)) for (const row of data.candidates.slice(0, 100)) { const candidate = parseCandidate(row); if (candidate) candidates.push(candidate); }
      if (Array.isArray(data.queries)) queries.push(...data.queries.filter((q: unknown): q is string => typeof q === 'string').slice(0, 12));
      if (typeof data.detail === 'string') details.push(data.detail);
    } catch (error) { if (signal.aborted) throw error; details.push(error instanceof Error ? error.message : 'Catalogue search unavailable.'); }
  })());
  if (allowPublic) operations.push((async () => {
    queries.push(`LRCLIB: ${title}${artist ? ` — ${artist}` : ''}`);
    try {
      const query = new URLSearchParams({ track_name: title }); if (artist) query.set('artist_name', artist);
      const response = await fetch(`https://lrclib.net/api/search?${query}`, { signal });
      if (!response.ok) throw new Error(response.status === 429 ? 'LRCLIB is busy. Try again shortly.' : 'LRCLIB search unavailable.');
      const rows: unknown = await response.json();
      if (Array.isArray(rows)) for (const value of rows.slice(0, 100)) {
        if (!value || typeof value !== 'object') continue;
        const row = value as Record<string, unknown>;
        if (row.instrumental === true || (!row.syncedLyrics && !row.plainLyrics)) continue;
        const candidate = parseCandidate({ title: row.trackName, artist: row.artistName, album: row.albumName, duration: row.duration, lrcId: row.id, provider: 'LRCLIB' });
        if (candidate) candidates.push(candidate);
      }
    } catch (error) { if (signal.aborted) throw error; details.push(error instanceof Error ? error.message : 'LRCLIB search unavailable.'); }
  })());
  await Promise.all(operations); signal.throwIfAborted();
  const unique = candidates.filter((c, i, all) => all.findIndex(other => c.spotifyId ? other.spotifyId === c.spotifyId : c.lrcId ? other.lrcId === c.lrcId : other.mbid === c.mbid && other.title === c.title && other.artist === c.artist) === i);
  return { candidates: unique.slice(0, 60), queries, detail: details.join(' ') || (!operations.length ? 'Pair the Windows companion for catalogue search, or enable LRCLIB fallback in settings.' : '') };
}
