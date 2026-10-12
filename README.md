# RetroWave TV

An interactive Three.js CRT television for Lively Wallpaper. Album covers color the TV, screen, background, controls and settings. Optional ghost lyrics follow the song while the camera smoothly pulls back. The original cabinet, analog effects, animations and two display channels are preserved.

![RetroWave TV browser demonstration](docs/images/retrowave-tv.jpg)

The wallpaper stays at **https://iamaloneforever.github.io/Lively-wallpaper_Retro_TV/**. Windows setup installs its Lively registration and an optional C# playback companion. End users need no Python, Node.js, scripts or separately installed .NET runtime.

## Install

1. Install [Lively Wallpaper](https://www.rocksdanister.com/lively/) and open it once. Use Windows 10 version 1809 or later, or Windows 11.
2. Extract **RetroWave-TV-win-x64.zip**, open its only file **RetroWave-Setup.exe**, and click **Install / repair**. Keep the companion selected for synchronized lyrics; deselect it for audio and cover colors alone.
3. Setup detects Lively and its configured library, reuses an existing RetroWave URL entry, configures the required flags and asks Lively to apply it to the primary display.
4. Play music in a Windows media-session-compatible app. Press **S** on the wallpaper for lyrics and visual settings.

The single release archive **RetroWave-TV-win-x64.zip** contains only **RetroWave-Setup.exe**. The installer embeds and installs a separate, self-contained **RetroWave.Companion.exe**, the wallpaper registration, startup entry, uninstall entry and debugger shortcut. No extra ZIP, scripts or runtime download are needed. `scripts/build-windows.ps1` produces the archive; Windows CI uploads it as **retrowave-windows**. Download the artifact from a successful [workflow run](https://github.com/iamaloneforever/Lively-wallpaper_Retro_TV/actions), then extract its release ZIP. The executable is unsigned.

The Pages workflow deploys the matching wallpaper build alongside the Windows package. Automatic pairing requires that updated page; after upgrading, reload the installed wallpaper in Lively.

Setup is per user, with no administrator requirement. It creates `%LocalAppData%\RetroWave TV`, one startup entry and one Installed Apps entry. Repeated setup repairs the same installation. It preserves Lively's global settings, other wallpapers, player preferences and firewall configuration. Store and standard installer locations are detected; portable/custom executable locations are not.

**Local-network permission:** hosted pages need their browser profile's permission to read the local companion. Allow access for `https://iamaloneforever.github.io` if prompted. Lively's WebView2 profile is separate from Edge. Some hosts do not expose the prompt and need upstream support for synchronized lyrics. `LivelyInfo.json` cannot grant this permission. Setup does not disable browser security or change enterprise policies. Audio/metadata visualization continues without the companion.

## Lively configuration

`lively/LivelyInfo.json` uses the actual URL wallpaper type (`Type: 3`), the existing Pages URL with `?live=1`, and documented launch arguments:

```text
--audio --system-nowplaying --pause-event true
```

These enable `livelyAudioListener`, `livelyCurrentTrack` and `livelyWallpaperPlaybackChanged`. Setup installs the metadata into Lively's configured library and invokes `setwp --file <library-folder>`, translating the Store app's virtualized path. For basic integration without a playback clock, deselect the companion in setup. Do not drag the installer ZIP into Lively; extract it and run the installer. Pasting a URL alone does not import a hosted JSON file or enable the flags.

Lively remains the source of audio and displayed media metadata/artwork. The companion supplies the missing clock, duration, pause/rate and optional catalogue ID. It never controls the player. Native artwork is cached and available for diagnostics; clock requests omit it to avoid repeated transfers.

Sources checked: [system data](https://github.com/lively-community/lively/wiki/Web-Guide-V-:-System-Data), [command controls](https://github.com/lively-community/lively/wiki/Command-Line-Controls), [metadata schema](https://github.com/lively-community/lively/blob/v2.2.1.0/src/Lively/Lively.Models/LivelyInfoModel.cs), [URL type](https://github.com/lively-community/lively/blob/v2.2.1.0/src/Lively/Lively.Models/Enums/WallpaperType.cs), and [released command implementation](https://github.com/lively-community/lively/blob/v2.2.1.0/src/Lively/Lively/Commandline/CommandHandler.cs). Audio/media/pause are arguments rather than invented JSON fields. No unsupported permission flag is added.

## Lyrics

Press **S**, enable **Background lyrics**, then choose a provider:

- **Spicy:** save a browser publishable `sl_pk_…` key. Allow `https://iamaloneforever.github.io` in your [Spicy application](https://developers.spicylyrics.org/dashboard/applications). Secret keys are rejected. Spicy requires a Spotify-format track ID even when another player is playing the song.
- **Public matching for Spicy:** select **Allow public MetaBrainz matching** in setup. It is off by default and sends title, artist and album to the documented [MetaBrainz lookup](https://labs.api.listenbrainz.org/spotify-id-from-metadata). It accepts one exact metadata row, caches matches/misses and spaces requests. Coverage is incomplete and this lookup cannot independently verify duration.
- **LRCLIB fallback:** enable **Use LRCLIB fallback** in wallpaper settings. It is off by default and sends title, artist, album and duration to [LRCLIB](https://lrclib.net/docs). No key or Spotify account is needed. Returned title/artist and duration must match. Spicy authentication errors and rate limits remain visible.

Only documented public APIs are used. No anonymous Spotify tokens or private player APIs are used. Keys stay in that wallpaper profile's local storage. Lyric responses stay in memory for the current song; obsolete requests are cancelled and provider credits remain visible.

The companion samples GSMTC clocks at 5 Hz. The wallpaper reads them twice per second and interpolates between snapshots, compensating for snapshot age. Pause freezes animation, seeks reset the anchor, mismatches hide lyrics, and stale/unavailable clocks hide the layer. Windows media reconnection and local connection retries are automatic. Provider requests/backoff do not block clock updates.

Three neighboring lines reuse their elements. Motion handles line position/opacity; native animations handle word lifts and decorative letter reveals. Cover colors tint the text and vintage ghost trail. Letter effects interpolate within provider syllable timings. Line-only lyrics do not invent word timings; untimed lyrics stay static. Joining scripts keep their word shapes. Reduced motion and Lively pause events suspend effects. Without lyrics the camera stays at its normal distance.

## Players and controls

Spotify, TIDAL, Apple Music, MusicBee, Windows Media Player, Chrome, Firefox and other apps can work **when their version/configuration exposes a Windows GSMTC session and usable timeline**. Every GSMTC publisher is eligible: there is no player-name allowlist or Spotify preference. Windows' current playing session is preferred, followed by another playing session before a paused current session. Missing fields and unsupported timelines are handled gracefully. No audio fingerprinting is performed.

- Drag the TV to rotate it; pointer movement adds parallax.
- Use **Channel** or the TV dial to switch Vintage Broadcast / Minimal Vinyl.
- TV power controls standby. Gain changes visual response rather than system audio volume.
- **S** opens casing, brightness, FPS, low power, analog effects, particles, antenna, clock and lyric settings; Escape closes them.
- The ordinary URL offers a fictional demo after 2.5 seconds without callbacks. `?live=1` disables simulated music. Real callbacks always take priority.

Desktop input forwarding/icons can restrict clicks. Settings persist when the host allows local storage. WebGL2 and hardware acceleration are recommended; the existing canvas fallback is preserved.

## Architecture

```text
wallpaper/       Vite entry, TypeScript, shaders, styles, web tests
companion/src/   Separate C# companion/debugger and setup projects
companion/tests/ Dependency-free C# contract checks
lively/          Supported host metadata template
scripts/         Single release builder and preview capture
docs/images/     Project screenshot
.github/         Pages validation/deployment and Windows builds
```

Wallpaper `core` coordinates lifecycle/settings; `lively` owns native callbacks; `music` normalizes metadata/colors; `audio` filters the spectrum; `graphics` renders the TV; `ui` paints its screen/settings/demo; `lyrics` validates providers and animates timestamps. There are no runtime CDN dependencies.

The companion and installer are separate self-contained .NET 10 executables. Their complete C# source is in `companion/src/RetroWave.Companion` and `companion/src/RetroWave.Setup`; shared integration source is linked at build time. `MediaMonitor` caches metadata/artwork and reads clocks. `TrackResolver` performs opted-in lookup outside the clock loop. `LoopbackServer` binds only `127.0.0.1:43821`, bounds requests/connections/timeouts, checks Host/origin and requires an installation-specific pairing token. Setup supplies the token in the wallpaper URL fragment automatically; fragments are not sent to Pages. Never share the installed paired URL. The API is read-only, with no playback/setup commands. Artwork is available only on the authenticated `?artwork=1` endpoint.

`WallpaperInstaller` journals changes, preserves existing identity and restores original metadata on uninstall if it was not subsequently edited. `WindowsSetup` detects Lively, registers user startup and invokes the host. A per-user mutex prevents duplicate companion instances; a named event stops only this companion. No personal media metadata is logged.

## Built-in debugger

Open **RetroWave TV Debugger** from the Windows Start menu, click **Open debugger** in setup, or double-click the installed `RetroWave.Companion.exe`. Starting it this way opens diagnostics; `--run` is the independent background worker used at sign-in. Closing the debugger does not stop the worker.

The live window shows installation state, authenticated bridge connectivity, native media session count, media state, position/duration, playback rate, sequence and snapshot age. **Start / restart** and **Stop companion** affect only this companion. **Save report** exports these diagnostics; **Open log** shows lifecycle, state transitions and error types/codes. Neither reports nor logs contain song names, album artwork, keys or paired URLs. Logs rotate at 256 KiB and retain one previous file. Diagnostics make no external requests.

Files live in `%LocalAppData%\RetroWave TV`. `RetroWave.Companion.exe --diagnose` writes `diagnostics.json` without opening a window. Error messages are visible in the installer/debugger; the background worker records failures in `companion.log`. This is a playback/connection diagnostic tool; developers can attach Visual Studio for C# breakpoints. Close the debugger before repair or uninstall so Windows can replace/remove its executable.
## Develop and build

Web development requires Node.js 24 and pnpm 11.19.0. C# builds require the .NET 10 SDK on Windows. These are developer requirements only.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Vite serves `wallpaper/` and writes root `dist/`. The default base remains `/Lively-wallpaper_Retro_TV/`; `VITE_BASE_PATH` overrides it. Preview uses port 4173. On Windows, use installed Edge with `$env:PLAYWRIGHT_CHANNEL = 'msedge'` before browser tests.

```powershell
dotnet run --project companion/tests/RetroWave.Companion.Tests -c Release
./scripts/build-windows.ps1
# Optional ARM64 build:
./scripts/build-windows.ps1 -Runtime win-arm64
```

The builder first publishes the real companion, embeds it into the separately published setup executable, then produces one ZIP with one installer in ignored `artifacts/`. Temporary publish files are removed. `-DotNet <path>` selects another SDK. Publish before installing: a framework-dependent development executable alone is not an installer.

## Deployment and tests

Set GitHub **Settings → Pages → Source → GitHub Actions**. The workflow checks types, runs unit tests, builds the original subpath and runs browser regressions. Its Windows job checks companion/installer contracts, publishes setup and uploads the Windows artifact. Both jobs must succeed before deployment. Pull requests validate without deploying. The public URL and `dist/` upload path remain unchanged.

Automated coverage includes visuals/callbacks, demo/standby, settings, cover palette, responsive layout, WebGL recovery, lyric parsing/credits, pause/seek/track changes, reduced motion, letter animation, slow lookup/consent, catalogue matching/cache, secure HTTP, package schema, idempotent repair, preservation of user files and uninstall restoration.

Release qualification still needs real Lively audio/metadata delivery, hosted-to-local permission, real player pause/seek/track changes, startup after sign-in and monitor application. Simulated-browser and disposable-library tests do not establish those results. No broad player certification or sustained resource benchmark is claimed.

The previous web build passed 23 unit tests and 18 browser tests. The current companion passes 54 C# checks, including report privacy and bounded log rotation. Package smoke tests verified the one-entry ZIP, both actual application windows and an authenticated native playback report from the embedded self-contained companion. Your existing installation was preserved; the new registry/shortcut installation path still needs a fresh-install or upgrade run. The published executable detected Store Lively 2.2.1.5, installed/repaired its actual URL metadata, and restored every pre-existing metadata hash on uninstall. The self-contained executable read a real Spotify GSMTC session with artwork and a usable timeline. The locally built wallpaper read its authenticated native clock with intercepted fixture lyrics, hid lyrics when the companion stopped, reconnected after restart, and rejected duplicate companion launches. Uninstall removed the owned executable, journal, startup and Installed Apps entries. Actual testing of other installed players and hosted permission/audio delivery remains outstanding; player-selection checks use fixtures and accept arbitrary publishers.

A short startup/idle sample measured about 125 MB working set and 0.42 CPU seconds over 10 seconds on this machine, with public matching disabled. This includes startup work and is not a sustained resource benchmark. Setup UI initialization is deferred when running as a background companion.

## Troubleshooting and uninstall

| Symptom | Action |
| --- | --- |
| Waiting for a signal | Open Lively once and rerun setup. Use its configured entry rather than a separately pasted URL. Check settings' metadata/audio diagnostics. |
| No synced lyrics | Install the companion, allow local access if prompted and select a provider. A usable timeline is required. |
| No Spicy track ID | Catalogue coverage is limited; enable LRCLIB fallback. No Spotify account is needed. |
| Spicy 401/403 | Check the publishable key and allowed origin. |
| Playback port already used | Close the old PowerShell companion and rerun setup. Unrelated processes are not terminated. |
| Different settings in Edge | Lively has a separate profile; configure it there. |
| Local access has no prompt | Support from the installed Lively/browser runtime is required. No supported metadata field grants this permission. |
| Lively not detected | Use a normal installation, open it once and ensure its configured library exists. |

Click **Uninstall** in setup or uninstall **RetroWave TV** through Windows **Installed apps**, then close setup. This stops the owned companion and removes its startup/app entry and installed executables, debugger shortcut and owned diagnostic files. Only created wallpaper files are removed, or original metadata of a reused entry is restored. User additions and later metadata edits are retained. Close/replace the already-running RetroWave page in Lively if needed. Browser preferences/keys are retained. Windows' built-in PowerShell waits for setup to close before deleting its executable; no script, temporary executable, service or scheduled task is installed.

Run setup again to reinstall. Uninstall before moving Lively's library, then reinstall afterward.
