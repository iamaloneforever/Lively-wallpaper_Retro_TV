# Credits and third-party notices

RetroWave TV is built on the work of the following creators. Code dependencies, the wallpaper host and optional online services are listed separately below.

## Code used in the wallpaper

| Project | Creator / maintainers | Use | License |
| --- | --- | --- | --- |
| [Spicy Lyrics](https://github.com/Spikerko/spicy-lyrics) | Spikerko and contributors | Vendored lyrics renderer, styles and animations | AGPL-3.0 |
| [spr](https://github.com/Fraktality/spr) | Fraktality | Spring port included in Spicy Lyrics | MIT |
| [Three.js](https://github.com/mrdoob/three.js) | mrdoob and contributors | 3D TV, scene and shaders | MIT |
| [SimpleBar](https://github.com/Grsmto/simplebar) | Adrien Denat, from a fork by Jonathan Nicol | Lyrics scrollbars | MIT |
| [TanStack Virtual](https://github.com/TanStack/virtual) | Tanner Linsley and contributors | Lyrics virtualization | MIT |
| [cubic-spline](https://github.com/morganherlocker/cubic-spline) | Morgan Herlocker | Spline interpolation | MIT |
| [d3-ease](https://github.com/d3/d3-ease) | Mike Bostock and contributors | Animation easing | BSD-3-Clause |

Installed package manifests provide dependency versions and their accompanying license files. The lockfile pins the dependency graph. Build tooling, including Vite, esbuild, TypeScript, pnpm, Vitest and Playwright, retains its own license notices.

## Spicy Lyrics source and licensing

The complete Spicy Lyrics rendering dependency graph is copied from https://github.com/Spikerko/spicy-lyrics at commit `0ecf3925aac0e9b76b9095ee23b6d5118d9a18cc`.

The original renderer source and styles remain unchanged in `wallpaper/vendor/spicy-lyrics`, with their AGPL-3.0 license and SHA-256 provenance manifest. Host-specific imports resolve to separately maintained wallpaper adapters in `wallpaper/vendor/spicy-host`. The built module is reproducible using `node scripts/build-spicy.mjs`.

The combined wallpaper is distributed under AGPL-3.0, supplied in `LICENSE`. Original independently written RetroWave code retains its MIT grant in `LICENSE-MIT`. The native companion contains no copied Spicy renderer code and retains that original license grant.

The copied spring implementation includes its original Fraktality MIT attribution. npm dependencies retain their own package licenses in the installed dependency tree.

## Host and services

[Lively Wallpaper](https://github.com/rocksdanister/lively), by rocksdanister and contributors, supplies the Windows wallpaper host and callback API. It is a separately installed application, not vendored code.

Thanks to [Spicy Lyrics](https://spicylyrics.org/) and [LRCLIB](https://lrclib.net/) for lyrics services, and to [ListenBrainz](https://listenbrainz.org/), [MusicBrainz](https://musicbrainz.org/), Spotify, ACRCloud and Apple for optional catalogue services. Service access and data use follow each provider's terms.

The native experimental Spotify adapter was independently implemented after studying API behavior; it does not bundle the Spicy Lyrics renderer or reference-project source.
