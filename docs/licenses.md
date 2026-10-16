# Credits, source and licenses

[Documentation](README.md) · [Development](development.md)

Spicy Bond is the current project name. Branding does not change upstream ownership or licensing. The original contributor attribution remains in the MIT grant.

This project uses the work of these creators:

- **[Spikerko and Spicy Lyrics contributors](https://github.com/Spikerko/spicy-lyrics):** the vendored lyrics renderer, animations, scrolling and styles, licensed under AGPL-3.0.
- **Special thanks to [Spicy Lyrics Mobile contributors](https://github.com/spicylyrics/mobile)** for their work on experimental Spotify integration.
- **[Fraktality](https://github.com/Fraktality/spr):** the MIT-licensed spring implementation port included in the Spicy renderer.
- **[mrdoob and Three.js contributors](https://github.com/mrdoob/three.js):** the MIT-licensed 3D rendering library.
- **[Adrien Denat / SimpleBar](https://github.com/Grsmto/simplebar), [Tanner Linsley / TanStack Virtual](https://github.com/TanStack/virtual), [Morgan Herlocker / cubic-spline](https://github.com/morganherlocker/cubic-spline), and [Mike Bostock / d3-ease](https://github.com/d3/d3-ease):** scrolling, virtualization and animation dependencies.
- **[rocksdanister and Lively contributors](https://github.com/rocksdanister/lively):** the wallpaper host and callback API.
- **[LRCLIB](https://lrclib.net/), [ListenBrainz](https://listenbrainz.org/) and [MusicBrainz](https://musicbrainz.org/):** optional lyrics and music metadata services.

See [third-party notices](../THIRD_PARTY_NOTICES.md) for source versions and licenses. The combined wallpaper is distributed under [AGPL-3.0](../LICENSE). The original Spicy Bond code and native companion retain the [MIT grant](../LICENSE-MIT).

The running wallpaper's **Source and licenses** link opens shipped full license
texts, a dated Spicy integration notice, the exact build commit for clean builds,
and a complete corresponding source snapshot. Development builds explicitly avoid
claiming an unrelated commit as their exact source. The source snapshot includes
host adapters, build scripts, workflows and lockfiles. It is also shipped as
`source.zip` with new releases. See the [Spicy modification notice](../licenses/SPICY-MODIFICATIONS.md).

The companion's MIT grant applies to independently authored native code. Its
self-contained Microsoft runtime components retain their separate terms. Open
**Licenses** in setup before installation or **About → Licenses** afterwards.
You can extract all embedded materials without installing:

```powershell
.\SpicyBond-Setup.exe --licenses --licenses-dir C:\SpicyBond-licenses
```

Open `C:\SpicyBond-licenses\index.html`. New releases also offer the identical
`SpicyBond-licenses.zip` separately; the main installer ZIP continues to contain
one executable. Existing wallpaper registrations receive corrected AGPL metadata
when you run **Install / repair**; unrelated registration settings are preserved.

The [distribution review](licensing-distribution-review.md) records historical release findings. Old binary names in that review identify the audited releases; they are not current download names. The [brand guide](brand/README.md) covers independently authored logo and banner assets.
