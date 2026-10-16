# Custom song effects for Spicy Bond

[Documentation](README.md) · [Backgrounds](backgrounds.md) · [Settings and backups](settings.md)

Press **S → Custom song effects → Download starter for current song**, edit the JSON, and import it. The starter includes the current title and artist. Preview tries a saved effect immediately; playback automatically activates matching effects. Reimport the same ID to update it. Export individual entries or the complete library to share or back them up.

The complete [effect authoring guide](../wallpaper/public/effects/guide.html) ships with the wallpaper and opens from settings. It covers all parameters, animation, matching, GLSL uniforms, limits and persistence. Downloadable files:

- [Layered neon orbit](../wallpaper/public/effects/neon-orbit.json): reactive rings, motes and a wave.
- [Custom GLSL aurora](../wallpaper/public/effects/aurora-shader.json): procedural ribbons written in a fragment shader.
- [JSON editor schema](../wallpaper/public/effects/effect.schema.json): save beside your effect file for completions.

Effects support circles, rings, stars, polygons, waves, grids and particles. Every transform and numeric style parameter supports keyframes, looping, oscillation and bass/mid/treble/amplitude/onset modulation. Colors can follow album artwork or use hex values. GLSL files define `vec4 effect(vec2 uv)` for original visuals beyond the built-in primitives.

Both title and artist must match. Version suffixes are ignored unless `match.versions` is `exact`; optional album restrictions and explicit title/artist aliases are supported. The last matching library entry wins. Custom effects have a separate enable switch from built-in song easter eggs. They replace the genre atmosphere and built-in accents by default; `replace: false` overlays them.

Animation uses elapsed effect time, scaled by Background animation intensity, and resets on recording changes. It does not follow playback seeks. Background animation off and reduced motion freeze supplied time/audio; Lively pause suspends rendering, standby fades effects out, and lyrics dim them. Custom effects share the TV's WebGL context and performance limits.

The library persists in browser/Lively local storage, separately from the companion's `wallpaper-settings.json`. Editing the original file requires reimport. Export before clearing profile storage or moving profiles. Imports validate the complete file and compile every shader before changing saved data; failed imports preserve existing effects.

Implementation: `CustomEffects.ts` validates and evaluates the format; `CustomEffectRenderer.ts` composes and crossfades GPU programs; `CustomEffectControls.ts` handles the library. JSON imports are data, with an optional GLSL string; no JavaScript evaluation or external asset fetching is used.
