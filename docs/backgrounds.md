# Genre-aware atmospheric effects

Press **S** and scroll to **Background & Visual Effects**. Automatic genre matching is enabled by default; the default environment is synthwave. The TV cabinet, channel controls, artwork colors, synchronized lyrics, and companion pairing continue to work independently.

## Environments and atmospheric layers

The existing album-color CSS gradient remains the background for every genre. Genre selection never supplies a replacement palette, image, or scenic backdrop. Transparent effects sit above that gradient and below the TV and lyrics. Each genre combines at least two particle types with subtle animated light accents; particle types coexist rather than turning every particle into the same blended shape.

| Genre | Atmosphere and motion | Particle layers |
| --- | --- | --- |
| Synthwave / Retrowave | Receding light streaks and neon-like glints | Sparkles, drifting dust, warm embers |
| Electronic / EDM | Subtle digital halos and orbital motion | Sparkles, bokeh, dust |
| Pop | Thin ribbon-like light trails | Sparkles, bokeh, dust |
| Rock / Metal | Restrained peripheral electrical arcs | Rising embers, ash-like dust, sparks |
| Hip-Hop / Rap | Moving graphic light bars and bass highlights | Dust, sparks, embers |
| Jazz / Blues | Transparent smoke and wandering spotlights | Dust, soft bokeh, occasional glints |
| Classical | Thin slow light rays | Silver dust and sparkles |
| Ambient / Chill | Faint aurora-like wisps | Drifting dust, wandering fireflies, faint sparkles |
| Lo-Fi | Gentle rain streaks | Rain, dust, out-of-focus lights |
| R&B / Soul | Liquid highlights | Bokeh, dust, soft sparkles |
| Indie / Alternative | Faint organic light contours | Dust, fireflies, sparkles |

## Detection and fallback

1. The Lively `Genres` callback takes priority. Aliases and subgenres map to these families: for example, lo-fi hip-hop → Lo-Fi, indie rock → Indie, progressive house → Electronic, and neo-soul → R&B / Soul. More specific labels take precedence inside a genre string; when several genre strings are supplied, their order is preserved.
2. If no recognized native genre exists, the paired wallpaper reads the companion's existing `/now-playing` metadata. This works with lyrics disabled and without a usable playback duration. Responses must match title, artist, and a supplied album and have a recent timestamp. Late responses for a different track are discarded.
3. The companion preserves MusicBrainz genres/tags and Apple iTunes `primaryGenreName`. Missing genres can be resolved through these existing providers **only when external catalogue consent and that provider are enabled**. Recording matching still rejects ambiguous or different recordings. Recording IDs are published before optional genre enrichment completes.
4. Successful companion genres are cached for six hours. Companion negative results are cached for five minutes; caches hold at most 256 entries. The wallpaper polls only the local bridge (every two seconds while waiting; ten-second backoff after a failure), and stops once a genre is known. It never sends new public catalogue requests itself.
5. **Manual genre / theme** overrides detection. When automatic detection is off or a genre cannot be mapped, **Default background theme** applies. Standby uses the configured default as well.

No title-based genre guesses, credentials, paid APIs, or new installations are required. Players with no genre data still receive continuous time-based visuals. Genre lookup does not bypass the companion's existing consent or enabled-provider preferences. The artwork palette continues to color the CSS gradient, lyrics, and TV; atmospheric highlights derive from that same palette. The fullscreen WebGL canvas stays transparent outside its effects.

## Music response and motion

The existing Lively spectrum input supplies smoothed bass, mids, and highs. Bass affects environmental lighting and ember motion; mids affect ribbon brightness; highs affect small particle highlights. Overall spectrum amplitude gently lifts brightness. The analyser's bass-onset measure adds a small localized accent in electronic and rock environments. It is not a BPM or beat-position estimate.

If audio stops arriving, the analyser decays to silence and time-based motion continues. The browser demo uses explicitly simulated data; it does not capture audio. No full-screen strobes or violent camera shake are used.

Theme weights and particle distributions crossfade. A new request retargets the mixture already on screen, including during rapid track changes. Fixed geometry, materials, and buffers are reused; transitions do not load textures or rebuild scenes.

## Settings

Preferences use the existing browser cache and companion `wallpaper-settings.json` synchronization. Old version-1 files gain defaults without losing existing values. Install the updated companion alongside this wallpaper so its settings validator recognizes the new fields.

- **Automatic genre detection**, **Manual genre / theme**, **Default background theme** control selection.
- **Animate background** freezes the environment when disabled. **Reduced motion** also follows the operating system, suppresses environmental audio pulses, hides moving particles, and settles theme changes immediately.
- **Atmospheric effect** chooses the genre's combination or a single effect: sparkles, dust, rain, embers, bokeh, or fireflies. **Atmospheric particles** is the master particle toggle.
- **Background animation intensity** controls motion speed and drift. **Music reactivity sensitivity** scales audio response; zero disables it.
- **Background particle density** scales the preset's particle budget. **Background glow / bloom** adjusts soft glow and particle size; bloom is inexpensive shader glow, not a fullscreen postprocessing blur.
- **CRT / VHS effect intensity** scales background grain and scanlines plus the enabled TV scanline, RGB separation, noise, and interference effects. Individual TV toggles still apply.
- **Background effect brightness** controls the transparent accents independently of TV picture brightness. It does not recolor the cover gradient. The upper effects dim while lyrics are visible.
- **Theme transition duration** ranges from 0.3 to 10 seconds. **Song easter eggs** enables the optional recording-specific accents below.

## Performance

| Preset | Maximum particles at full density | Pixel-ratio cap | Frame-rate cap |
| --- | ---: | ---: | ---: |
| Low | 96 | 1.0 | 30 |
| Balanced | 256 | 1.5 | 60 |
| High | 512 | 1.75 | 60 |
| Ultra | 768 | 2.0 | 60 |

The frame-rate setting and low-power switch can lower these caps. Low power uses Low's particle budget. Opening settings reduces pixel ratio; the existing slow-frame monitor may reduce it further. Start with Balanced; use Low for integrated graphics or multiple monitors. Ultra is optional and does not guarantee 60 FPS, particularly at 4K.

The atmosphere shares the TV's WebGL context: one transparent fullscreen quad and one fixed point buffer, with no extra animation library, render targets, or per-track GPU allocations. Animation does not request metadata over the network. Hidden documents, Lively's pause callback, and context loss suspend rendering; elapsed simulation time does not jump while paused. Context restoration reuses the same resources. Normal disposal releases both geometries and both materials.

## Song easter eggs

These are quiet visual signatures rather than replacement themes. They crossfade with metadata, never trigger from a title alone, and can be disabled. Matching ignores case, punctuation, and conventional remaster suffixes, and supports explicit artist aliases for selected collaborations; live versions and cover artists do not match. Composer credit must be in the artist or album-artist fallback field for composer-matched entries.

<details>
<summary>Reveal the 28 recordings and accents</summary>

| Recording | Artist | Accent |
| --- | --- | --- |
| Blinding Lights | The Weeknd | Distant horizon light trails in the cover colors |
| Take On Me | a-ha | Pencil-like halo drawn at the edge |
| Midnight City | M83 | A tiny outline skyline in the cover colors |
| Space Oddity | David Bowie | One satellite crossing an orbital path |
| Riders on the Storm | The Doors | Slow cloud glow in the cover colors |
| Clair de Lune | Claude Debussy | Silver moon halo |
| Blue in Green | Miles Davis | Rings drifting at the edge in the cover colors |

| A Sky Full of Stars | Coldplay | Shooting stars |
| Starman | David Bowie | A drifting comet |
| Space Song | Beach House | Tiny meteors |
| Firework | Katy Perry | Small expanding spark blooms |
| Purple Rain | Prince | Fine rain in the existing cover colors |
| Thunderstruck | AC/DC | Quiet branching electrical filaments |
| Around the World | Daft Punk | A rotating wireframe globe |
| Harder, Better, Faster, Stronger | Daft Punk | Circuit traces and moving signal dots |
| Time | Pink Floyd | A clock dial and slow pendulum |
| Bohemian Rhapsody | Queen | A rotating geometric kaleidoscope |
| Mr. Blue Sky | Electric Light Orchestra | A delicate dawn arc and rays |
| Here Comes the Sun | The Beatles | A small sunrise outline |
| Strawberry Fields Forever | The Beatles | Drifting petals |
| Flowers | Miley Cyrus | Tumbling flower petals |
| Cherry Blossom | Lana Del Rey | Small drifting blossoms |
| snowfall | Øneheart / reidenshi | Falling snow |
| Experience | Ludovico Einaudi | A slow pendulum and faint dial |
| River Flows in You | Yiruma | Flowing waves along the lower edge |
| Take Five | The Dave Brubeck Quartet | A small rotating record highlight |
| Never Gonna Give You Up | Rick Astley | A slowly bouncing TV badge |
| Stayin’ Alive | Bee Gees | A miniature disco sphere and scattered glints |

</details>

## Extending the engine

- `wallpaper/src/background/Themes.ts`: stable saved IDs, display names, speed, atmosphere descriptions, and normalized particle-effect weights. Every theme has at least two layers; weights sum to one. Particle profiles use the common `effectTypes` interface.
- `environment.frag`: transparent light accents in `environment(id, ...)`. Add a branch at the registry's index; the renderer derives the theme count automatically. Place new branches before the final default branch, or make that branch explicit when appending a genre. Add aliases in `normalizeGenre`.
- `BackgroundEngine.ts`: rendering, shared uniforms, effect distributions, and resource ownership. Adding a genre does not need new buffers or renderer changes. A completely new particle shape needs a corresponding shader motion/shape and profile slot.
- `Transition.ts`: interruptible, allocation-free weight interpolation.
- `GenreResolver.ts`: native/companion selection, identity checks, bounded cache, and cancellation.
- `Performance.ts`: particle, resolution, and frame-rate budgets.
- `SongAccents.ts`: exact recording rules and descriptions. New recordings can reuse any existing `accentEffects` without changing the renderer. New accent shapes belong in `songAccent` in the shader, with an additional effect ID. The renderer derives the uniform array and loop size from `accentEffects` automatically. Decorative clocks and pendulums use elapsed animation time, not inferred musical tempo.

Add the saved ID to the companion settings validator when introducing a genre or selectable particle type. Keep defaults in `Config.ts` and `WallpaperSettingsStore.cs` aligned, and add an alias, rendering, and settings-migration regression case.

## Validation and limitations

Unit coverage exercises aliases, missing data, stale and mismatched companion responses, preference validation, easter-egg identity matching, every genre's layered budget, resource disposal, and 5,000 interrupted theme changes with fixed buffers. Browser tests exercise all eleven rendered genres, atmospheric selections, rapid callbacks, manual/default selection, persistence, and genre enrichment while lyrics are disabled. The existing TV, channel, settings, and lyric suites remain part of regression validation.

Software-rendered Chromium checks do not establish installed-Lively compatibility or desktop GPU performance. Native Windows playback, installed Lively, real-driver GPU memory, and multi-hour hardware soak testing require a Windows desktop. Unsupported, unavailable, or ambiguous catalogue metadata uses the configured default; the engine never invents genre or beat information.
