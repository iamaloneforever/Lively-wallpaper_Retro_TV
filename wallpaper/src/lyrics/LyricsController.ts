import { lookupLyrics } from './PublicLyrics';
import { parsePlayback, playbackPosition, type Lyrics, type Playback } from './Lyrics';
import { defaults, type Config } from '../core/Config';
import type { Track } from '../lively/types';
import { lyricPalette } from './LyricsPalette';
import type * as Renderer from '../vendor/SpicyRenderer.mjs';
import { rendererData } from './SpicyData';
import '../../vendor/spicy-lyrics/src/css/Lyrics/main.css';
import '../../vendor/spicy-lyrics/src/css/Lyrics/Mixed.css';
import '../../vendor/spicy-lyrics/src/css/Simplebar.css';
import './spicy-host.css';

export class LyricsController {
  private renderer: typeof Renderer | null = null;
  private lyrics: Lyrics | null = null;
  private playback: Playback | null = null;
  private received = 0;
  private nextPoll = 0;
  private pending = false;
  private request: AbortController | null = null;
  private attempted = '';
  private nextRetry = 0;
  private nextLyricRetry = 0;
  private rendered: Lyrics | null = null;
  private key = '';
  private disposed = false;
  private song = '';
  private generation = 0;
  private lyricStatus = '';
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  private lastPosition = 0;
  private allowPublic = false;
  private appearance: Config = { ...defaults };
  private palette = '';
  visible = false;
  private status: HTMLElement;
  constructor(private root: HTMLElement, private layer: HTMLElement) {
    this.status = root.querySelector('#lyrics-status')!;
    void import('../vendor/SpicyRenderer.mjs').then(runtime => {
      if (this.disposed) return;
      this.renderer = runtime; runtime.appearance(this.appearance, this.reducedMotion.matches);
    });
  }
  setAppearance(config: Config): void {
    this.appearance = { ...config };
    this.layer.dataset.style = config.lyricStyle; this.layer.dataset.color = config.lyricColor;
    this.layer.style.setProperty('--lyric-size', String(config.lyricSize));
    this.layer.style.setProperty('--effect-intensity', String(config.lyricIntensity));
    this.renderer?.appearance(config, this.reducedMotion.matches); this.updatePalette();
    if (!config.lyrics) this.setVisible(false);
  }
  private updatePalette(): void {
    const dominant = this.palette.split(',')[0];
    // One hue source for the TV, backdrop and renderer: the dominant cover color.
    const colors = lyricPalette([dominant], this.appearance.lyricColor === 'neutral');
    const rgb = [1, 3, 5].map(i => parseInt(colors.ink.slice(i, i + 2), 16)).join(',');
    this.layer.style.setProperty('--renderer-rgb', rgb);
    this.root.style.setProperty('--lyrics-dim', colors.scrim);
  }
  setPalette(palette: string): void { if (palette !== this.palette) { this.palette = palette; this.updatePalette(); } }
  configure(key: string): void {
    this.key = /^sl_pk_[A-Za-z0-9_-]+$/.test(key.trim()) ? key.trim() : '';
    this.generation++; this.request?.abort(); this.attempted = ''; this.nextPoll = 0; this.nextRetry = 0; this.nextLyricRetry = 0; this.clear();
    this.status.textContent = this.key ? 'Waiting for the Windows companion.' : 'Add a Spicy key or enable LRCLIB fallback in settings.';
  }
  private clear(): void { this.renderer?.clear(); this.lyrics = null; this.rendered = null; this.lyricStatus = ''; this.layer.replaceChildren(); this.setVisible(false); }
  private setVisible(value: boolean): void {
    this.visible = value; this.root.dataset.lyrics = String(value);
    if (!value) this.renderer?.clock(this.lastPosition, false, false);
  }
  tick(now: number, track: Track | null, enabled: boolean, allowPublic: boolean): void {
    if (!this.renderer) return;
    const renderer = this.renderer;
    renderer.appearance(this.appearance, this.reducedMotion.matches);
    if (this.allowPublic !== allowPublic) { this.allowPublic = allowPublic; this.generation++; this.request?.abort(); this.attempted = ''; this.nextRetry = 0; this.nextLyricRetry = 0; this.clear(); }
    const song = track ? track.title + '\n' + (track.artist || track.albumArtist) + '\n' + track.album : '';
    if (song !== this.song) { this.song = song; this.generation++; this.request?.abort(); this.playback = null; this.attempted = ''; this.nextPoll = 0; this.nextRetry = 0; this.nextLyricRetry = 0; this.clear(); }
    if (!enabled || !track) { this.setVisible(false); return; }
    if (now >= this.nextPoll && !this.pending && now >= this.nextRetry) { this.nextPoll = now + 500; void this.poll(track); }
    if (!this.playback || !this.lyrics || now - this.received > 3500) { this.setVisible(false); return; }
    this.lastPosition = playbackPosition(this.playback, this.received, now);
    if (this.rendered !== this.lyrics) {
      const view = document.createElement('div'); this.layer.replaceChildren(view); renderer.mount(view);
      renderer.appearance(this.appearance, this.reducedMotion.matches);
      renderer.clock(this.lastPosition, this.playback.isPlaying, true);
      renderer.apply(rendererData(this.lyrics)); this.rendered = this.lyrics;
    }
    this.setVisible(true); renderer.clock(this.lastPosition, this.playback.isPlaying, true);
  }
  private sameSong(track: Track, playback: Playback): boolean {
    const normalize = (s: string) => s.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    return normalize(track.title) === normalize(playback.title) && normalize(track.artist || track.albumArtist) === normalize(playback.artist);
  }
  private async poll(track: Track): Promise<void> {
    this.pending = true;
    const generation = this.generation;
    try {
      const token = new URLSearchParams(location.hash.slice(1)).get('bridge');
      const headers: Record<string, string> = token && /^[a-f0-9]{64}$/.test(token) ? { 'X-RetroWave-Key': token } : {};
      const response = await fetch('http://127.0.0.1:43821/now-playing', { headers, signal: AbortSignal.timeout(2500), cache: 'no-store' });
      if (!response.ok) throw new Error('Companion unavailable');
      const data: unknown = await response.json();
      if (this.disposed || generation !== this.generation) return;
      const playback = parsePlayback(data);
      if (!playback || !this.sameSong(track, playback)) { this.generation++; this.request?.abort(); this.attempted = ''; this.playback = null; this.clear(); this.status.textContent = 'Waiting for matching song metadata and a usable playback timeline from the Windows companion.'; return; }
      const age = playback.capturedAtUnixMs === undefined ? 0 : Math.max(0, Date.now() - playback.capturedAtUnixMs);
      if (age > 3500) throw new Error('Stale playback snapshot');
      this.playback = playback; this.received = performance.now() - age;

      this.status.textContent = this.lyricStatus || `${playback.player} detected. ${playback.isPlaying ? 'Playing' : 'Paused'}.`;
      const identity = `${this.song}|${playback.trackId}|${Math.round(playback.duration)}|${playback.lrcLibAllowed === true}`;
      if (identity !== this.attempted && performance.now() >= this.nextLyricRetry) {
        this.attempted = identity;
        void this.fetchLyrics(playback, track.album, generation);
      }
    } catch (error) {
      if (this.disposed || generation !== this.generation || (error instanceof DOMException && error.name === 'AbortError')) return;
      this.generation++; this.request?.abort(); this.playback = null; this.clear(); this.attempted = ''; this.nextRetry = performance.now() + 10000;
      this.status.textContent = 'Start the Windows companion and allow local-network access for this wallpaper to read playback timing.';
    } finally { this.pending = false; }
  }
  private async fetchLyrics(playback: Playback, album: string, generation: number): Promise<void> {
    this.clear(); this.request?.abort();
    const request = new AbortController(); this.request = request;
    this.lyricStatus = playback.trackId && this.key ? 'Looking up Spicy Lyrics…' : 'Looking up LRCLIB by title and artist…';
    this.status.textContent = this.lyricStatus;
    try {
      const result = await lookupLyrics(playback, album, this.key, AbortSignal.any([request.signal, AbortSignal.timeout(18000)]), this.allowPublic);
      if (this.disposed || generation !== this.generation || this.request !== request) return;
      this.lyrics = result.lyrics;
      if (playback.trackKey) {
        const pairing = location.hash.match(/(?:^#|&)bridge=([a-f0-9]{64})(?:&|$)/)?.[1];
        const source = result.lyrics ? result.detail === 'Spicy Lyrics' ? 'spicy_lyrics' : result.detail === 'LRCLIB' ? 'lrclib' : '' : '';
        if (pairing) void fetch('http://127.0.0.1:43821/lyrics-status', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-RetroWave-Key': pairing }, body: JSON.stringify({ trackKey: playback.trackKey, source, timed: result.lyrics?.timed === true }), signal: AbortSignal.timeout(2000) }).catch(() => { /* Older companions have no receipt endpoint. */ });
      }
      this.lyricStatus = result.lyrics ? `${result.detail} · ${result.lyrics.timed ? 'Synced lyrics' : 'Untimed lyrics — shown without scrolling'}` : result.detail;
      // Provider backoff must not stop the independent local playback clock.
      if (result.retryMs) { this.nextLyricRetry = performance.now() + result.retryMs; this.attempted = ''; }
      this.status.textContent = this.lyricStatus;
    } catch {
      if (this.disposed || generation !== this.generation || this.request !== request || request.signal.aborted) return;
      this.lyricStatus = 'Lyrics provider could not be reached. Retrying shortly.';
      this.status.textContent = this.lyricStatus;
      this.nextLyricRetry = performance.now() + 10000; this.attempted = '';
    }
  }
  suspend(): void { this.renderer?.clock(this.lastPosition, false, false); }
  dispose(): void { this.disposed = true; this.clear(); this.request?.abort(); }
}
