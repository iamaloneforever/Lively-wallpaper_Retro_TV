import { effectStorageKey, matchesEffect, maxEffectFileBytes, mergeEffects, parseEffectFile, starterEffect, type CustomEffect, type EffectFile } from '../background/CustomEffects';
import type { Track } from '../lively/types';

export const customEffectsMarkup = `
  <div class="section-label">Custom song effects</div>
  <label class="toggle-row"><span>Enable custom effects</span><input id="custom-effects-enabled" type="checkbox" checked><span class="switch"></span></label>
  <p class="panel-note">Create a JSON file with layers, animation and audio reactivity, or write your own shader. Download a starter for the current song, edit it, then import it. Reimporting the same ID updates it.</p>
  <button class="outline-button" id="custom-effect-starter">Download starter for current song</button>
  <label class="field">Import effect file (.json)<input id="custom-effect-file" type="file" accept=".json,application/json" aria-describedby="custom-effect-feedback"></label>
  <p class="panel-note" id="custom-effect-feedback" role="alert"></p>
  <p class="panel-note" id="custom-effect-status" role="status"></p>
  <div id="custom-effect-list" class="custom-effect-list" aria-label="Saved custom effects"></div>
  <button class="outline-button" id="custom-effect-stop" hidden>Stop effect preview</button>
  <button class="outline-button" id="custom-effect-export">Export all custom effects</button>
  <p class="panel-note">Effects are saved in this browser / Lively profile. Export a backup to move them to another profile. Custom effects follow brightness, animation and reduced-motion settings. <a href="${import.meta.env.BASE_URL}effects/guide.html" target="_blank" rel="noopener noreferrer">Effect file guide and examples ↗</a></p>`;

export class CustomEffectControls {
  private file: EffectFile = { version: 1, effects: [] };
  private enabled = true;
  private preview: string | null = null;
  private removers: (() => void)[] = [];
  private generation = 0;
  private disposed = false;
  private trackIdentity = '';
  private query<T extends HTMLElement = HTMLElement>(selector: string): T { return this.root.querySelector<T>(selector)!; }
  constructor(private root: HTMLElement, private getTrack: () => Track | null, private validate: (effects: readonly CustomEffect[]) => void, private select: (effect: CustomEffect | null, restart: boolean) => void) {
    try {
      this.enabled = localStorage.getItem(`${effectStorageKey}-enabled`) !== 'false';
      const saved = localStorage.getItem(effectStorageKey);
      if (saved) { const file = parseEffectFile(saved); this.validate(file.effects); this.file = file; }
    } catch (error) { this.feedback(`Saved effects could not load: ${(error as Error).message}`); }
    this.query<HTMLInputElement>('#custom-effects-enabled').checked = this.enabled;
    this.listen(this.query('#custom-effects-enabled'), 'change', () => {
      const enabled = this.query<HTMLInputElement>('#custom-effects-enabled').checked;
      try { localStorage.setItem(`${effectStorageKey}-enabled`, String(enabled)); this.enabled = enabled; this.preview = null; this.feedback(''); this.refresh(); }
      catch { this.query<HTMLInputElement>('#custom-effects-enabled').checked = this.enabled; this.feedback('Could not save this preference.'); }
    });
    this.listen(this.query('#custom-effect-file'), 'change', () => { void this.importFile(); });
    this.listen(this.query('#custom-effect-starter'), 'click', () => this.download(starterEffect(this.getTrack()), 'my-song-effect.json'));
    this.listen(this.query('#custom-effect-export'), 'click', () => this.download(this.file, 'spicy-bond-effects.json'));
    this.listen(this.query('#custom-effect-stop'), 'click', () => { this.preview = null; this.refresh(); });
    this.listen(this.query('#custom-effect-list'), 'click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
      const effect = this.file.effects.find(effect => effect.id === button?.dataset.id);
      if (!button || !effect) return;
      if (button.dataset.action === 'export') this.download({ version: 1, effects: [effect] }, `${effect.id}.json`);
      if (button.dataset.action === 'preview') {
        this.preview = effect.id; this.refresh(true);
      }
      if (button.dataset.action === 'toggle') this.save({ version: 1, effects: this.file.effects.map(row => row.id === effect.id ? { ...row, enabled: !row.enabled } : row) });
      if (button.dataset.action === 'remove') this.save({ version: 1, effects: this.file.effects.filter(row => row.id !== effect.id) });
    });
    this.refresh();
  }
  private listen(element: HTMLElement, type: string, listener: EventListener): void { element.addEventListener(type, listener); this.removers.push(() => element.removeEventListener(type, listener)); }
  private feedback(message: string): void { this.query('#custom-effect-feedback').textContent = message; }
  private async importFile(): Promise<void> {
    const input = this.query<HTMLInputElement>('#custom-effect-file'), file = input.files?.[0], generation = ++this.generation;
    if (!file) return;
    try {
      if (file.size > maxEffectFileBytes) throw new Error('Maximum file size is 512 KiB.');
      const incoming = parseEffectFile(await file.text());
      if (this.disposed || generation !== this.generation) return;
      const merged = mergeEffects(this.file, incoming);
      this.validate(incoming.effects);
      if (this.save(merged)) this.feedback(`Imported ${incoming.effects.length} effect${incoming.effects.length === 1 ? '' : 's'}. Matching songs use them automatically; Preview tries an effect on any song.`);
    } catch (error) { if (!this.disposed && generation === this.generation) this.feedback(`Import failed: ${(error as Error).message}. Your saved effects were kept.`); }
    finally { if (!this.disposed && generation === this.generation) input.value = ''; }
  }
  private save(file: EffectFile): boolean {
    try {
      const text = JSON.stringify(file);
      if (new TextEncoder().encode(text).length > maxEffectFileBytes) throw new Error('Combined library exceeds 512 KiB; remove some effects.');
      localStorage.setItem(effectStorageKey, text);
      this.file = file; this.preview = null; this.feedback(''); this.refresh(); return true;
    } catch (error) { this.feedback(`Could not save effects: ${(error as Error).message}. Your saved effects were kept.`); return false; }
  }
  trackChanged(): void {
    const track = this.getTrack(), identity = JSON.stringify(track && [track.title, track.artist, track.albumArtist, track.album]);
    if (identity === this.trackIdentity) return;
    this.trackIdentity = identity; this.preview = null; this.refresh(true);
  }
  private refresh(restart = false): void {
    const active = this.enabled ? this.file.effects.find(effect => effect.id === this.preview) ?? [...this.file.effects].reverse().find(effect => matchesEffect(effect, this.getTrack())) ?? null : null;
    this.select(active, restart); this.root.dataset.customEffect = active?.id || '';
    this.query('#custom-effect-status').textContent = !this.enabled ? 'Custom effects are disabled.' : active ? `${this.preview ? 'Previewing' : 'Active'}: ${active.name}` : this.file.effects.length ? 'No custom effect matches the current song.' : 'No custom effects imported yet.';
    this.query('#custom-effect-stop').hidden = !this.preview;
    this.query<HTMLButtonElement>('#custom-effect-export').disabled = !this.file.effects.length;
    const list = this.query('#custom-effect-list'); list.replaceChildren();
    for (const effect of this.file.effects) {
      const item = document.createElement('div'); item.className = 'custom-effect-item';
      const title = document.createElement('strong'); title.textContent = effect.name; item.append(title);
      const description = document.createElement('p'); description.className = 'panel-note'; description.textContent = `${effect.match.titles.join(' / ')} — ${effect.match.artists.join(' / ')}${effect.enabled ? '' : ' (disabled)'}`; item.append(description);
      const actions = document.createElement('div'); actions.className = 'custom-effect-actions';
      for (const [action, label] of [['preview', 'Preview'], ['toggle', effect.enabled ? 'Disable' : 'Enable'], ['export', 'Export'], ['remove', 'Remove']]) {
        const button = document.createElement('button'); button.className = 'outline-button'; button.textContent = label;
        button.dataset.action = action; button.dataset.id = effect.id; button.setAttribute('aria-label', `${label} ${effect.name}`);
        if (action === 'preview') button.disabled = !this.enabled;
        actions.append(button);
      }
      item.append(actions); list.append(item);
    }
  }
  private download(file: EffectFile, name: string): void {
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2) + '\n'], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = name; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  dispose(): void { this.disposed = true; this.generation++; this.removers.forEach(remove => remove()); }
}
