import type { Config } from '../core/Config';
export function settingsMarkup(config: Config): string {
  const toggle = (key: keyof Config, label: string) => `<label class="toggle-row"><span>${label}</span><input type="checkbox" data-setting="${key}" ${config[key] ? 'checked' : ''}><span class="switch"></span></label>`;
  return `<div class="panel-title"><div><span class="eyebrow">MAKE IT YOURS</span><h2>Fine tuning</h2></div><button class="icon-button" id="close-settings" aria-label="Close settings">×</button></div>
    <div class="settings-content" tabindex="0" aria-label="Settings controls">
    <p class="panel-note" id="settings-save-status" role="status"></p>
    <p class="panel-note" id="settings-sync-status" role="status"></p>
    <div class="section-label">Appearance</div>
    <label class="field">Cabinet finish<select data-setting="casing"><option value="wood">Dark walnut</option><option value="beige">Aged ivory</option></select></label>
    <div class="section-label">Television display</div>
    <label class="field">Display channel<select data-setting="mode"><option value="broadcast">01 — Vintage broadcast</option><option value="vinyl">02 — Minimal vinyl</option></select></label>
    <label class="field">Picture brightness<input data-setting="brightness" type="range" min="0.3" max="1.5" step="0.05" value="${config.brightness}"></label>
    ${toggle('antenna', 'Rabbit ear antenna')}${toggle('clock', 'Screen clock')}
    <div class="section-label">Visual effects</div>
    <label class="field">Visualizer intensity<input data-setting="intensity" type="range" min="0.2" max="1.5" step="0.05" value="${config.intensity}"></label>
    ${toggle('scanlines', 'Scanlines')}${toggle('curvature', 'CRT curvature')}${toggle('aberration', 'RGB separation')}${toggle('noise', 'Analog grain')}${toggle('glow', 'Phosphor glow')}${toggle('reflections', 'Glass reflections')}${toggle('interference', 'Tuning & interference')}${toggle('particles', 'Atmospheric dust')}
    <div class="section-label">Performance</div>
    <label class="field">Frame rate<select data-setting="fps"><option value="60">60 FPS</option><option value="30">30 FPS</option></select></label>
    ${toggle('lowPower', 'Low power mode')}
    <div class="section-label">Lyrics appearance</div>
    ${toggle('lyrics', 'Background lyrics')}
    <label class="field">Animation style<select data-setting="lyricStyle"><option value="smooth">Smooth</option><option value="classic">Classic</option><option value="minimal">Minimal</option></select></label>
    <label class="field">Lyric text size<input data-setting="lyricSize" type="range" min="0.65" max="1.35" step="0.05" value="${config.lyricSize}"></label>
    <label class="field">Highlight glow<input data-setting="lyricIntensity" type="range" min="0" max="1" step="0.05" value="${config.lyricIntensity}"></label>
    <label class="field">Lyric color<select data-setting="lyricColor"><option value="automatic">Automatic album palette</option><option value="neutral">Neutral high contrast</option></select></label>
    ${toggle('publicLyrics', 'Use LRCLIB fallback')}
    <p class="panel-note">Enabling LRCLIB sends the song title, artist, album and duration to lrclib.net for a lyric lookup. No account or key is needed.</p>
    <label class="field">Spicy Lyrics publishable key<input id="spicy-key" type="password" maxlength="256" placeholder="sl_pk_…" autocomplete="off" spellcheck="false" aria-describedby="lyrics-key-feedback"></label>
    <button class="outline-button" id="save-lyrics-key">Save lyrics key</button>
    <p class="panel-note" id="lyrics-key-feedback" role="alert"></p>
    <p class="panel-note" id="lyrics-status">Add a Spicy key or enable LRCLIB fallback.</p>
    <p class="panel-note"><a href="https://github.com/iamaloneforever/Lively-wallpaper_Retro_TV/tree/main/wallpaper/vendor" target="_blank" rel="noopener noreferrer">Lyrics source code</a></p>
    <p class="panel-note">Allow https://iamaloneforever.github.io in your Spicy application. LRCLIB is the fallback when a Spicy match or lyrics are missing. Install the Windows companion for accurate timing. <a href="https://github.com/iamaloneforever/Lively-wallpaper_Retro_TV#lyrics" target="_blank" rel="noopener noreferrer">Setup guide ↗</a></p>
    <div class="section-label">Demo and diagnostics</div>
    <p class="panel-note">Fictional music and simulated frequencies. No audio is captured in your browser. Live callbacks always take priority.</p>
    <label class="field">Demo bass<input id="demo-bass" type="range" min="0" max="1.5" step="0.05" value="1"></label>
    <label class="field">Demo treble<input id="demo-treble" type="range" min="0" max="1.5" step="0.05" value="1"></label>
    <button class="outline-button" id="next-track">Next fictional record ↗</button>
    <div class="section-label">Signal diagnostics</div><p class="panel-note" id="diagnostics">Waiting for Lively callbacks.</p>
    <p class="panel-note">Lively requires --audio and --system-nowplaying launch flags. Adding a URL alone may not enable them. See the compatibility report.</p>
    <button id="power-button" class="outline-button" aria-label="Toggle television power" aria-pressed="true">Television power</button>
    <button class="text-button" id="reset-settings">Restore original settings</button></div>`;
}
