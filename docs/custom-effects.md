# Custom song effects for Spicy Bond

[Documentation](README.md) · [Backgrounds](backgrounds.md) · [Settings and backups](settings.md)

Press **S → Custom song effects → Download starter for current song**, edit the JSON, and import it. The starter includes the current title and artist. Preview toggles a saved effect on; click the same button again to stop its preview. Playback matching resumes when preview stops; playback automatically activates matching effects. Reimport the same ID to update it. Export individual entries or the complete library to share or back them up. In Lively, the updated paired companion opens a Windows **Save As** dialog for starter downloads and exports. Choose your folder and filename there; Cancel saves nothing. No JSON preview is shown.

The complete [effect authoring guide](../wallpaper/public/effects/guide.html) ships with the wallpaper and opens from settings. It covers all parameters, animation, matching, GLSL uniforms, limits and persistence. Downloadable files:

- [Layered neon orbit](../wallpaper/public/effects/neon-orbit.json): reactive rings, motes and a wave.
- [Custom GLSL aurora](../wallpaper/public/effects/aurora-shader.json): procedural ribbons written in a fragment shader.
- [JSON editor schema](../wallpaper/public/effects/effect.schema.json): save beside your effect file for completions.

Effects support circles, rings, stars, polygons, waves, grids and particles. Every transform and numeric style parameter supports keyframes, looping, oscillation and bass/mid/treble/amplitude/onset modulation. Colors can follow album artwork or use hex values. GLSL files define `vec4 effect(vec2 uv)` for original visuals beyond the built-in primitives.

Both title and artist must match. Version suffixes are ignored unless `match.versions` is `exact`; optional album restrictions and explicit title/artist aliases are supported. The last matching library entry wins. Custom effects have a separate enable switch from built-in song easter eggs. Effects overlay the current genre atmosphere by default. **Keep current atmosphere (overlay)** is enabled initially and also makes older replacement-style files act as overlays. Disable it to honor an effect’s explicit `replace: true` setting. The preference is saved with the library.

Animation uses elapsed effect time, scaled by Background animation intensity, and resets on recording changes. It does not follow playback seeks. Background animation off and reduced motion freeze supplied time/audio; Lively pause suspends rendering, standby fades effects out, and lyrics dim them. Custom effects share the TV's WebGL context and performance limits.

The paired companion saves the library and its enable switch in `%LocalAppData%\SpicyBond\wallpaper-settings.json` (upgraded installations may retain their previous data directory), alongside movement, scale, genre and lyric preferences. Install the updated companion to enable effect-library saving. Existing browser imports migrate into older settings files that have no library; an existing JSON library is authoritative. Browser storage remains an offline cache, and changes made offline retry after reconnection. Effects restore even after browser storage is cleared (pair the companion again if its pairing token was cleared). Editing an original imported file requires reimport; export remains available for sharing and backups. Imports validate the complete file and compile every shader before changing saved data; failed imports preserve existing effects.

Implementation: `CustomEffects.ts` validates and evaluates the format; `CustomEffectRenderer.ts` composes and crossfades GPU programs; `CustomEffectControls.ts` handles the library. JSON imports are data, with an optional GLSL string; no JavaScript evaluation or external asset fetching is used.

On the Lively desktop, use the settings header’s up/down arrows or drag the scrollbar when wheel input is unavailable. Sliders track mouse movement directly, and dropdowns open page-rendered choices. Keyboard controls remain available.

Lively’s wallpaper player cancels browser downloads. The updated companion opens Save As and the settings panel confirms the chosen path. Older companions may save to their data directory's `exports` folder instead and show an update message; **Companion → Settings → Open exported effects** opens that folder. In a regular unpaired browser, ordinary downloads remain available. A failed paired export reports the error so you can retry.
