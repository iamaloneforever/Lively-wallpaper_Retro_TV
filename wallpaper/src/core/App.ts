import { AudioEngine } from '../audio/AudioEngine';
import { MusicStore } from '../music/MusicStore';
import { LivelyBridge } from '../lively/LivelyBridge';
import { ScreenPainter } from '../ui/ScreenPainter';
import { SceneManager } from '../graphics/SceneManager';
import { demoArtwork, demoSpectrum, demoTracks } from '../ui/Demo';
import { settingsMarkup } from '../ui/Settings';
import { defaults, loadConfig, nextMode, saveConfig } from './Config';
import { LyricsController } from '../lyrics/LyricsController';
import { SongPicker } from '../ui/SongPicker';

export class App {
  private config = loadConfig();
  private audio = new AudioEngine();
  private store = new MusicStore();
  private bridge = new LivelyBridge(this.store, this.audio);
  private painter = new ScreenPainter();
  private scene: SceneManager | null = null;
  private powered = true;
  private demo = false;
  private demoIndex = 0;
  private demoBass = 1;
  private demoTreble = 1;
  private nextTrackTime = 0;
  private frame = 0;
  private lastFrame = 0;
  private lastPaint = 0;
  private demoTimer = 0;
  private backgroundPalette = '';
  private lyrics: LyricsController;
  private songPicker: SongPicker;
  private unsubscribe: () => void;
  private disposers: (() => void)[] = [];
  private query<T extends HTMLElement = HTMLElement>(selector: string): T { return this.root.querySelector<T>(selector)!; }
  constructor(private root: HTMLElement) {
    root.innerHTML = `<main><div id="lyrics" class="lyrics-layer" aria-label="Song lyrics"></div><div id="scene" class="scene"></div>
      <div class="controls"><button id="channel-button" class="control-button" aria-label="Switch display channel"><span class="button-symbol" aria-hidden="true">⇄</span><span>Channel</span><span id="channel-number">01</span></button><button id="find-song" class="control-button" disabled>Find song</button></div>
      <span class="accessible-track" id="signal" aria-live="polite">WAITING FOR LIVELY</span>
      <div class="accessible-track" aria-live="polite" id="accessible-track">Waiting for media</div></main>
      <aside class="settings" id="settings" role="dialog" aria-modal="true" aria-labelledby="settings-heading" hidden>${settingsMarkup(this.config)}</aside>`;
    root.dataset.powered = 'true'; root.dataset.source = 'waiting';
    this.lyrics = new LyricsController(root, this.query('#lyrics'));
    this.songPicker = new SongPicker(root, candidate => this.lyrics.selectSong(candidate));
    this.lyrics.onContext = (identity, playback, enabled, allowPublic, hasLyrics) => this.songPicker.setContext(identity, playback, enabled, allowPublic, hasLyrics);
    this.lyrics.onMissingLyrics = () => this.songPicker.missingLyrics();
    let lyricsKey = ''; try { lyricsKey = localStorage.getItem('retrowave-spicy-key') || ''; } catch { /* Restricted storage. */ }
    this.query<HTMLInputElement>('#spicy-key').value = lyricsKey;
    this.lyrics.configure(lyricsKey);
    this.query('h2').id = 'settings-heading';
    this.unsubscribe = this.store.subscribe((track, changed) => {
      this.painter.setTrack(track, changed, this.demo && track ? demoArtwork(this.demoIndex) : undefined);
      this.query('#accessible-track').textContent = track ? `${this.demo ? 'Demo: ' : ''}${track.title} — ${track.artist || track.albumArtist}` : 'Standby — waiting for media';
    });
    this.bridge.onConnection = () => {
      clearTimeout(this.demoTimer);
      if (this.demo) { this.demo = false; this.painter.demo = false; this.store.update(null); }
      this.updateSignal();
    };
    try {
      this.scene = new SceneManager(this.query('#scene'), this.painter);
      this.scene.onAction = action => {
        if (action === 'power') this.togglePower();
        if (action === 'channel') this.changeChannel();
        if (action === 'intensity') { this.config.intensity = this.config.intensity >= 1.4 ? 0.3 : this.config.intensity + 0.15; this.applyConfig(); }
        if (action === 'brightness') { this.config.brightness = this.config.brightness >= 1.4 ? 0.5 : this.config.brightness + 0.15; this.applyConfig(); }
      };
    } catch {
      this.query('#scene').innerHTML = `<div class="fallback"><span class="eyebrow">THE SIGNAL NEEDS WEBGL 2</span><h2>A moment of quiet.</h2><p>Your browser or graphics driver could not create the 3D scene.<br>Enable hardware acceleration and reopen this page.</p><canvas id="fallback-screen" width="1024" height="768" aria-label="Fallback music display"></canvas></div>`;
    }
    this.bindUI(); this.applyConfig();
    if (new URLSearchParams(location.search).get('settings') === '1') this.openSettings(true);
    // Receiving a real callback is the only host detection signal. Defining functions proves nothing.
    const liveOnly = new URLSearchParams(location.search).get('live') === '1';
    if (!liveOnly) this.demoTimer = window.setTimeout(() => {
      if (!this.bridge.mediaReceived && !this.bridge.audioReceived) { this.demo = true; this.painter.demo = true; this.nextDemo(); this.updateSignal(); }
    }, 2500);
    else this.updateSignal();
    this.frame = requestAnimationFrame(this.animate);
    const cleanup = () => this.dispose(); window.addEventListener('pagehide', cleanup, { once: true }); this.disposers.push(() => window.removeEventListener('pagehide', cleanup));
  }
  private listen(element: HTMLElement, type: string, fn: EventListener): void { element.addEventListener(type, fn); this.disposers.push(() => element.removeEventListener(type, fn)); }
  private bindUI(): void {
    const panel = this.query('#settings');
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'click', 'wheel', 'touchstart', 'touchmove']) {
      this.listen(panel, type, event => event.stopPropagation());
    }
    for (const slider of panel.querySelectorAll<HTMLInputElement>('input[type=range]')) {
      const output = document.createElement('output'); output.value = slider.value; slider.before(output);
      this.listen(slider, 'input', () => { output.value = slider.value; });
    }
    this.listen(this.query('#save-lyrics-key'), 'click', () => {
      const input = this.query<HTMLInputElement>('#spicy-key');
      const key = input.value.trim();
      if (key && !/^sl_pk_[A-Za-z0-9_-]+$/.test(key)) {
        input.setAttribute('aria-invalid', 'true');
        this.query('#lyrics-key-feedback').textContent = 'Use a publishable sl_pk_ key. Secret keys cannot be used in this wallpaper.';
        return;
      }
      input.removeAttribute('aria-invalid'); this.query('#lyrics-key-feedback').textContent = '';
      try { if (key) localStorage.setItem('retrowave-spicy-key', key); else localStorage.removeItem('retrowave-spicy-key'); } catch { /* Session-only key. */ }
      this.lyrics.configure(key);
    });
    this.listen(this.query('#channel-button'), 'click', () => this.changeChannel());
    this.listen(this.query('#find-song'), 'click', () => this.songPicker.open());
    this.listen(this.query('#power-button'), 'click', () => this.togglePower());
    this.listen(this.query('#close-settings'), 'click', () => this.openSettings(false));
    this.listen(this.query('#next-track'), 'click', () => { if (this.demo) { this.demoIndex = (this.demoIndex + 1) % demoTracks.length; this.nextDemo(); } });
    this.listen(this.query('#demo-bass'), 'input', event => { this.demoBass = Number((event.target as HTMLInputElement).value); });
    this.listen(this.query('#demo-treble'), 'input', event => { this.demoTreble = Number((event.target as HTMLInputElement).value); });
    this.listen(this.query('#reset-settings'), 'click', () => { this.config = { ...defaults }; this.applyConfig(); });
    for (const element of this.root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-setting]')) {
      const update = () => {
        const key = element.dataset.setting!;
        const value = element instanceof HTMLInputElement && element.type === 'checkbox' ? element.checked : ['brightness', 'intensity', 'fps', 'lyricSize', 'lyricIntensity'].includes(key) ? Number(element.value) : element.value;
        Object.assign(this.config, { [key]: value }); this.applyConfig();
      };
      this.listen(element, 'input', update);
      this.listen(element, 'change', update);
    }
    const keydown = (event: KeyboardEvent) => {
      if (this.root.querySelector<HTMLDialogElement>('#song-picker')?.open) return;
      if (event.key === 'Escape') this.openSettings(false);
      if (event.key.toLowerCase() === 's' && !event.ctrlKey && !event.altKey && !event.metaKey && !(event.target as HTMLElement).closest('input,select,textarea,[contenteditable=true]')) this.openSettings(this.query('#settings').hidden);
      const panel = this.query('#settings');
      if (event.key === 'Tab' && !panel.hidden) {
        const items = panel.querySelectorAll<HTMLElement>('button, input, select'); const first = items[0]; const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown); this.disposers.push(() => document.removeEventListener('keydown', keydown));
  }
  private updateSignal(): void {
    const label = this.demo ? 'BROWSER DEMO' : this.bridge.mediaReceived || this.bridge.audioReceived ? 'LIVELY CONNECTED' : 'WAITING FOR LIVELY';
    this.query('#signal').textContent = label;
    this.root.dataset.source = this.demo ? 'demo' : this.bridge.mediaReceived || this.bridge.audioReceived ? 'live' : 'waiting';
    this.query('#diagnostics').textContent = `Metadata: ${this.bridge.mediaReceived ? 'callback received' : 'not received'}. Audio: ${this.bridge.audioReceived ? 'callback received' : 'not received'}. ${this.demo ? 'Simulated preview active.' : 'Waiting for real system data.'}`;
    this.query<HTMLButtonElement>('#next-track').disabled = !this.demo;
  }
  private openSettings(open: boolean): void {
    this.query('#settings').hidden = !open;
    if (this.scene) this.scene.interactionEnabled = !open;
    this.query('main').inert = open;
    (open ? this.query('#close-settings') : this.query('#channel-button')).focus({ preventScroll: true });
  }
  private togglePower(): void { this.powered = !this.powered; this.root.dataset.powered = String(this.powered); this.query('#power-button').setAttribute('aria-pressed', String(this.powered)); this.applyConfig(); }
  private changeChannel(): void { this.config.mode = nextMode(this.config.mode); this.painter.transition = performance.now() / 1000; this.applyConfig(); }
  private applyConfig(): void {
    this.lyrics.setAppearance(this.config);
    const saved = saveConfig(this.config);
    this.query('#settings-save-status').textContent = saved ? 'Settings saved automatically.' : 'Settings apply for this session. This host has blocked persistent storage.';
    this.scene?.tv.configure(this.config, this.powered);
    this.root.dataset.mode = this.config.mode;
    this.query('#channel-number').textContent = this.config.mode === 'broadcast' ? '01' : '02';
    for (const element of this.root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-setting]')) {
      const value = this.config[element.dataset.setting as keyof typeof this.config];
      if (element instanceof HTMLInputElement && element.type === 'checkbox') element.checked = Boolean(value); else element.value = String(value);
      if (element instanceof HTMLInputElement && element.type === 'range') { const output = element.previousElementSibling; if (output instanceof HTMLOutputElement) output.value = element.value; }
    }
  }
  private nextDemo(): void { this.store.update(demoTracks[this.demoIndex]); this.nextTrackTime = performance.now() + 35000; }
  private animate = (now: number): void => {
    this.frame = requestAnimationFrame(this.animate);
    if (document.hidden || this.bridge.paused || this.scene?.contextLost) { this.lyrics.suspend(); this.lastFrame = now; return; }
    const interval = 1000 / (this.config.lowPower ? 30 : this.config.fps);
    if (now - this.lastFrame < interval - 0.8) return;
    const dt = Math.min(0.1, (now - (this.lastFrame || now - interval)) / 1000); this.lastFrame = now;
    const time = now / 1000;
    this.lyrics.tick(now, this.demo ? null : this.store.track, this.config.lyrics && this.powered, this.config.publicLyrics);
    if (this.scene) this.scene.lyricsVisible = this.lyrics.visible;
    if (this.demo && this.powered) {
      this.audio.update(demoSpectrum(time, this.demoBass, this.demoTreble), now);
      if (now > this.nextTrackTime) { this.demoIndex = (this.demoIndex + 1) % demoTracks.length; this.nextDemo(); }
    }
    this.audio.tick(dt, now);
    const palette = this.painter.palette.join(',');
    if (palette !== this.backgroundPalette) {
      this.backgroundPalette = palette;
      this.lyrics.setPalette(palette);
      this.painter.palette.forEach((color, i) => this.root.style.setProperty(`--cover-${i + 1}`, color));
    }
    if (now - this.lastPaint > (this.config.lowPower ? 100 : 1000 / 30)) {
      this.painter.paint(time, this.config, this.audio, this.powered); this.lastPaint = now;
      if (!this.scene) {
        this.query<HTMLCanvasElement>('#fallback-screen').getContext('2d')?.drawImage(this.painter.canvas, 0, 0);
      }
    }
    this.scene?.render(time, dt, this.config, this.audio, this.painter, this.powered);
  };
  dispose(): void {
    cancelAnimationFrame(this.frame); clearTimeout(this.demoTimer); this.unsubscribe(); this.disposers.forEach(fn => fn()); this.songPicker.dispose(); this.lyrics.dispose(); this.scene?.dispose(); this.painter.dispose(); this.bridge.dispose();
  }
}
