# RetroWave TV

A retro CRT wallpaper for Lively Wallpaper, with a native Windows music companion. Album artwork colors the TV and background; audio drives the visual effects. Synced lyrics, backing vocals and interlude balls scroll in a 45% height area above the TV.

[![Build](https://github.com/iamaloneforever/Lively-wallpaper_Retro_TV/actions/workflows/pages.yml/badge.svg?branch=main)](https://github.com/iamaloneforever/Lively-wallpaper_Retro_TV/actions/workflows/pages.yml)

**[Latest release](https://github.com/iamaloneforever/Lively-wallpaper_Retro_TV/releases/latest)** · **[Download Windows x64](https://github.com/iamaloneforever/Lively-wallpaper_Retro_TV/releases/latest/download/RetroWave-TV-win-x64.zip)** · **[Wallpaper preview](https://iamaloneforever.github.io/Lively-wallpaper_Retro_TV/)** · **[Actions builds](https://github.com/iamaloneforever/Lively-wallpaper_Retro_TV/actions/workflows/pages.yml)**

![Current desktop wallpaper preview](docs/images/desktop-preview.png)

The screenshot is a browser demo with fictional track metadata. Actions publishes releases after browser and Windows checks pass on `main`. Until the first release is published, download `retrowave-windows` from a successful Actions run that includes the Windows build.

## Install

1. Install [Lively Wallpaper](https://www.rocksdanister.com/lively/) and open it once.
2. Download and extract `RetroWave-TV-win-x64.zip`, then run `RetroWave-Setup.exe`.
3. Choose an installation folder and options. Windows sign-in startup is optional and off for a new installation.
4. Let setup register the wallpaper in Lively and pair the Windows companion.
5. Play music in an application that publishes Windows media-session metadata. Open **RetroWave** from Start to inspect playback or change settings.

The installer includes the .NET runtime. It is unsigned. Windows 11 x64 is the tested platform; Windows 10 and ARM64 have not been fully qualified.

## Lyrics

Press **S** on the wallpaper and enable **Background lyrics**. Keep the RetroWave companion running for playback timing.

- **Spicy Lyrics:** enter a publishable `sl_pk_…` key from the [developer dashboard](https://developers.spicylyrics.org/dashboard/applications), and allow `https://iamaloneforever.github.io`. A Spotify-format track ID is needed; Music Finder can resolve IDs for other players. Secret keys are rejected.
- **LRCLIB:** enable **Use LRCLIB fallback** in the wallpaper settings. This works with title and artist metadata without a Spotify ID or Spicy key. Lookups send track metadata to [LRCLIB](https://lrclib.net/).

If lyrics cannot be found, a glass **Find your song** picker opens automatically. It shows the full now-playing name and lets you edit only the search title and artist. For example, change “Fly Me to the Moon 2008 version” to “Fly Me to the Moon”. Results refresh as you type; each recording shows its full title, artist, provider and ID. Choose a recording to load its lyrics against the current playback clock. **Find song** also opens the picker manually. Corrections apply to the current song and reset when playback changes.

Catalogue search uses the companion's enabled Music Finder providers, including experimental Spotify when consented. LRCLIB search requires the wallpaper's **Use LRCLIB fallback** setting. Update the Windows companion to use interactive catalogue search.

The full lyrics remain scrollable. Syllable effects, duet alignment, backing vocals and interlude balls are preserved. Untimed lyrics use manual scrolling. Text size, glow, color and reduced effects are adjustable. The lyrics area and TV occupy separate parts of the screen.

## Controls and companion

- Drag the TV to rotate it. Use the channel dial to switch between Vintage Broadcast and Minimal Vinyl.
- **S** opens settings; **Escape** closes them. The power button enters standby; gain changes the visualization intensity.
- The companion shows native playback metadata and the source of catalogue matches. Music Finder configures optional providers; external matching requires consent.
- Closing the companion window leaves its worker running. Dashboard and Diagnostics can stop, restart or quit it. Settings opens repair, relocation and uninstall.

The unpaired website runs a browser demo. `?live=1` disables the demo; real Lively callbacks take priority.

## Privacy

Playback is read through Windows media sessions. The companion uses an authenticated localhost bridge; its pairing token is stored in the wallpaper URL fragment. Do not share a paired URL. Provider credentials remain on Windows and are not sent to GitHub Pages. There is no telemetry.

Optional catalogue services and lyrics providers receive metadata when enabled. If the wallpaper asks for local-network access, allow it in Lively's browser profile.

## Help and development

See [troubleshooting](docs/troubleshooting.md) for playback, lyrics, pairing and uninstall help. See [development](docs/development.md) for builds, tests, architecture and release automation.

## Credits and licenses

This project uses the work of these creators:

- **[Spikerko and Spicy Lyrics contributors](https://github.com/Spikerko/spicy-lyrics):** the vendored lyrics renderer, animations, scrolling and styles, licensed under AGPL-3.0.
- **[Fraktality](https://github.com/Fraktality/spr):** the MIT-licensed spring implementation port included in the Spicy renderer.
- **[mrdoob and Three.js contributors](https://github.com/mrdoob/three.js):** the MIT-licensed 3D rendering library.
- **[Adrien Denat / SimpleBar](https://github.com/Grsmto/simplebar), [Tanner Linsley / TanStack Virtual](https://github.com/TanStack/virtual), [Morgan Herlocker / cubic-spline](https://github.com/morganherlocker/cubic-spline), and [Mike Bostock / d3-ease](https://github.com/d3/d3-ease):** scrolling, virtualization and animation dependencies.
- **[rocksdanister and Lively contributors](https://github.com/rocksdanister/lively):** the wallpaper host and callback API.
- **[LRCLIB](https://lrclib.net/), [ListenBrainz](https://listenbrainz.org/) and [MusicBrainz](https://musicbrainz.org/):** optional lyrics and music metadata services.

See [third-party notices](THIRD_PARTY_NOTICES.md) for source versions and licenses. The combined wallpaper is distributed under [AGPL-3.0](LICENSE). The original RetroWave code and native companion retain the [MIT grant](LICENSE-MIT).
