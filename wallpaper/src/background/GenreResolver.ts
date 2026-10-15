import type { Track } from '../lively/types';
import { bridgeHeaders } from '../music/SongSearch';
import { normalizeGenre, type ThemeId } from './Themes';

const identity = (track: Pick<Track, 'title' | 'artist' | 'albumArtist' | 'album'>) => JSON.stringify([track.title, track.artist || track.albumArtist, track.album]);
const normalize = (value: string) => value.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
/** Reads already-resolved companion metadata; never calls a public catalogue from the wallpaper. */
export class GenreResolver {
  detected: ThemeId | null = null;
  source = 'Default theme';
  private key = '';
  private cache = new Map<string, { theme: ThemeId; expires: number }>();
  private nextPoll = 0;
  private request: AbortController | null = null;
  private generation = 0;
  private disposed = false;
  setTrack(track: Track | null): void {
    const key = track ? identity(track) : '';
    if (key !== this.key) {
      this.key = key; this.generation++; this.request?.abort(); this.request = null; this.nextPoll = 0;
      this.detected = null; this.source = 'Default theme';
    }
    const native = track ? normalizeGenre(track.genres) : null;
    const cached = this.cache.get(key);
    if (native) { this.detected = native; this.source = 'Player metadata'; }
    else if (cached && cached.expires > Date.now()) { this.detected = cached.theme; this.source = 'Companion metadata (cached)'; }
  }
  tick(now: number, track: Track | null, enabled: boolean): void {
    if (!enabled || !track || !this.key || this.detected || this.request || now < this.nextPoll || !bridgeHeaders()['X-RetroWave-Key']) return;
    this.nextPoll = now + 2000;
    const request = new AbortController(), generation = this.generation;
    this.request = request;
    void this.resolve(track, generation, request);
  }
  private async resolve(track: Track, generation: number, request: AbortController): Promise<void> {
    try {
      const response = await fetch('http://127.0.0.1:43821/now-playing', { headers: bridgeHeaders(), cache: 'no-store', signal: AbortSignal.any([request.signal, AbortSignal.timeout(2500)]) });
      if (!response.ok) throw new Error('Companion unavailable');
      const data = await response.json();
      if (this.disposed || generation !== this.generation || request.signal.aborted || typeof data.title !== 'string' || typeof data.artist !== 'string' ||
          normalize(data.title) !== normalize(track.title) || normalize(data.artist) !== normalize(track.artist || track.albumArtist) ||
          (typeof data.album === 'string' && track.album && normalize(data.album) !== normalize(track.album)) ||
          typeof data.capturedAtUnixMs !== 'number' || !Number.isFinite(data.capturedAtUnixMs) || Math.abs(Date.now() - data.capturedAtUnixMs) > 3500) return;
      const theme = normalizeGenre(Array.isArray(data.genres) ? data.genres.filter((g: unknown): g is string => typeof g === 'string') : []);
      if (theme) {
        this.detected = theme; this.source = 'Companion metadata';
        if (this.cache.size >= 256) this.cache.delete(this.cache.keys().next().value!);
        this.cache.set(this.key, { theme, expires: Date.now() + 6 * 60 * 60 * 1000 });
      }
      // Missing genres may arrive after catalogue resolution; bounded local polling allows enrichment.
    } catch { if (generation === this.generation) this.nextPoll = performance.now() + 10000; }
    finally { if (this.request === request) this.request = null; }
  }
  dispose(): void { this.disposed = true; this.request?.abort(); this.cache.clear(); }
}
