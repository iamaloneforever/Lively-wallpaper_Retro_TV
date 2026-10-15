# Credits and third-party notices

RetroWave TV is built on the work of the following creators. Code dependencies, the wallpaper host and optional online services are listed separately below.

## Code used in the wallpaper

| Project | Creator / maintainers | Use | License |
| --- | --- | --- | --- |
| [Spicy Lyrics](https://github.com/Spikerko/spicy-lyrics) | Spikerko and contributors | Vendored lyrics renderer, styles and animations | AGPL-3.0 |
| [spr](https://github.com/Fraktality/spr) | Fraktality | Spring port included in Spicy Lyrics | MIT |
| [Three.js](https://github.com/mrdoob/three.js) | mrdoob and contributors | 3D TV, scene and shaders | MIT |
| [SimpleBar](https://github.com/Grsmto/simplebar) | Adrien Denat, from a fork by Jonathan Nicol | Lyrics scrollbars | MIT |
| [simplebar-core](https://github.com/Grsmto/simplebar) | Adrien Denat, from a fork by Jonathan Nicol | Bundled transitive scrollbar implementation | MIT |
| [lodash-es](https://github.com/lodash/lodash) | OpenJS Foundation and other contributors; based on Underscore by Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors | Bundled debounce/throttle helpers through simplebar-core | MIT |
| [TanStack Virtual](https://github.com/TanStack/virtual) | Tanner Linsley and contributors | Lyrics virtualization | MIT |
| [cubic-spline](https://github.com/morganherlocker/cubic-spline) | Morgan Herlocker | Spline interpolation | MIT |
| [d3-ease](https://github.com/d3/d3-ease) | Mike Bostock, Robert Penner and contributors | Animation easing | BSD-3-Clause |
| Microsoft helper code embedded in SimpleBar | Microsoft Corporation | TypeScript-generated helpers in the published SimpleBar modules | Permissive notice reproduced in the shipped source notices |

Verified distributed versions: Three.js 0.180.0, SimpleBar 6.3.3, simplebar-core 1.3.2, lodash-es 4.18.1, @tanstack/virtual-core 3.16.0, cubic-spline 3.0.3 and d3-ease 3.0.1. The production build derives `licenses/dependencies.json` from esbuild's emitted inputs and Vite's included modules, copies each installed package's complete license verbatim, and includes additional embedded copyright/license comments. The final-output check requires review when this inventory changes. Installed but unused packages (for example lodash's CommonJS package) and development tools are not described as bundled wallpaper code. The lockfile pins the reproducible install graph.

## Spicy Lyrics source and licensing

The complete Spicy Lyrics rendering dependency graph is copied from https://github.com/Spikerko/spicy-lyrics at commit `0ecf3925aac0e9b76b9095ee23b6d5118d9a18cc`.

The original renderer source and styles remain unchanged in `wallpaper/vendor/spicy-lyrics`, with their AGPL-3.0 license and SHA-256 provenance manifest. Host-specific imports resolve to separately maintained wallpaper adapters in `wallpaper/vendor/spicy-host`. The built module is reproducible using `node scripts/build-spicy.mjs`.

The combined wallpaper is distributed under AGPL-3.0, supplied in `LICENSE`. Original independently written RetroWave code retains its MIT grant in `LICENSE-MIT`. The native companion contains no copied Spicy renderer code and retains that original license grant.

The copied spring implementation includes its original Fraktality attribution; the complete upstream spr MIT text is shipped, including its original "Fractality" spelling. See [dated integration and modification notice](licenses/SPICY-MODIFICATIONS.md) for the adapter changes and upstream provenance. The website ships AGPL, project MIT, spr, all bundled package licenses and additional notices in `licenses/`. The running wallpaper links to this directory and to a complete corresponding source ZIP, including the adapters, build scripts, workflows and lockfiles. Clean builds identify their exact commit; local changes and development servers are explicitly labeled as development builds.

## Windows companion distribution

The independently authored native companion and setup code retains the MIT grant in `LICENSE-MIT`; this does not cover the combined AGPL wallpaper or relicense Microsoft binaries. The self-contained single installer embeds a complete license archive, including the companion's MIT text, actual .NET runtime and native host package licenses/notices, WPF notices, Microsoft .NET Library terms, Windows SDK terms and CsWinRT's MIT terms. The build derives a file/hash inventory from MSBuild's resolved, included runtime inputs and inspects the resulting executable bundle and assembly resources. Supplemental Microsoft materials and their provenance are in [licenses/windows](licenses/windows/PROVENANCE.md).

Read materials before installation using **Licenses** in setup, or afterwards using **About → Licenses**. To extract without installing, run `RetroWave-Setup.exe --licenses --licenses-dir C:\path\to\licenses`, then open `index.html` there. The release also provides the identical embedded archive as `RetroWave-licenses.zip`. Runtime components retain their separate terms and restrictions.

## Host and services

[Lively Wallpaper](https://github.com/rocksdanister/lively), by rocksdanister and contributors, supplies the Windows wallpaper host and callback API. It is a separately installed application, not vendored code.

Thanks to [Spicy Lyrics](https://spicylyrics.org/) and [LRCLIB](https://lrclib.net/) for lyrics services, and to [ListenBrainz](https://listenbrainz.org/), [MusicBrainz](https://musicbrainz.org/), Spotify, ACRCloud and Apple for optional catalogue services. Service access and data use follow each provider's terms.

The native experimental Spotify adapter was independently implemented after studying API behavior; it does not bundle the Spicy Lyrics renderer or reference-project source.
