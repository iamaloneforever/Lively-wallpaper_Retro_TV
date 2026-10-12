import type { Config } from '../core/Config';
export function settingsMarkup(config: Config): string {
  const toggle = (key: keyof Config, label: string) => `<label class="toggle-row"><span>${label}</span><input type="checkbox" data-setting="${key}" ${config[key] ? 'checked' : ''}><span class="switch"></span></label>`;
  return `<div class="panel-title"><div><span class="eyebrow">MAKE IT YOURS</span><h2>Fine tuning</h2></div><button class="icon-button" id="close-settings" aria-label="Close settings">×</button></div>
    <label class="field">Cabinet finish<select data-setting="casing"><option value="wood">Dark walnut</option><option value="beige">Aged ivory</option></select></label>
    <label class="field">Display channel<select data-setting="mode"><option value="broadcast">01 — Vintage broadcast</option><option value="vinyl">02 — Minimal vinyl</option></select></label>
    <label class="field">Picture brightness<input data-setting="brightness" type="range" min="0.3" max="1.5" step="0.05" value="${config.brightness}"></label>
    <label class="field">Visualizer intensity<input data-setting="intensity" type="range" min="0.2" max="1.5" step="0.05" value="${config.intensity}"></label>
    <label class="field">Frame rate<select data-setting="fps"><option value="60">60 FPS</option><option value="30">30 FPS</option></select></label>
    <div class="section-label">THE ANALOG DETAILS</div>
    ${toggle('scanlines', 'Scanlines')}${toggle('curvature', 'CRT curvature')}${toggle('aberration', 'RGB separation')}${toggle('noise', 'Analog grain')}${toggle('glow', 'Phosphor glow')}${toggle('reflections', 'Glass reflections')}${toggle('interference', 'Tuning & interference')}${toggle('particles', 'Atmospheric dust')}${toggle('antenna', 'Rabbit ear antenna')}${toggle('clock', 'Screen clock')}${toggle('lowPower', 'Low power mode')}
    <div class="section-label">GHOST LYRICS</div>
    ${toggle('lyrics', 'Background lyrics')}
    <label class="field">Spicy Lyrics publishable key<input id="spicy-key" type="password" placeholder="sl_pk_…" autocomplete="off" spellcheck="false"></label>
    <button class="outline-button" id="save-lyrics-key">Save lyrics key</button>
    <p class="panel-note" id="lyrics-status">Add a Spicy Lyrics publishable key to enable lyrics.</p>
    <p class="panel-note">Allow https://iamaloneforever.github.io in your Spicy application. Run the Windows companion for player detection and accurate timing. <a href="https://github.com/iamaloneforever/Lively-wallpaper_Retro_TV/blob/main/docs/LYRICS.md" target="_blank" rel="noopener noreferrer">Setup guide ↗</a></p>
    <div class="section-label">BROWSER DEMONSTRATION</div>
    <p class="panel-note">Fictional music and simulated frequencies. No audio is captured in your browser. Live callbacks always take priority.</p>
    <label class="field">Demo bass<input id="demo-bass" type="range" min="0" max="1.5" step="0.05" value="1"></label>
    <label class="field">Demo treble<input id="demo-treble" type="range" min="0" max="1.5" step="0.05" value="1"></label>
    <button class="outline-button" id="next-track">Next fictional record ↗</button>
    <div class="section-label">SIGNAL DIAGNOSTICS</div><p class="panel-note" id="diagnostics">Waiting for Lively callbacks.</p>
    <p class="panel-note">Lively requires --audio and --system-nowplaying launch flags. Adding a URL alone may not enable them. See the compatibility report.</p>
    <button class="text-button" id="reset-settings">Restore original settings</button>`;
}
