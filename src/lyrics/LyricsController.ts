import { lookupLyrics } from './PublicLyrics';
import { activeLine, parsePlayback, playbackPosition, type Lyrics, type Playback } from './Lyrics';
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
  private textMotion: Animation[] = [];
  private activeRow: HTMLElement | null = null;
  private motionNeedsSync = false;
  private motionPlaying = false;
  private motionRate = 1;
  private motionReduced = false;
  private allowPublic = false;
  visible = false;
  private status: HTMLElement;
  constructor(private root: HTMLElement, private layer: HTMLElement) {
    this.status = root.querySelector('#lyrics-status')!;
  }
  configure(key: string): void {
    this.key = /^sl_pk_[A-Za-z0-9_-]+$/.test(key.trim()) ? key.trim() : '';
    this.generation++;
    this.request?.abort(); this.attempted = ''; this.nextPoll = 0; this.nextRetry = 0; this.clear();
    this.status.textContent = this.key ? 'Waiting for the Windows companion.' : 'Add a Spicy key or enable LRCLIB fallback in settings.';
  }
  private clear(): void { this.layoutObserver.disconnect(); for (const item of this.lineMotion.values()) item.animation.stop(); this.lineMotion.clear(); this.textMotion.forEach(animation => animation.cancel()); this.textMotion = []; this.activeRow = null; this.lyrics = null; this.lyricStatus = ''; this.rendered = ''; this.current = -2; this.layer.replaceChildren(); this.setVisible(false); }
  private setVisible(value: boolean): void {
    if (this.root.dataset.lyrics === String(value)) return;
    this.visible = value; this.root.dataset.lyrics = String(value);
    if (!value) { this.textMotion.forEach(animation => animation.pause()); this.motionNeedsSync = true; }
  }
  tick(now: number, track: Track | null, enabled: boolean, allowPublic: boolean): void {
    if (this.allowPublic !== allowPublic) { this.allowPublic = allowPublic; this.generation++; this.request?.abort(); this.attempted = ''; this.nextRetry = 0; this.clear(); }
    const song = track ? `${track.title}\n${track.artist || track.albumArtist}\n${track.album}` : '';
    if (song !== this.song) { this.song = song; this.generation++; this.request?.abort(); this.playback = null; this.attempted = ''; this.nextPoll = 0; this.nextRetry = 0; this.clear(); }
    if (!enabled || !track || (!this.key && !this.allowPublic)) { this.setVisible(false); return; }
    if (now >= this.nextPoll && !this.pending && now >= this.nextRetry) {
      this.nextPoll = now + 1000; void this.poll(track);
    }
    const matches = this.playback;
    if (!matches || !this.lyrics || now - this.received > 3500) { this.setVisible(false); return; }
    this.setVisible(true);
    const position = playbackPosition(this.playback!, this.received, now);
    const index = this.lyrics.timed ? activeLine(this.lyrics.lines, position) : 0;
    if (index !== this.current) this.render(index);
    if (this.motionReduced !== this.reducedMotion.matches) this.buildTextMotion();
    if (this.motionNeedsSync || this.motionPlaying !== this.playback!.isPlaying || this.motionRate !== this.playback!.rate) this.syncTextMotion(position);
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
      if (!playback || !this.sameSong(track, playback)) { this.playback = null; this.clear(); this.status.textContent = 'Waiting for matching song metadata and a usable playback timeline from the Windows companion.'; return; }
      this.playback = playback; this.received = performance.now();
      this.motionNeedsSync = true;
      this.status.textContent = this.lyricStatus || `${playback.player} detected. ${playback.isPlaying ? 'Playing' : 'Paused'}.`;
      const identity = `${this.song}|${playback.trackId}|${Math.round(playback.duration)}`;
      if (identity !== this.attempted) {
        this.attempted = identity;
        void this.fetchLyrics(playback, track.album, generation);
      }
    } catch (error) {
      if (this.disposed || generation !== this.generation || (error instanceof DOMException && error.name === 'AbortError')) return;
      this.playback = null; this.clear(); this.attempted = ''; this.nextRetry = performance.now() + 10000;
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
      this.lyricStatus = result.lyrics ? `${result.detail} · ${result.lyrics.timed ? 'Synced lyrics' : 'Untimed lyrics — shown without scrolling'}` : result.detail;
      if (result.retryMs) { this.nextRetry = performance.now() + result.retryMs; this.attempted = ''; }
      this.status.textContent = this.lyricStatus;
    } catch {
      if (this.disposed || generation !== this.generation || this.request !== request || request.signal.aborted) return;
      this.lyricStatus = 'Lyrics provider could not be reached. Retrying shortly.';
      this.status.textContent = this.lyricStatus;
      this.nextRetry = performance.now() + 10000; this.attempted = '';
    }
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
      p.dataset.echo = line.text;
      p.style.setProperty('--slot', String(offset));
    }
    for (const p of stage.querySelectorAll<HTMLElement>('[data-line]')) if (!retained.has(p.dataset.line!)) { this.layoutObserver.unobserve(p); this.lineMotion.get(p)?.animation.stop(); this.lineMotion.delete(p); p.remove(); }
    this.layoutLines();
    this.activeRow = stage.querySelector<HTMLElement>('.active');
    this.buildTextMotion();
    if (this.layer.querySelector('.lyrics-credit')) return;
    const credit = document.createElement('div'); credit.className = 'lyrics-credit';
    const provider = ({ spicy_lyrics: 'Spicy Lyrics', lrclib: 'LRCLIB', apple_music: 'Apple Music', spotify: 'Spotify' } as Record<string, string>)[this.lyrics.source];
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
      const target = `${transform}|${opacity}|${this.reducedMotion.matches}`;
      const previous = this.lineMotion.get(line);
      if (previous?.target === target) continue;
      // Sample the displayed pose before stopping: rapid seeks never restart at a slot's origin.
      const current = getComputedStyle(line);
      const from = { transform: current.transform, opacity: current.opacity };
      previous?.animation.stop();
      if (!previous || this.reducedMotion.matches) {
        line.style.transform = transform; line.style.opacity = String(opacity);
      }
      const animation = animate(line, {
        transform: [previous && !this.reducedMotion.matches ? from.transform : transform, transform],
        opacity: [previous ? Number(from.opacity) : 0, opacity],
      }, { duration: this.reducedMotion.matches ? 0 : .65, ease: [.25, .8, .25, 1] });
      this.lineMotion.set(line, { target, animation });
    }
  }
  private buildTextMotion(): void {
    this.textMotion.forEach(animation => animation.cancel()); this.textMotion = [];
    this.motionReduced = this.reducedMotion.matches; this.motionNeedsSync = true;
    if (!this.activeRow || this.motionReduced) return;
    for (const element of this.activeRow.querySelectorAll<HTMLElement>('[data-start]')) {
      const start = Number(element.dataset.start), end = Number(element.dataset.end);
      if (!(end > start)) continue;
      const letter = element.classList.contains('lyric-letter');
      const special = element.classList.contains('special');
      const frames: Keyframe[] = letter ? [{ opacity: .45 }, { opacity: 1 }] : [
        { transform: 'translate3d(0,0,0) scale(1)' },
        { transform: `translate3d(0,${special ? -2 : -1}px,0) scale(${special ? 1.025 : 1})` },
        { transform: 'translate3d(0,0,0) scale(1)' },
      ];
      const animation = element.animate(frames, { delay: start * 1000, duration: (end - start) * 1000, fill: 'both', easing: letter ? 'linear' : 'ease-in-out' });
      animation.pause(); this.textMotion.push(animation);
    }
  }
  private syncTextMotion(position: number): void {
    if (!this.playback) return;
    const changed = this.motionPlaying !== this.playback.isPlaying || this.motionRate !== this.playback.rate;
    for (const animation of this.textMotion) {
      const difference = Math.abs(Number(animation.currentTime || 0) - position * 1000);
      if (changed || !this.playback.isPlaying || difference > 250 || animation.playState === 'paused') animation.currentTime = position * 1000;
      animation.playbackRate = this.playback.rate;
      if (this.playback.isPlaying) { if (animation.playState !== 'running' && animation.playState !== 'finished') animation.play(); }
      else if (animation.playState !== 'paused') animation.pause();
    }
    this.motionPlaying = this.playback.isPlaying; this.motionRate = this.playback.rate; this.motionNeedsSync = false;
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
