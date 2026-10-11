# GitHub Pages and Lively compatibility

Investigation date: 11 October 2026. This report separates documented behavior, source evidence, browser verification and real host verification.

## Findings

| Capability | Evidence and status |
| --- | --- |
| Static hosting at the GitHub Pages project subpath | Production build and Playwright tests pass at `/Lively-wallpaper_Retro_TV/`; publication is separately dependent on Pages settings and the Actions run. |
| `livelyCurrentTrack` contract | Official API documented; application implementation and simulated callback tests pass. |
| `livelyAudioListener` contract | Official 128-bin API documented; simulated input tests pass, including values above 1. |
| Callback delivery to a remote URL with host flags enabled | Source-supported: the inspected WebView2 initialization enables services based on flags outside the local/online navigation branch. Actual installed-host delivery remains unverified. |
| Callback delivery after simply pasting a URL | Not established. Source shows URL import creating `WallpaperType.url` and services defaulting to disabled. Explicit launch flags are required. |
| Actual Spotify/Tidal metadata on the deployed HTTPS URL | Unverified. No real media session was used to validate the hosted app. |
| Actual system-audio data on the deployed HTTPS URL | Unverified. Browser simulations are not audio capture. |
| Installed Lively runtime test | Lively was detected on this machine, but computer-use approval timed out before an app window could be inspected. No runtime integration success is claimed. |

## Primary references

- [Official System Data guide](https://github.com/lively-community/lively/wiki/Web-Guide-V-:-System-Data): launch arguments, callback names, nullable media data, base64 thumbnail and spectrum range caveat. The guide specifies Now Playing availability from Lively 2.0.6.0 onward.
- Latest stable release reported by the official API during this investigation: [v2.2.1.0](https://github.com/lively-community/lively/releases/tag/v2.2.1.0), published 18 September 2025.
- The same service flag gates and separate remote URL argument handling were also checked in [v2.2.1.0 WebView2 player](https://github.com/lively-community/lively/blob/v2.2.1.0/src/Lively/Lively.Player.WebView2/Form1.cs) and its [process wrapper](https://github.com/lively-community/lively/blob/v2.2.1.0/src/Lively/Lively/Core/Wallpapers/WebWebView2.cs).
- Source snapshot inspected on the default `core-separation` branch: commit [`25a0a5f4ed1988ff42117d3a17feb321062237fe`](https://github.com/lively-community/lively/tree/25a0a5f4ed1988ff42117d3a17feb321062237fe).
- [WebView2 process arguments](https://github.com/lively-community/lively/blob/25a0a5f4ed1988ff42117d3a17feb321062237fe/src/Lively/Lively/Core/Wallpapers/WebWebView2.cs#L64): online URL selection and wallpaper arguments are separate; automatic audio activation is conditional on `WallpaperType.webaudio`, not ordinary URL wallpapers. `TryParseUserCommandArgs` prefixes user flags with `wallpaper-`.
- [WebView2 navigation and service initialization](https://github.com/lively-community/lively/blob/25a0a5f4ed1988ff42117d3a17feb321062237fe/src/Lively/Lively.Player.WebView2/Form1.cs#L294): Now Playing and audio service creation occur after the local/online navigation switch and are gated by `startArgs.NowPlaying` and `startArgs.AudioVisualizer`.
- [Player flag defaults](https://github.com/lively-community/lively/blob/25a0a5f4ed1988ff42117d3a17feb321062237fe/src/Lively/Lively.Player.WebView2/StartArgs.cs): audio and Now Playing default to false.
- [URL import](https://github.com/lively-community/lively/blob/25a0a5f4ed1988ff42117d3a17feb321062237fe/src/Lively/Lively.UI.Shared/ViewModels/LibraryViewModel.cs#L676): a URL becomes a URL wallpaper via `CreateWallpaper`, without specifying arguments.
- [Library metadata construction](https://github.com/lively-community/lively/blob/25a0a5f4ed1988ff42117d3a17feb321062237fe/src/Lively/Lively.Common/Factories/WallpaperLibraryFactory.cs#L115): a wallpaper's arguments are stored in its host-side metadata.

Source evidence is not a claim that every released build behaves identically. The exact installed version and selected player must be recorded during manual verification.

## Exact limitation and remote-only setup

Registering the global JavaScript functions does not subscribe the host to Windows services. The required metadata and audio switches are supplied by Lively when launching its web player. A hosted page cannot edit those switches, and ordinary browsers cannot access system media sessions or other desktop applications' audio.

Adding an HTTPS URL still loads all this application's assets remotely. For live integration, the existing URL wallpaper must also have its **Lively-managed** launch arguments set to:

```text
--audio --system-nowplaying --pause-event true
```

This is a host configuration step, not a locally installed application or wallpaper asset package. The official guide documents this through the existing library entry's `LivelyInfo.json` `Arguments` field. Stop/reload the wallpaper after changing its host metadata. Keep its `FileName` pointing at the HTTPS Pages address and its wallpaper type as URL. Back up the existing host metadata first, and locate the exact entry through the installed Lively library configuration rather than guessing an installation path. This report does not claim there is a supported one-click UI for changing arguments in every Lively version.

If the installed version exposes no way to enable those flags for an imported URL, the requested paste-only music experience is blocked by that host configuration limitation. A local wallpaper download is not silently substituted. Report the installed version/player and upstream limitations.

## Demo and standby semantics

Without real callbacks for 2.5 seconds, an ordinary visit starts a clearly labeled fictional demonstration. This is a preview fallback, not proof that the page is outside Lively. Any valid real audio or media callback immediately stops all simulated input. Audio-only connection clears fictional metadata and stays in standby until real media data arrives. `null` media payload means standby. Invalid JSON is ignored. A metadata event may update artwork without starting a new-track tuning transition. No playback state is inferred from an arbitrary undocumented field.

Append `?live=1` to the hosted URL used as a wallpaper to disable demonstration altogether. In that mode the screen stays in standby until real metadata arrives; the settings diagnostics separately report whether metadata and audio callbacks have been received.

## Verification completed locally

- Strict TypeScript checking and Vite production build.
- 11 Vitest tests covering parsing, optional/malformed data, raster MIME detection and rejection, track changes, frequency analysis, normalization, smoothing/decay and mode switching.
- Six Playwright integration tests against the actual project subpath using installed Microsoft Edge, including asset/console error checks, WebGL2 rendering, demo and callback handoff, controls, narrow screen layout, persistence and context restoration. CI uses one browser worker and a 60-second per-test budget to accommodate software-rendered WebGL; failures retain traces and screenshots.
- Visual inspection of desktop and narrow-screen screenshots. Artwork in these screenshots is procedural fictional demo artwork.

No actual remote URL Lively metadata or audio test has been completed. No sustained 4K/multimonitor GPU benchmark is claimed.

## Manual Windows integration checklist

1. Record the Lively version, browser player (WebView2/CEF), Windows version, monitor resolution and URL. Use the deployed URL with `?live=1`.
2. Import it using Lively's webpage URL input. Check the TV loads and that it initially reports waiting/standby. Verify there are no asset failures.
3. Enable the host flags above on that existing URL wallpaper. Reload it. Do not change the address to localhost or a local package.
4. Start a Windows-media-session-compatible player. Check **Settings → Signal diagnostics** reports “Metadata: callback received”. Confirm the screen title, artist and album against the actual player. Test Spotify, Tidal and browser media separately; do not infer one from another.
5. Change tracks. Confirm tuning/fading, late thumbnail updates, genre/subtitle/track number when provided, and color response. Test a title long enough to require truncation.
6. Verify “Audio: callback received” while output audio is playing. Compare low/high-frequency material and silence. Check silence decays without claiming beat or BPM detection.
7. Stop the media session and verify the host's null payload produces standby. Toggle TV power separately; it must not pause the external player.
8. Test the channel/power/gain controls with Lively mouse forwarding enabled and with desktop icons present. Check settings when direct interactions are intercepted by Windows.
9. Cover the desktop/fullscreen an application, then uncover it. Verify host pause/resume and texture recovery. Test 30/60 FPS, low power and a monitor resize.
10. Reopen Lively after restart, verify launch flags and URL persist, and repeat with a second monitor. Record callbacks and any errors independently for each display.

Only mark actual host integration verified after steps 3–7 demonstrate real, matching media data and audio on the published HTTPS page.
