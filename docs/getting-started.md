# Get started with Spicy Bond

[Documentation](README.md) · [Troubleshooting](troubleshooting.md)

## Requirements

- Windows 11 x64 and [Lively Wallpaper](https://www.rocksdanister.com/lively/), opened at least once.
- A music player that publishes Windows media-session metadata. Timing support varies by player.
- WebGL2 and hardware acceleration for the wallpaper's 3D scene.

The installer is unsigned and includes the .NET runtime. Windows 10 and ARM64 have not been fully qualified. Spicy Bond is designed for the Windows desktop.

## Install and pair

1. Download `Spicy-Bond-win-x64.zip` from a checked release or the `spicy-bond-windows` artifact of a successful Actions run.
2. Extract the ZIP and run `SpicyBond-Setup.exe`.
3. Choose an installation folder and options. Starting at Windows sign-in is optional and off on a new installation.
4. Install with the companion enabled. Setup registers the hosted wallpaper in Lively and pairs it with the local worker.
5. Open **Spicy Bond** from Start, then play music. Use Dashboard, Now Playing and Diagnostics to inspect what Windows reports.

Default binaries live in `%LocalAppData%\Programs\SpicyBond`; settings and pairing live separately in `%LocalAppData%\SpicyBond`. Upgraded installations can continue using their previous data directory. See [settings and migration](settings.md).

The renamed public repository, release links and Pages URL require the GitHub rename and a deployment. Before that is complete, use the current repository's Actions artifacts or the [local build](development.md).

## Wallpaper controls

| Control | Action |
| --- | --- |
| Drag the TV | Rotate the cabinet |
| Channel dial | Switch Vintage Broadcast / Minimal Vinyl |
| S / Escape | Open / close settings |
| Power | Enter or leave standby |
| Gain | Adjust visualization intensity |
| Find song | Search for a recording when lyrics are missing or mismatched |

Lively input forwarding and desktop icons can affect pointer interaction. Open **S → Background lyrics** to enable lyrics, then adjust text size, glow and timing. The publishable Spicy Lyrics key is preconfigured for a new profile; existing saved choices take priority. [Lyrics guide](lyrics.md).

**S → Background & Visual Effects** controls genre themes, particles, audio response and performance. Custom song effects support imported JSON and GLSL. [Background guide](backgrounds.md) · [Custom effects](custom-effects.md).

## Companion behavior

Closing the management window leaves the worker running. Dashboard and Diagnostics can start, restart, stop or quit it completely. Music Finder configures optional catalogue providers; external matching requires consent. Settings opens setup for repair, relocation and uninstall.

The unpaired browser preview is a silent demonstration with public-domain songs and simulated spectrum. **Next preview song** in settings cycles through its songs. `?live=1` disables the demo; real Lively callbacks take priority over demo content.

## Update, repair or move

Run a newly checked `SpicyBond-Setup.exe` and choose **Install / repair**. Settings and pairing are retained outside the binaries. Reload the wallpaper in Lively after a web deployment; updating the hosted wallpaper does not update the native worker.

Use setup's relocation option to move owned application files. Close other management windows before replacing binaries. Avoid moving files by hand: the companion maintains its shortcuts, uninstall registration and saved installation path.

## Uninstall

Use Windows Installed Apps or setup. Uninstall stops the worker and removes owned binaries, shortcuts and wallpaper registration. Preferences, logs, browser settings and Credential Locker entries are retained. Disconnect optional provider credentials in Music Finder when desired, and close or replace the running wallpaper in Lively afterwards.

Setup offers **Licenses** before installation. The [license guide](licenses.md) explains extraction without installing.
