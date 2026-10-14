import { lookupLyrics } from './PublicLyrics';
import { activeLine, parsePlayback, playbackPosition, type Lyrics, type Playback } from './Lyrics';
import { defaults, type Config } from '../core/Config';
import type { Track } from '../lively/types';
import { animate } from 'motion/mini';
import type { LyricLine } from './Lyrics';
import { lyricPalette } from './LyricsPalette';
import { characterWindow, graphemes } from './CharacterMotion';
import { mixColor } from '../music/Theme';

export class LyricsController {
  private lyrics: Lyrics | null = null;
  private playback: Playback | null = null;
  private received = 0;
  private nextPoll = 0;
  private pending = false;
  private request: AbortController | null = null;
  private attempted = '';
  private nextRetry = 0;
  private nextLyricRetry = 0;
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
  private characterRanges = new WeakMap<HTMLElement, { start: number; end: number; index: number; count: number }>();
  private remainingGlyphs = 320;
  private activeRow: HTMLElement | null = null;
  private motionNeedsSync = false;
  private motionPlaying = false;
  private motionRate = 1;
  private motionReduced = false;
  private lastPosition = 0;
  private allowPublic = false;
  private appearance: Config = { ...defaults };
  private palette = '';
  private suspended = false;
  visible = false;
  private status: HTMLElement;
  constructor(private root: HTMLElement, private layer: HTMLElement) {
    this.status = root.querySelector('#lyrics-status')!;
  }
  setAppearance(config: Config): void {
    const previous = this.appearance;
    this.appearance = { ...config };
    if (!config.lyrics) this.setVisible(false);
    this.layer.dataset.style = config.lyricStyle;
    this.layer.dataset.color = config.lyricColor;
    this.layer.style.setProperty('--lyric-size', String(config.lyricSize));
    this.updatePalette();
    if (previous.lyricStyle !== config.lyricStyle || previous.lyricIntensity !== config.lyricIntensity || previous.lowPower !== config.lowPower || previous.lyricColor !== config.lyricColor) {
      this.layoutLines(); this.buildTextMotion();
    }
  }
  private updatePalette(): void {
    const colors = lyricPalette(this.palette.split(','), this.appearance.lyricColor === 'neutral');
    this.layer.style.setProperty('--lyric-ink', colors.ink);
    this.layer.style.setProperty('--lyric-highlight', colors.highlight);
    this.layer.style.setProperty('--lyric-waiting', mixColor(colors.ink, '#080b0b', .25));
    this.root.style.setProperty('--lyrics-dim', colors.scrim);
  }
  setPalette(palette: string): void { if (palette !== this.palette) { this.palette = palette; this.updatePalette(); this.buildTextMotion(); } }
  private get minimal(): boolean { return this.reducedMotion.matches || this.appearance.lowPower || this.appearance.lyricStyle === 'minimal'; }
  configure(key: string): void {
    this.key = /^sl_pk_[A-Za-z0-9_-]+$/.test(key.trim()) ? key.trim() : '';
    this.generation++;
    this.request?.abort(); this.attempted = ''; this.nextPoll = 0; this.nextRetry = 0; this.nextLyricRetry = 0; this.clear();
    this.status.textContent = this.key ? 'Waiting for the Windows companion.' : 'Add a Spicy key or enable LRCLIB fallback in settings.';
  }
  private clear(): void { this.layoutObserver.disconnect(); for (const item of this.lineMotion.values()) item.animation.stop(); this.lineMotion.clear(); this.textMotion.forEach(animation => animation.cancel()); this.textMotion = []; this.activeRow = null; this.lyrics = null; this.lyricStatus = ''; this.rendered = ''; this.current = -2; this.layer.replaceChildren(); this.setVisible(false); }
  private setVisible(value: boolean): void {
    if (this.root.dataset.lyrics === String(value)) return;
    this.visible = value; this.root.dataset.lyrics = String(value);
    if (!value) { this.textMotion.forEach(animation => animation.pause()); this.motionNeedsSync = true; }
  }
  tick(now: number, track: Track | null, enabled: boolean, allowPublic: boolean): void {
    if (this.suspended) { this.suspended = false; this.motionNeedsSync = true; for (const item of this.lineMotion.values()) item.animation.play(); }
    if (this.allowPublic !== allowPublic) { this.allowPublic = allowPublic; this.generation++; this.request?.abort(); this.attempted = ''; this.nextRetry = 0; this.nextLyricRetry = 0; this.clear(); }
    const song = track ? `${track.title}\n${track.artist || track.albumArtist}\n${track.album}` : '';
    if (song !== this.song) { this.song = song; this.generation++; this.request?.abort(); this.playback = null; this.attempted = ''; this.nextPoll = 0; this.nextRetry = 0; this.nextLyricRetry = 0; this.clear(); }
    if (!enabled || !track) { this.setVisible(false); return; }
    if (now >= this.nextPoll && !this.pending && now >= this.nextRetry) {
      this.nextPoll = now + 500; void this.poll(track);
    }
    const matches = this.playback;
    if (!matches || !this.lyrics || now - this.received > 3500) { this.setVisible(false); return; }
    this.setVisible(true);
    const position = playbackPosition(this.playback!, this.received, now);
    this.lastPosition = position;
    const index = this.lyrics.timed ? activeLine(this.lyrics.lines, position) : 0;
    if (index !== this.current) this.render(index);
    if (this.motionReduced !== this.minimal) { this.layoutLines(); this.buildTextMotion(); }
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
      this.motionNeedsSync = true;
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
  private render(index: number): void {
    if (!this.lyrics) return;
    this.current = index;
    const key = `${this.attempted}:${index}`; if (key === this.rendered) return; this.rendered = key;
    let stage = this.layer.querySelector<HTMLElement>('.lyrics-stage');
    if (!stage) { stage = document.createElement('div'); stage.className = 'lyrics-stage'; this.layer.append(stage); this.layoutObserver.observe(stage); }
    stage.classList.toggle('untimed', !this.lyrics.timed);
    const retained = new Set<string>();
    for (const [offset, className] of (this.lyrics.timed ? [[-2, 'past'], [-1, 'past'], [0, 'active'], [1, 'future'], [2, 'future']] : this.lyrics.lines.map((_, i) => [i, 'static'])) as [number, string][]) {
      const lineIndex = this.lyrics.timed ? Math.max(index, -1) + offset : offset;
      const line = this.lyrics.lines[lineIndex]; if (!line) continue;
      const id = String(lineIndex); retained.add(id);
      let p = stage.querySelector<HTMLElement>(`[data-line="${id}"]`);
      if (!p) {
        p = document.createElement('p'); p.className = 'lyric-line'; p.dir = 'auto'; p.dataset.line = id;
        this.appendWords(p, line);
        stage.append(p);
        this.layoutObserver.observe(p);
      }
      p.className = `lyric-line ${className}${p.classList.contains('joining-script') ? ' joining-script' : ''}`;
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
    if (stage.classList.contains('untimed')) return;
    const active = stage.querySelector<HTMLElement>('.active');
    const gap = parseFloat(getComputedStyle(stage).rowGap) || 82;
    for (const line of stage.querySelectorAll<HTMLElement>('.lyric-line')) {
      const offset = Number(line.style.getPropertyValue('--slot'));
      const distance = Math.max(gap, ((active?.offsetHeight || line.offsetHeight) + line.offsetHeight * .88) / 2 + 22);
      const transform = `translate3d(0,${-line.offsetHeight / 2 + offset * distance}px,0) scale(${offset === 0 ? 1 : .96})`;
      const outsideStage = stage.clientHeight / 2 + offset * distance + line.offsetHeight * .88 / 2 > stage.clientHeight + 24;
      const opacity = offset === 0 ? 1 : outsideStage ? 0 : Math.abs(offset) === 2 ? .16 : .38;
      const blur = this.minimal ? 'blur(0px)' : `blur(${Math.abs(offset) * 1.2}px)`;
      const target = `${transform}|${opacity}|${blur}|${this.minimal}`;
      const previous = this.lineMotion.get(line);
      if (previous?.target === target) continue;
      // Sample the displayed pose before stopping: rapid seeks never restart at a slot's origin.
      const current = getComputedStyle(line);
      const from = { transform: current.transform, opacity: current.opacity, filter: current.filter };
      previous?.animation.stop();
      if (!previous || this.minimal) {
        line.style.transform = transform; line.style.opacity = String(opacity); line.style.filter = blur;
      }
      const animation = animate(line, {
        transform: [previous && !this.minimal ? from.transform : transform, transform],
        opacity: [previous ? Number(from.opacity) : 0, opacity],
        filter: [previous && !this.minimal ? from.filter : blur, blur],
      }, { duration: this.minimal ? 0 : this.appearance.lyricStyle === 'classic' ? .3 : .85, ease: [.22, 1, .36, 1] });
      this.lineMotion.set(line, { target, animation });
    }
  }
  private buildTextMotion(): void {
    this.textMotion.forEach(animation => animation.cancel()); this.textMotion = [];
    this.motionReduced = this.minimal; this.motionNeedsSync = true;
    if (!this.activeRow) return;
    const ink = getComputedStyle(this.activeRow).color;
    const highlight = getComputedStyle(this.layer).getPropertyValue('--lyric-highlight').trim() || '#ffffff';
    const waiting = getComputedStyle(this.layer).getPropertyValue('--lyric-waiting').trim() || '#a8aaa4';
    for (const element of this.activeRow.querySelectorAll<HTMLElement>('[data-start]')) {
      const start = Number(element.dataset.start), end = Number(element.dataset.end);
      if (!Number.isFinite(start) || !(end > start)) continue;
      const syllable = element.classList.contains('lyric-syllable');
      const rtl = getComputedStyle(this.activeRow).direction === 'rtl';
      const strength = this.minimal || this.appearance.lyricStyle === 'classic' ? 0 : this.appearance.lyricIntensity;
      const frames: Keyframe[] = syllable ? [
        { color: waiting, backgroundPosition: rtl ? '0% 0%' : '100% 0%', offset: 0 },
        { color: highlight, backgroundPosition: rtl ? '20% 0%' : '80% 0%', offset: .2 },
        { color: ink, backgroundPosition: rtl ? '100% 0%' : '0% 0%', offset: 1 },
      ] : [
        { transform: 'translate3d(0,0,0) scale(1)' },
        { transform: `translate3d(0,${-3 * strength}px,0) scale(${1 + .025 * strength})` },
        { transform: 'translate3d(0,0,0) scale(1)' },
      ];
      if (!syllable && !strength) continue;
      // Preserve the provider's segment boundaries. Native text effects are
      // sampled from the companion clock, including the decorative glyph wave.
      const animation = element.animate(frames, { delay: start * 1000, duration: (end - start) * 1000, fill: 'both', easing: syllable ? 'linear' : 'ease-in-out' });
      animation.pause(); this.textMotion.push(animation);
    }
    for (const glyph of this.activeRow.querySelectorAll<HTMLElement>('.lyric-letter')) {
      const range = this.characterRanges.get(glyph); if (!range) continue;
      const strength = this.minimal || this.appearance.lyricStyle === 'classic' ? 0 : this.appearance.lyricIntensity;
      const joining = this.activeRow.classList.contains('joining-script');
      const pose = (lift: boolean) => joining ? {} : { transform: lift ? `translate3d(0,${-7 * strength}px,0) scale(${1 + .09 * strength})` : 'translate3d(0,0,0) scale(1)' };
      const animation = glyph.animate([
        { color: waiting, textShadow: '0 0 0 transparent', ...pose(false) },
        { color: highlight, textShadow: strength ? `0 0 ${12 * strength}px ${highlight}` : 'none', ...pose(true), offset: .5 },
        { color: ink, textShadow: '0 0 0 transparent', ...pose(false) },
      ], { ...characterWindow(range.start, range.end, range.index, range.count), fill: 'both', easing: 'ease-in-out' });
      animation.pause(); this.textMotion.push(animation);
    }
    if (this.playback) this.syncTextMotion(this.suspended ? this.lastPosition : playbackPosition(this.playback, this.received, performance.now()));
  }
  private syncTextMotion(position: number): void {
    if (!this.playback) return;
    const playing = this.playback.isPlaying && !this.suspended && this.visible;
    const changed = this.motionPlaying !== playing || this.motionRate !== this.playback.rate;
    for (const animation of this.textMotion) {
      const difference = Math.abs(Number(animation.currentTime || 0) - position * 1000);
      if (changed || !playing || difference > 250 || animation.playState === 'paused') animation.currentTime = position * 1000;
      animation.playbackRate = this.playback.rate;
      if (playing) { if (animation.playState !== 'running' && animation.playState !== 'finished') animation.play(); }
      else if (animation.playState !== 'paused') animation.pause();
    }
    this.motionPlaying = playing; this.motionRate = this.playback.rate; this.motionNeedsSync = false;
  }
  private appendWords(p: HTMLElement, line: LyricLine): void {
    this.remainingGlyphs = 320;
    // Inline color/glow preserves joining scripts. Independent character boxes
    // are used only where they do not break connected letter shapes.
    p.classList.toggle('joining-script', /[\p{Script=Arabic}\p{Script=Syriac}\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Tamil}\p{Script=Thai}]/u.test(line.text));
    if (!line.words.length) {
      if (this.lyrics?.timed) this.appendCharacters(p, line.text, line.start, line.end);
      else p.textContent = line.text;
      return;
    }
    let word: HTMLElement | null = null;
    for (const part of line.words) {
      if (!word) { word = document.createElement('span'); word.className = 'lyric-word'; p.append(word); }
      const segment = document.createElement('span'); segment.className = 'lyric-syllable';
      this.appendCharacters(segment, part.text, part.start, part.end);
      if (Number.isFinite(part.start) && part.end > part.start) {
        segment.dataset.start = String(part.start); segment.dataset.end = String(part.end);
      }
      word.append(segment);
      if (/\s$/u.test(part.text) || part === line.words[line.words.length - 1]) {
        const segments = Array.from(word.querySelectorAll<HTMLElement>('[data-start]'));
        if (segments.length === word.childElementCount && segments.length) {
          word.dataset.start = segments[0].dataset.start; word.dataset.end = segments[segments.length - 1].dataset.end;
        }
        word = null;
      }
    }
  }
  private appendCharacters(parent: HTMLElement, text: string, start: number, end: number): void {
    const parts = graphemes(text);
    // Very long rows keep the original segment sweep, bounding effect work.
    if (!Number.isFinite(start) || !(end > start) || parts.length > this.remainingGlyphs) { parent.textContent = text; return; }
    this.remainingGlyphs -= parts.length;
    const count = parts.filter(part => /\S/u.test(part)).length;
    let index = 0;
    let word: HTMLElement | null = null;
    const groupWords = parent.classList.contains('lyric-line');
    for (const part of parts) {
      if (!/\S/u.test(part)) { parent.append(part); word = null; continue; }
      if (groupWords && !word) { word = document.createElement('span'); word.className = 'lyric-word'; parent.append(word); }
      const glyph = document.createElement('span'); glyph.className = 'lyric-letter'; glyph.textContent = part;
      this.characterRanges.set(glyph, { start, end, index: index++, count }); (word || parent).append(glyph);
    }
    if (count) parent.classList.add('character-sweep');
  }
  suspend(): void {
    if (this.suspended) return;
    // Native animations can advance between rendered frames, especially with software WebGL.
    // Preserve the displayed timeline so appearance changes cannot rewind a paused phrase.
    const displayed = this.textMotion.find(animation => animation.currentTime !== null)?.currentTime;
    if (typeof displayed === 'number') this.lastPosition = displayed / 1000;
    this.suspended = true;
    this.textMotion.forEach(animation => { animation.pause(); animation.currentTime = this.lastPosition * 1000; });
    for (const item of this.lineMotion.values()) item.animation.pause();
  }
  dispose(): void { this.disposed = true; this.clear(); this.request?.abort(); }
}
