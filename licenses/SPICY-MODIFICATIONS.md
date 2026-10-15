# RetroWave integration of Spicy Lyrics — 2026-10-15

RetroWave TV contributors integrated and adapted Spicy Lyrics by Spikerko and
contributors from upstream commit 0ecf3925aac0e9b76b9095ee23b6d5118d9a18cc
(https://github.com/Spikerko/spicy-lyrics).

The complete copied renderer files, styles, copyright notices, AGPL license and
SHA-256 provenance manifest remain in wallpaper/vendor/spicy-lyrics. Those files
are preserved byte for byte; RetroWave's integration changes are maintained
outside that directory. scripts/build-spicy.mjs substitutes the upstream host
boundaries listed in UPSTREAM.json with wallpaper/vendor/spicy-host adapters.
These replace Spicetify/Spotify page, player, stores, logging, UI and fetching
services with the wallpaper host, while retaining upstream lyric rendering,
scrolling, animation and spring behavior.

RetroWave adds data conversion and input filtering, LRCLIB fallback, lyric timing
and playback synchronization, settings and appearance controls, album palettes,
wallpaper-specific CSS and lifecycle handling. The adapters, integration and
build scripts are included in the corresponding source snapshot, alongside the
vendored renderer and dependency lockfile. This is a modified integration by
RetroWave, not an upstream Spicy release or an upstream endorsement.

The combined wallpaper is conveyed under AGPL-3.0. Independently authored
RetroWave code retains the MIT grant in LICENSE-MIT. Third-party components
retain their original licenses; neither that MIT grant nor the companion's MIT
license relicenses Spicy or the combined wallpaper.

The Spring.ts port retains its original Fraktality attribution. The complete
spr MIT text in spr-MIT.txt was retrieved from Fraktality/spr at commit
665be1721c2a85e5cdfd9d44888d85dfc920626a; its upstream copyright spelling
"Copyright (c) 2023 Fractality" is preserved verbatim.
