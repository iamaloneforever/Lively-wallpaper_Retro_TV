import { defaults, parseConfig, type Config } from './Config';
import { parseCustomEffectSettings, type CustomEffectSettings } from '../background/CustomEffects';
import { bridgeHeaders } from '../music/SongSearch';

export interface SettingsDocument { version: 1; config: Config; lyricsKey: string; customEffects?: CustomEffectSettings }
export interface SettingsState { initialized: boolean; revision: string; settings: SettingsDocument }
export function parseSettingsState(value: unknown): SettingsState | null {
  if (!value || typeof value !== 'object') return null;
  const state = value as Record<string, unknown>, settings = state.settings as Record<string, unknown> | undefined;
  if (typeof state.initialized !== 'boolean' || typeof state.revision !== 'string' || !/^(?:[a-f0-9]{64})?$/.test(state.revision) ||
      !settings || settings.version !== 1 || !settings.config || typeof settings.config !== 'object' || Array.isArray(settings.config) ||
      typeof settings.lyricsKey !== 'string' || settings.lyricsKey.length > 256 || settings.lyricsKey && !/^sl_pk_[A-Za-z0-9_-]+$/.test(settings.lyricsKey)) return null;
  const raw = settings.config as Record<string, unknown>, config = parseConfig(raw);
  for (const key of Object.keys(defaults) as (keyof Config)[]) if (raw[key] !== undefined && raw[key] !== config[key]) return null;
  if (state.initialized !== (state.revision.length === 64)) return null;
  let customEffects: CustomEffectSettings | undefined;
  try { if (settings.customEffects !== undefined) customEffects = parseCustomEffectSettings(settings.customEffects); } catch { return null; }
  return { initialized: state.initialized, revision: state.revision, settings: { version: 1, config, lyricsKey: settings.lyricsKey, ...(customEffects ? { customEffects } : {}) } };
}

/** The JSON file is authoritative; local storage is an offline cache and first-run migration. */
export class SettingsSync {
  private local: SettingsDocument;
  private revision: string | null = null;
  private pending: Partial<Config> = {};
  private pendingKey: string | undefined;
  private pendingEffects: CustomEffectSettings | undefined;
  private busy = false;
  private migration = false;
  private timer = 0;
  private disposed = false;
  private request: AbortController | null = null;
  constructor(initial: SettingsDocument, private apply: (settings: SettingsDocument) => void, private status: (message: string) => void) {
    this.local = structuredClone(initial);
    if (!bridgeHeaders()['X-RetroWave-Key']) { status('Pair the Windows companion to save settings in a JSON file. Browser preferences are kept locally.'); return; }
    try {
      const pending = JSON.parse(localStorage.getItem('retrowave-settings-pending-v1') || '{}');
      const config = pending.config && typeof pending.config === 'object' && !Array.isArray(pending.config) ? pending.config : {};
      const checked = parseConfig(config);
      for (const key of Object.keys(defaults) as (keyof Config)[]) if (config[key] !== undefined && config[key] === checked[key]) Object.assign(this.pending, { [key]: checked[key] });
      if (pending.customEffects !== undefined) this.pendingEffects = parseCustomEffectSettings(pending.customEffects);
      if (typeof pending.lyricsKey === 'string' && pending.lyricsKey.length <= 256 && (!pending.lyricsKey || /^sl_pk_[A-Za-z0-9_-]+$/.test(pending.lyricsKey))) this.pendingKey = pending.lyricsKey;
    } catch { /* Optional offline queue. */ }
    this.schedule(0);
  }
  changed(document: SettingsDocument): void {
    for (const key of Object.keys(defaults) as (keyof Config)[]) if (this.local.config[key] !== document.config[key]) Object.assign(this.pending, { [key]: document.config[key] });
    if (this.local.lyricsKey !== document.lyricsKey) this.pendingKey = document.lyricsKey;
    if (JSON.stringify(this.local.customEffects) !== JSON.stringify(document.customEffects)) this.pendingEffects = structuredClone(document.customEffects);
    this.local = structuredClone(document);
    if (bridgeHeaders()['X-RetroWave-Key']) { this.persistPending(); this.status('Saving settings to the JSON file…'); this.schedule(350); }
  }
  private persistPending(): void {
    try {
      if (Object.keys(this.pending).length || this.pendingKey !== undefined || this.pendingEffects !== undefined) localStorage.setItem('retrowave-settings-pending-v1', JSON.stringify({ config: this.pending, lyricsKey: this.pendingKey, customEffects: this.pendingEffects }));
      else localStorage.removeItem('retrowave-settings-pending-v1');
    } catch { /* In-memory retry still works if browser storage is blocked. */ }
  }
  private dirty(): boolean { return this.migration || Object.keys(this.pending).length > 0 || this.pendingKey !== undefined || this.pendingEffects !== undefined; }
  private schedule(delay: number): void { clearTimeout(this.timer); if (!this.disposed) this.timer = window.setTimeout(() => void this.cycle(), delay); }
  private accept(state: SettingsState): void {
    this.revision = state.revision;
    if (!state.initialized) {
      // Only an absent file triggers migration. Existing JSON never gets reset at startup.
      this.migration = true;
      return;
    }
    this.migration = false;
    // Upgrade an existing preferences file without losing the browser's imported library.
    if (!state.settings.customEffects && this.local.customEffects && (this.local.customEffects.file.effects.length > 0 || !this.local.customEffects.enabled || this.local.customEffects.overlay === false)) this.pendingEffects ??= structuredClone(this.local.customEffects);
    const customEffects = this.pendingEffects ?? state.settings.customEffects;
    const merged: SettingsDocument = { version: 1, config: { ...state.settings.config, ...this.pending }, lyricsKey: this.pendingKey ?? state.settings.lyricsKey, ...(customEffects ? { customEffects } : {}) };
    if (JSON.stringify(this.local) !== JSON.stringify(merged)) { this.apply(merged); this.local = structuredClone(merged); }
  }
  async cycle(): Promise<void> {
    if (this.disposed || this.busy) return;
    this.busy = true; const request = new AbortController(); this.request = request; let delay = 2000;
    try {
      // A first-run read and migration write are separate requests. Time spent reading
      // must not consume the write's timeout, especially while WebGL is busy.
      const signal = () => AbortSignal.any([request.signal, AbortSignal.timeout(2500)]);
      const headers = bridgeHeaders();
      if (this.revision === null || !this.dirty()) {
        const response = await fetch('http://127.0.0.1:43821/wallpaper-settings', { headers, cache: 'no-store', signal: signal() });
        if (!response.ok) throw new Error(response.status === 404 ? 'Update the companion to save settings in a JSON file.' : 'The settings file is unavailable. Browser changes will retry when the companion is ready.');
        const state = parseSettingsState(await response.json()); if (!state) throw new Error('The settings file could not be read. Check its JSON before trying again.');
        if (this.disposed) return; this.accept(state);
      }
      if (this.dirty()) {
        const sent = { ...this.pending }, sentKey = this.pendingKey, sentEffects = JSON.stringify(this.pendingEffects);
        const settings = structuredClone(this.local);
        const response = await fetch('http://127.0.0.1:43821/wallpaper-settings', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedRevision: this.revision, settings }), signal: signal() });
        if (response.status === 409) { this.revision = null; delay = 100; return; }
        if (!response.ok) throw new Error('Could not save the JSON file. Browser changes are kept and will retry.');
        const state = parseSettingsState(await response.json()); if (!state || !state.initialized) throw new Error('The companion did not confirm the settings save.');
        if (settings.customEffects && !state.settings.customEffects) throw new Error('Update the companion to save custom effects. Your browser library is kept and saving will retry.');
        if (this.disposed) return;
        // An edit made while the POST is in flight belongs to the next save.
        for (const key of Object.keys(sent) as (keyof Config)[]) if (this.pending[key] === sent[key]) delete this.pending[key];
        if (this.pendingKey === sentKey) this.pendingKey = undefined;
        if (JSON.stringify(this.pendingEffects) === sentEffects) this.pendingEffects = undefined;
        this.persistPending();
        this.accept(state);
      }
      this.status(this.dirty() ? 'Saving settings to the JSON file…' : 'Settings saved in wallpaper-settings.json. Restored automatically after restarts and updates.');
      if (this.dirty()) delay = 350;
    } catch (error) {
      if (this.disposed || request.signal.aborted) return;
      this.revision = null; delay = 10000;
      this.status(error instanceof Error ? error.message : 'The companion is unavailable. Settings remain in this browser until saving can resume.');
    } finally { this.busy = false; this.request = null; this.schedule(delay); }
  }
  dispose(): void { this.disposed = true; clearTimeout(this.timer); this.request?.abort(); }
}
