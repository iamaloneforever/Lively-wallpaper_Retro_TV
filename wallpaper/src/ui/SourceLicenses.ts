declare const __SPICY_BOND_BUILD__: { mode: string; commit: string | null; sourceTree: string | null; upstreamArchive: string | null };

export function sourceLicensesMarkup(): string {
  const build = typeof __SPICY_BOND_BUILD__ === 'undefined' ? { commit: null, sourceTree: null, upstreamArchive: null } : __SPICY_BOND_BUILD__;
  const url = `${import.meta.env.BASE_URL}licenses/`;
  // A long-running wallpaper can outlive a Pages update. A committed build's
  // source link remains pinned to that commit even when the website moves on.
  const source = build.upstreamArchive || `${url}source.zip`;
  const version = build.commit && build.sourceTree
    ? `Build commit: <a href="${build.sourceTree}" target="_blank" rel="noopener noreferrer">${build.commit}</a>.`
    : 'Development build — local source may differ from Git HEAD; no exact commit is claimed.';
  return `<section aria-label="Source and licenses"><h3>Source and licenses</h3>
    <p class="panel-note">Combined wallpaper: AGPL-3.0, without warranty. Independently authored Spicy Bond code: MIT.</p>
    <p class="panel-note"><a href="${url}" target="_blank" rel="noopener noreferrer">Source and licenses</a> · <a href="${source}" target="_blank" rel="noopener noreferrer">Complete corresponding source snapshot</a></p>
    <p class="panel-note">${version}</p>
    <p class="panel-note"><strong>Spicy Bond integration and modifications — 2026-10-15.</strong> Uses Spicy Lyrics by Spikerko and contributors, upstream 0ecf3925aac0e9b76b9095ee23b6d5118d9a18cc. Spicy Bond adds wallpaper host adapters, lyric data conversion, timing, LRCLIB fallback, palettes and appearance controls; copied upstream files remain unchanged. <a href="${url}SPICY-MODIFICATIONS.md" target="_blank" rel="noopener noreferrer">Full modification notice and provenance</a>.</p></section>`;
}
