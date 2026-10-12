import { activeLine, parseLyrics, parsePlayback, playbackPosition, type Lyrics, type Playback } from './Lyrics';
import type { Track } from '../lively/types';

export class LyricsController {
  private lyrics: Lyrics | null = null;
  private playback: Playback | null = null;
  private received = 0;
  private nextPoll = 0;
  private pending = false;
  private request: AbortController | null = null;
  private attempted = '';
  private nextRetry = 0;
  private rendered = '';
  private key = '';
  private disposed = false;
  private current = -2;
  private song = '';
  private generation = 0;
  private lyricStatus = '';
  visible = false;
  private status: HTMLElement;
  constructor(private root: HTMLElement, private layer: HTMLElement) {
    this.status = root.querySelector('#lyrics-status')!;
  }
  configure(key: string): void {
    this.key = /^sl_pk_[A-Za-z0-9_-]+$/.test(key.trim()) ? key.trim() : '';
    this.generation++;
    this.request?.abort(); this.attempted = ''; this.nextPoll = 0; this.nextRetry = 0; this.clear();
    this.status.textContent = this.key ? 'Waiting for the Windows companion.' : 'Add a Spicy Lyrics publishable key to enable lyrics.';
  }
  private clear(): void { this.lyrics = null; this.lyricStatus = ''; this.rendered = ''; this.current = -2; this.layer.replaceChildren(); this.setVisible(false); }
  private setVisible(value: boolean): void { this.visible = value; this.root.dataset.lyrics = String(value); }
  tick(now: number, track: Track | null, enabled: boolean): void {
    const song = track ? `${track.title}\n${track.artist || track.albumArtist}` : '';
    if (song !== this.song) { this.song = song; this.generation++; this.request?.abort(); this.playback = null; this.attempted = ''; this.nextPoll = 0; this.nextRetry = 0; this.clear(); }
    if (!enabled || !this.key || !track) { this.setVisible(false); return; }
    if (now >= this.nextPoll && !this.pending && now >= this.nextRetry) {
      this.nextPoll = now + 1000; void this.poll(track);
    }
    const matches = this.playback && this.sameSong(track, this.playback);
    if (!matches || !this.lyrics || now - this.received > 3500) { this.setVisible(false); return; }
    this.setVisible(true);
    const position = playbackPosition(this.playback!, this.received, now);
    const index = this.lyrics.timed ? activeLine(this.lyrics.lines, position) : 0;
    if (index !== this.current) this.render(index);
    for (const span of this.layer.querySelectorAll<HTMLElement>('[data-start]')) {
      const progress = Math.max(0, Math.min(1, (position - Number(span.dataset.start)) / (Number(span.dataset.end) - Number(span.dataset.start))));
      span.style.setProperty('--word-progress', `${progress * 100}%`);
    }
  }
  private sameSong(track: Track, playback: Playback): boolean {
    const normalize = (s: string) => s.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    return normalize(track.title) === normalize(playback.title) && normalize(track.artist || track.albumArtist) === normalize(playback.artist);
  }
  private async poll(track: Track): Promise<void> {
    this.pending = true;
    const generation = this.generation;
    try {
      const response = await fetch('http://127.0.0.1:43821/now-playing', { signal: AbortSignal.timeout(7000), cache: 'no-store' });
      if (!response.ok) throw new Error('Companion unavailable');
      const data: unknown = await response.json();
      if (this.disposed || generation !== this.generation) return;
      const playback = parsePlayback(data);
      if (!playback || !this.sameSong(track, playback)) { this.playback = null; this.clear(); this.status.textContent = 'Player detected; waiting for a matching Spotify ID and a usable playback timeline. Check companion setup.'; return; }
      this.playback = playback; this.received = performance.now();
      this.status.textContent = this.lyricStatus || `${playback.player} detected. ${playback.isPlaying ? 'Playing' : 'Paused'}.`;
      if (playback.trackId !== this.attempted) {
        this.clear(); this.request?.abort(); this.request = new AbortController();
        this.attempted = playback.trackId;
        const key = this.key;
        const lyricsResponse = await fetch(`https://api.spicylyrics.org/v1/lyrics/${playback.trackId}`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.any([this.request.signal, AbortSignal.timeout(12000)]) });
        if (this.disposed || key !== this.key || generation !== this.generation) return;
        if (!lyricsResponse.ok) {
          this.lyricStatus = lyricsResponse.status === 404 ? 'No lyrics for this song.' : `Spicy Lyrics returned ${lyricsResponse.status}. Check the key and allowed origin.`;
          this.status.textContent = this.lyricStatus;
          if (lyricsResponse.status === 429) { this.nextRetry = performance.now() + Math.max(30, Number(lyricsResponse.headers.get('Retry-After')) || 60) * 1000; this.attempted = ''; }
          return;
        }
        const payload: unknown = await lyricsResponse.json();
        if (this.disposed || generation !== this.generation) return;
        this.lyrics = parseLyrics(payload);
        this.lyricStatus = this.lyrics ? `${playback.player} · ${this.lyrics.timed ? 'Synced lyrics' : 'Untimed lyrics — shown without scrolling'}` : 'No supported lyrics for this song.';
        this.status.textContent = this.lyricStatus;
      }
    } catch (error) {
      if (this.disposed || generation !== this.generation || (error instanceof DOMException && error.name === 'AbortError')) return;
      this.playback = null; this.clear(); this.attempted = ''; this.nextRetry = performance.now() + 10000;
      this.status.textContent = 'Start the Windows companion and allow local-network access for this wallpaper to read playback timing.';
    } finally { this.pending = false; }
  }
  private render(index: number): void {
    if (!this.lyrics) return;
    this.current = index;
    const key = `${this.attempted}:${index}`; if (key === this.rendered) return; this.rendered = key;
    const fragment = document.createDocumentFragment();
    for (const [offset, className] of [[-1, 'past'], [0, 'active'], [1, 'future']] as const) {
      const line = this.lyrics.lines[Math.max(index, -1) + offset]; if (!line) continue;
      const p = document.createElement('p'); p.className = `lyric-line ${className}`; p.dir = 'auto';
      if (className === 'active') p.dataset.echo = line.text;
      if (className === 'active' && line.words.length) for (const word of line.words) {
        const span = document.createElement('span'); span.textContent = word.text; span.dataset.start = String(word.start); span.dataset.end = String(word.end); p.append(span);
      } else p.textContent = line.text;
      fragment.append(p);
    }
    const credit = document.createElement('div'); credit.className = 'lyrics-credit';
    const provider = ({ spicy_lyrics: 'Spicy Lyrics', apple_music: 'Apple Music', spotify: 'Spotify' } as Record<string, string>)[this.lyrics.source];
    credit.textContent = `Lyrics · ${provider || 'Unknown provider'}`;
    for (const person of this.lyrics.credits) { const a = document.createElement('a'); a.href = person.url; a.textContent = person.name; a.target = '_blank'; a.rel = 'noopener noreferrer'; credit.append(' · ', a); }
    fragment.append(credit); this.layer.replaceChildren(fragment);
  }
  dispose(): void { this.disposed = true; this.request?.abort(); }
}
