import { activeLine, parseLyrics, parsePlayback, playbackPosition, type Lyrics, type Playback } from './Lyrics';
import type { Track } from '../lively/types';
import { animate } from 'motion/mini';
import type { LyricLine } from './Lyrics';

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
  private layoutObserver = new ResizeObserver(() => this.layoutLines());
  private lineMotion = new Map<HTMLElement, { target: string; animation: ReturnType<typeof animate> }>();
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
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
  private clear(): void { this.layoutObserver.disconnect(); for (const item of this.lineMotion.values()) item.animation.stop(); this.lineMotion.clear(); this.lyrics = null; this.lyricStatus = ''; this.rendered = ''; this.current = -2; this.layer.replaceChildren(); this.setVisible(false); }
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
    for (const span of this.layer.querySelectorAll<HTMLElement>('.active [data-start]')) {
      const progress = Math.max(0, Math.min(1, (position - Number(span.dataset.start)) / (Number(span.dataset.end) - Number(span.dataset.start))));
      span.style.setProperty('--word-progress', `${progress * 100}%`);
      span.classList.toggle('singing', position >= Number(span.dataset.start) && position < Number(span.dataset.end));
      const pulse = this.reducedMotion.matches ? 0 : Math.sin(progress * Math.PI);
      span.style.setProperty('--pulse', pulse.toFixed(4));
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
      const response = await fetch('http://127.0.0.1:43821/now-playing', { signal: AbortSignal.timeout(12000), cache: 'no-store' });
      if (!response.ok) throw new Error('Companion unavailable');
      const data: unknown = await response.json();
      if (this.disposed || generation !== this.generation) return;
      const playback = parsePlayback(data);
      if (!playback || !this.sameSong(track, playback)) { this.playback = null; this.clear(); this.status.textContent = 'Player detected; waiting for a matching track ID and playback timeline. If MetaBrainz has no matching song and album, add a local track mapping.'; return; }
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
    let stage = this.layer.querySelector<HTMLElement>('.lyrics-stage');
    if (!stage) { stage = document.createElement('div'); stage.className = 'lyrics-stage'; this.layer.append(stage); this.layoutObserver.observe(stage); }
    const retained = new Set<string>();
    for (const [offset, className] of [[-1, 'past'], [0, 'active'], [1, 'future']] as const) {
      const lineIndex = Math.max(index, -1) + offset;
      const line = this.lyrics.lines[lineIndex]; if (!line) continue;
      const id = String(lineIndex); retained.add(id);
      let p = stage.querySelector<HTMLElement>(`[data-line="${id}"]`);
      if (!p) {
        p = document.createElement('p'); p.className = 'lyric-line'; p.dir = 'auto'; p.dataset.line = id;
        this.appendWords(p, line);
        stage.append(p);
        this.layoutObserver.observe(p);
      }
      p.className = `lyric-line ${className}`;
      p.style.setProperty('--slot', String(offset));
    }
    for (const p of stage.querySelectorAll<HTMLElement>('[data-line]')) if (!retained.has(p.dataset.line!)) { this.layoutObserver.unobserve(p); this.lineMotion.get(p)?.animation.stop(); this.lineMotion.delete(p); p.remove(); }
    this.layoutLines();
    if (this.layer.querySelector('.lyrics-credit')) return;
    const credit = document.createElement('div'); credit.className = 'lyrics-credit';
    const provider = ({ spicy_lyrics: 'Spicy Lyrics', apple_music: 'Apple Music', spotify: 'Spotify' } as Record<string, string>)[this.lyrics.source];
    credit.textContent = `Lyrics · ${provider || 'Unknown provider'}`;
    for (const person of this.lyrics.credits) { const a = document.createElement('a'); a.href = person.url; a.textContent = person.name; a.target = '_blank'; a.rel = 'noopener noreferrer'; credit.append(' · ', a); }
    this.layer.append(credit);
  }
  private layoutLines(): void {
    const stage = this.layer.querySelector<HTMLElement>('.lyrics-stage'); if (!stage) return;
    const active = stage.querySelector<HTMLElement>('.active');
    const gap = parseFloat(getComputedStyle(stage).rowGap) || 82;
    for (const line of stage.querySelectorAll<HTMLElement>('.lyric-line')) {
      const offset = Number(line.style.getPropertyValue('--slot'));
      const distance = Math.max(gap, ((active?.offsetHeight || line.offsetHeight) + line.offsetHeight * .88) / 2 + 22);
      const transform = `translateY(${-line.offsetHeight / 2 + offset * distance}px) scale(${offset === 0 ? 1 : .88})`;
      const opacity = offset === 0 ? 1 : offset < 0 ? .2 : .36;
      const filter = `blur(${offset === 0 ? 0 : 1.2}px)`;
      const target = `${transform}|${opacity}|${filter}|${this.reducedMotion.matches}`;
      const previous = this.lineMotion.get(line);
      if (previous?.target === target) continue;
      // Sample the displayed pose before stopping: rapid seeks never restart at a slot's origin.
      const current = getComputedStyle(line);
      const from = { transform: current.transform, opacity: current.opacity, filter: current.filter };
      previous?.animation.stop();
      if (!previous || this.reducedMotion.matches) {
        line.style.transform = transform; line.style.opacity = String(opacity); line.style.filter = filter;
      }
      const animation = animate(line, {
        transform: [previous && !this.reducedMotion.matches ? from.transform : transform, transform],
        opacity: [previous ? Number(from.opacity) : 0, opacity],
        filter: [previous && !this.reducedMotion.matches ? from.filter : filter, filter],
      }, { duration: this.reducedMotion.matches ? 0 : .85, ease: [.22, 1, .36, 1] });
      this.lineMotion.set(line, { target, animation });
    }
  }
  private appendWords(p: HTMLElement, line: LyricLine): void {
    // Keep complete words together while retaining the provider's syllable timestamps.
    const parts = line.words.length ? line.words : (line.text.match(/\S+\s*/gu) || []).map(text => ({ text, start: NaN, end: NaN }));
    let word: HTMLElement | null = null;
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
    for (const part of parts) {
      if (!word) { word = document.createElement('span'); word.className = 'lyric-word'; p.append(word); if (Number.isFinite(part.start)) word.dataset.start = String(part.start); }
      if (Number.isFinite(part.end)) word.dataset.end = String(part.end);
      // Splitting joining scripts would break their letter shapes. Animate those syllables intact.
      const joined = /[\p{Script=Arabic}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Tamil}]/u.test(part.text);
      const letters = joined ? [part.text] : Array.from(segmenter.segment(part.text), item => item.segment);
      letters.forEach((text, i) => {
        const glyph = document.createElement('span'); glyph.className = 'lyric-letter'; glyph.textContent = text; glyph.dataset.echo = text;
        if (Number.isFinite(part.start)) {
          glyph.dataset.start = String(part.start + (part.end - part.start) * i / letters.length);
          glyph.dataset.end = String(part.start + (part.end - part.start) * (i + 1) / letters.length);
        }
        word!.append(glyph);
      });
      if (/\s$/.test(part.text) || part === parts[parts.length - 1]) {
        if (/[\u0590-\u08ff\u0900-\u109f\u1780-\u17ff]/u.test(word.textContent || '')) {
          const glyph = document.createElement('span'); glyph.className = 'lyric-letter'; glyph.textContent = word.textContent; glyph.dataset.echo = word.textContent || '';
          if (word.dataset.start) { glyph.dataset.start = word.dataset.start; glyph.dataset.end = word.dataset.end; }
          word.replaceChildren(glyph);
        }
        word.classList.toggle('special', Number(word.dataset.end) - Number(word.dataset.start) >= 1.2 || /[!?]/u.test(word.textContent || ''));
        word = null;
      }
    }
  }
  dispose(): void { this.disposed = true; this.clear(); this.request?.abort(); }
}
