import { AudioEngine } from '../audio/AudioEngine';
import { MusicStore } from '../music/MusicStore';
import { LivelyBridge } from '../lively/LivelyBridge';
import { ScreenPainter } from '../ui/ScreenPainter';
import { SceneManager } from '../graphics/SceneManager';
import { demoArtwork, demoSpectrum, demoTracks } from '../ui/Demo';
import { settingsMarkup } from '../ui/Settings';
import { defaults, loadConfig, nextMode, saveConfig } from './Config';

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
  private unsubscribe: () => void;
  private disposers: (() => void)[] = [];
  private query<T extends HTMLElement = HTMLElement>(selector: string): T { return this.root.querySelector<T>(selector)!; }
  constructor(private root: HTMLElement) {
    root.innerHTML = `<header class="header"><a class="brand" href="#" aria-label="RetroWave TV home"><span class="brand-icon"><i></i></span><span>retrowave<span class="brand-tv">TV</span></span></a><div class="header-right"><span class="signal" id="signal"><i></i> SEARCHING FOR SIGNAL</span><button class="icon-button" id="settings-button" aria-label="Open settings" aria-expanded="false">⚙</button></div></header>
      <main><div class="intro"><span class="eyebrow">OLD SOUL. NEW FREQUENCY.</span><h1>Tune into a<br><em>different time.</em></h1><p>Your music, through a warmer lens.</p></div>
      <div id="scene" class="scene"></div><div class="edition"><span>MODEL Nº 074</span><i></i><span>EST. IN ANOTHER ERA</span></div>
      <div class="scene-hint"><span>↔</span> DRAG TO EXPLORE <b>·</b> CLICK THE DIALS TO TUNE</div>
      <div class="controls"><div class="channel-label"><span class="eyebrow">YOU’RE WATCHING</span><strong id="mode-name">Vintage broadcast</strong></div><div class="control-divider"></div><button id="channel-button" class="control-button" aria-label="Switch display channel"><span class="button-symbol">⇄</span><span>Change channel</span><kbd id="channel-number">01</kbd></button><button id="power-button" class="power-button" aria-label="Toggle television power" aria-pressed="true">⏻</button></div>
      <p class="demo-note" id="demo-note" hidden>PREVIEW MODE <span>•</span> Fictional music. Real nostalgia.</p>
      <div class="accessible-track" aria-live="polite" id="accessible-track">Waiting for media</div></main>
      <footer><span>A LITTLE ANALOG IN A DIGITAL WORLD.</span><button class="text-button" id="wallpaper-button">Wallpaper view <span>↗</span></button><span class="footer-right">WEBGL <i></i> BUILT FOR LIVELY</span></footer>
      <aside class="settings" id="settings" role="dialog" aria-modal="true" aria-labelledby="settings-heading" hidden>${settingsMarkup(this.config)}</aside>`;
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
    this.listen(this.query('#channel-button'), 'click', () => this.changeChannel());
    this.listen(this.query('#power-button'), 'click', () => this.togglePower());
    this.listen(this.query('#settings-button'), 'click', () => this.openSettings(true));
    this.listen(this.query('#close-settings'), 'click', () => this.openSettings(false));
    this.listen(this.query('#next-track'), 'click', () => { if (this.demo) { this.demoIndex = (this.demoIndex + 1) % demoTracks.length; this.nextDemo(); } });
    this.listen(this.query('#demo-bass'), 'input', event => { this.demoBass = Number((event.target as HTMLInputElement).value); });
    this.listen(this.query('#demo-treble'), 'input', event => { this.demoTreble = Number((event.target as HTMLInputElement).value); });
    this.listen(this.query('#reset-settings'), 'click', () => { this.config = { ...defaults }; this.applyConfig(); });
    this.listen(this.query('#wallpaper-button'), 'click', () => { document.body.classList.toggle('wallpaper-view'); this.query('#wallpaper-button').textContent = document.body.classList.contains('wallpaper-view') ? 'Exit wallpaper view ↗' : 'Wallpaper view ↗'; });
    for (const element of this.root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-setting]')) {
      this.listen(element, 'input', () => {
        const key = element.dataset.setting!;
        const value = element instanceof HTMLInputElement && element.type === 'checkbox' ? element.checked : ['brightness', 'intensity', 'fps'].includes(key) ? Number(element.value) : element.value;
        Object.assign(this.config, { [key]: value }); this.applyConfig();
      });
    }
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { this.openSettings(false); document.body.classList.remove('wallpaper-view'); }
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
    this.query('#signal').innerHTML = `<i></i> ${label}`; this.query('#signal').classList.toggle('live', !this.demo && (this.bridge.mediaReceived || this.bridge.audioReceived));
    this.query('#demo-note').hidden = !this.demo;
    this.query('#diagnostics').textContent = `Metadata: ${this.bridge.mediaReceived ? 'callback received' : 'not received'}. Audio: ${this.bridge.audioReceived ? 'callback received' : 'not received'}. ${this.demo ? 'Simulated preview active.' : 'Waiting for real system data.'}`;
    this.query<HTMLButtonElement>('#next-track').disabled = !this.demo;
  }
  private openSettings(open: boolean): void {
    this.query('#settings').hidden = !open; this.query('#settings-button').setAttribute('aria-expanded', String(open));
    (open ? this.query('#close-settings') : this.query('#settings-button')).focus();
  }
  private togglePower(): void { this.powered = !this.powered; this.query('#power-button').setAttribute('aria-pressed', String(this.powered)); this.applyConfig(); }
  private changeChannel(): void { this.config.mode = nextMode(this.config.mode); this.painter.transition = performance.now() / 1000; this.applyConfig(); }
  private applyConfig(): void {
    saveConfig(this.config); this.scene?.tv.configure(this.config, this.powered);
    this.query('#mode-name').textContent = this.config.mode === 'broadcast' ? 'Vintage broadcast' : 'Minimal vinyl'; this.query('#channel-number').textContent = this.config.mode === 'broadcast' ? '01' : '02';
    for (const element of this.root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-setting]')) {
      const value = this.config[element.dataset.setting as keyof typeof this.config];
      if (element instanceof HTMLInputElement && element.type === 'checkbox') element.checked = Boolean(value); else element.value = String(value);
    }
  }
  private nextDemo(): void { this.store.update(demoTracks[this.demoIndex]); this.nextTrackTime = performance.now() + 35000; }
  private animate = (now: number): void => {
    this.frame = requestAnimationFrame(this.animate);
    if (document.hidden || this.bridge.paused || this.scene?.contextLost) { this.lastFrame = now; return; }
    const interval = 1000 / (this.config.lowPower ? 30 : this.config.fps);
    if (now - this.lastFrame < interval - 0.8) return;
    const dt = Math.min(0.1, (now - (this.lastFrame || now - interval)) / 1000); this.lastFrame = now;
    const time = now / 1000;
    if (this.demo && this.powered) {
      this.audio.update(demoSpectrum(time, this.demoBass, this.demoTreble), now);
      if (now > this.nextTrackTime) { this.demoIndex = (this.demoIndex + 1) % demoTracks.length; this.nextDemo(); }
    }
    this.audio.tick(dt, now);
    if (now - this.lastPaint > (this.config.lowPower ? 100 : 1000 / 30)) {
      this.painter.paint(time, this.config, this.audio, this.powered); this.lastPaint = now;
      if (!this.scene) {
        this.query<HTMLCanvasElement>('#fallback-screen').getContext('2d')?.drawImage(this.painter.canvas, 0, 0);
      }
    }
    this.scene?.render(time, dt, this.config, this.audio, this.painter, this.powered);
  };
  dispose(): void {
    cancelAnimationFrame(this.frame); clearTimeout(this.demoTimer); this.unsubscribe(); this.disposers.forEach(fn => fn()); this.scene?.dispose(); this.painter.dispose(); this.bridge.dispose();
  }
}
