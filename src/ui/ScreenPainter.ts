import { CanvasTexture, SRGBColorSpace } from 'three';
import type { Config } from '../core/Config';
import type { Track } from '../lively/types';
import type { AudioEngine } from '../audio/AudioEngine';

export class ScreenPainter {
  readonly canvas = document.createElement('canvas');
  readonly texture: CanvasTexture;
  private ctx: CanvasRenderingContext2D;
  private artwork: HTMLImageElement | HTMLCanvasElement | null = null;
  private previous: HTMLImageElement | HTMLCanvasElement | null = null;
  private request = 0;
  transition = -100;
  accent = '#d6ae75';
  track: Track | null = null;
  demo = false;
  constructor() {
    this.canvas.width = 1024; this.canvas.height = 768;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new CanvasTexture(this.canvas); this.texture.colorSpace = SRGBColorSpace;
  }
  setTrack(track: Track | null, changed: boolean, artwork?: HTMLCanvasElement): void {
    this.track = track;
    const id = ++this.request;
    if (changed) { this.previous = this.artwork; this.transition = performance.now() / 1000; }
    if (artwork) { this.artwork = artwork; this.extractAccent(artwork); return; }
    if (!track?.thumbnail) { this.artwork = null; return; }
    const image = new Image();
    image.onload = () => { if (id === this.request) { this.artwork = image.naturalWidth * image.naturalHeight <= 33_554_432 ? image : null; if (this.artwork) this.extractAccent(image); } };
    image.onerror = () => { if (id === this.request) this.artwork = null; };
    image.src = track.thumbnail;
  }
  private extractAccent(image: CanvasImageSource): void {
    const c = document.createElement('canvas'); c.width = c.height = 1;
    const ctx = c.getContext('2d')!; ctx.drawImage(image, 0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    this.accent = `rgb(${Math.max(85, r)},${Math.max(75, g)},${Math.max(65, b)})`;
  }
  private text(text: string, x: number, y: number, size: number, color: string, maxWidth = 800, serif = false): void {
    const ctx = this.ctx;
    ctx.font = `${serif ? 'normal' : '500'} ${size}px ${serif ? 'Georgia' : 'monospace'}`; ctx.fillStyle = color;
    let display = text;
    while (ctx.measureText(display).width > maxWidth && display.length > 1) display = display.slice(0, -1);
    if (display !== text) display = display.slice(0, -1) + '…';
    ctx.fillText(display, x, y);
  }
  private art(image: CanvasImageSource | null, x: number, y: number, size: number, alpha = 1): void {
    const ctx = this.ctx; ctx.save(); ctx.globalAlpha = alpha;
    ctx.fillStyle = '#25382f'; ctx.fillRect(x, y, size, size);
    if (image) {
      const w = image instanceof HTMLImageElement ? image.naturalWidth : (image as HTMLCanvasElement).width;
      const h = image instanceof HTMLImageElement ? image.naturalHeight : (image as HTMLCanvasElement).height;
      const crop = Math.min(w, h); ctx.drawImage(image, (w - crop) / 2, (h - crop) / 2, crop, crop, x, y, size, size);
    } else {
      ctx.strokeStyle = '#91ad97'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size * 0.29, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + size / 2, y + size / 2, size * 0.03, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  paint(time: number, config: Config, audio: AudioEngine, powered: boolean): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#101e19'; ctx.fillRect(0, 0, 1024, 768);
    if (!powered || !this.track) {
      for (let i = 0; i < 7; i++) { ctx.fillStyle = ['#bdbe9a', '#b0a374', '#6b947d', '#66878a', '#866d81', '#975f5f', '#383f35'][i]; ctx.fillRect(85 + i * 122, 215, 122, 210); }
      this.text('RETROWAVE', 310, 140, 48, '#e2d5ae', 600, true);
      this.text(powered ? 'WAITING FOR A SIGNAL' : 'STANDBY', 255, 507, 31, '#d1c6a4');
      this.text('A LITTLE QUIET. A LITTLE NOSTALGIA.', 200, 575, 22, '#869988');
      this.text('CH 01   •   STEREO', 360, 681, 19, '#869988');
      this.texture.needsUpdate = true; return;
    }
    const track = this.track;
    const fade = Math.min(1, Math.max(0, (time - this.transition) / 0.75));
    this.text(this.demo ? 'DEMO BROADCAST / FICTIONAL MUSIC' : 'NOW PLAYING / LIVE MEDIA SESSION', 68, 70, 18, '#c1bb9a');
    ctx.fillStyle = '#627a66'; ctx.fillRect(68, 95, 888, 1);
    if (config.clock) this.text(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }), 844, 70, 18, '#c1bb9a', 130);
    if (config.mode === 'broadcast') {
      this.art(this.previous, 68, 133, 382);
      this.art(this.artwork, 68, 133, 382, fade);
      this.text('ON THE AIR', 499, 167, 17, '#91ad97');
      this.text(track.title || 'Untitled media', 494, 236, 46, '#e5dfbc', 460, true);
      this.text(track.artist || track.albumArtist || 'Artist unavailable', 499, 291, 25, '#b8c3a4', 450);
      this.text(track.album || 'Album unavailable', 499, 344, 19, '#859b85', 450);
      this.text(track.subtitle || track.genres.join(' / ') || 'ANALOG SOUL. DIGITAL HEART.', 499, 414, 16, '#859b85', 445);
      this.text(track.trackNumber ? `TRACK ${String(track.trackNumber).padStart(2, '0')}` : 'STEREO • FM', 499, 492, 18, '#c1bb9a');
    } else {
      this.art(this.previous, 303, 125, 418); this.art(this.artwork, 303, 125, 418, fade);
      ctx.textAlign = 'center'; this.text(track.title || 'Untitled media', 512, 600, 38, '#e5dfbc', 850, true);
      this.text(`${track.artist || track.albumArtist || 'Artist unavailable'}  /  ${track.album || 'Album unavailable'}`, 512, 638, 19, '#b8c3a4', 840); ctx.textAlign = 'left';
    }
    const y = config.mode === 'broadcast' ? 636 : 717;
    const height = config.mode === 'broadcast' ? 83 : 28;
    for (let i = 0; i < 64; i++) {
      const level = audio.spectrum[i * 2]; const h = Math.max(2, level * height * config.intensity);
      ctx.fillStyle = i % 5 === 0 ? '#d0bd87' : '#819c77'; ctx.fillRect(70 + i * 14, y - h, 8, h);
      ctx.fillStyle = '#c0bf96'; ctx.fillRect(70 + i * 14, y - audio.peaks[i * 2] * height * config.intensity - 3, 8, 1);
    }
    if (config.mode === 'broadcast') {
      this.text('20 Hz', 68, 672, 14, '#71836c'); this.text('20 kHz', 866, 672, 14, '#71836c');
      ctx.fillStyle = '#627a66'; ctx.fillRect(68, 704, 888, 1);
      this.text('RETROWAVE MUSIC TELEVISION', 68, 737, 16, '#a7ae8c'); this.text('CH 01', 891, 737, 16, '#a7ae8c');
    }
    this.texture.needsUpdate = true;
  }
  dispose(): void { this.request++; this.texture.dispose(); }
}
