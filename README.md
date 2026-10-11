# RetroWave TV

A little analog in a digital world. An interactive Three.js CRT television with Windows media metadata, a restrained spectrum display, walnut and ivory cabinets, and two broadcast channels.

![RetroWave TV browser demonstration](docs/images/retrowave-tv.jpg)

## Use in Lively

The intended hosted address is **https://iamaloneforever.github.io/Lively-wallpaper_Retro_TV/**. It becomes available after GitHub Pages is enabled and the deployment workflow succeeds.

1. In this repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
2. Let the **Validate and deploy RetroWave TV** workflow finish. You can also run it from the Actions tab.
3. Open the hosted address and verify the television appears.
4. In Lively Wallpaper, choose **+ Add Wallpaper**, paste the hosted HTTPS address into the webpage URL field, and confirm.
5. For a live-only wallpaper, append `?live=1`. This prevents simulated records from appearing when host callbacks are absent. Without it, a clearly labeled browser demo starts after 2.5 seconds without callbacks.

**Music integration has a host-side requirement:** Lively's `--audio --system-nowplaying --pause-event true` launch arguments must be enabled for the wallpaper. A standard URL import does not automatically enable these in the inspected official source. JavaScript cannot enable them, and placing a `LivelyInfo.json` on GitHub Pages does not cause Lively to read it. All application assets can stay on GitHub Pages, but the zero-configuration “paste URL and receive music” requirement is not established. See the [compatibility report](docs/COMPATIBILITY.md) for evidence and a manual validation procedure. No local asset package is supplied as a substitute.

The app reads Windows media session metadata; it does not recognize songs from sound. Spotify, Tidal and browsers are supported only when their session data is exposed by Windows and forwarded by Lively. Television controls do not control those applications.

## Controls

- Drag the television to rotate it; pointer movement gives gentle camera parallax.
- Click its **channel dial** or **Change channel** to switch between Vintage Broadcast and Minimal Vinyl.
- Click **power** to switch the screen into standby.
- Click **volume/gain** to cycle visualization response. This changes visual gain, not system audio volume.
- Open the gear for cabinet finish, brightness, intensity, scanlines, glow, curvature, grain, RGB separation, reflections, interference, particles, antenna, clock, 30/60 FPS, and low power mode.
- **Wallpaper view** hides the surrounding editorial UI. Press Escape to exit or close settings.
- Settings persist per origin when the host permits local storage.

Lively's desktop input forwarding and desktop icons can restrict clicks or dragging. The browser settings provide the same configuration controls. Browser and Lively storage are separate; preferences changed in one are not guaranteed to appear in the other.

## Develop and verify

Use Node.js 24 and pnpm 11.19.0:

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

Vite defaults to `/Lively-wallpaper_Retro_TV/`. Open the path shown by Vite. `pnpm preview` serves the production build on port 4173, at the same project subpath used by GitHub Pages. `VITE_BASE_PATH` overrides the build path when hosting elsewhere. CI derives it from the repository name.

On Windows, an installed Edge can be used for tests instead of downloading Chromium:

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
pnpm test:e2e
```

The browser integration suite verifies the production subpath, missing assets/console errors, demo mode, callbacks, standby, settings persistence, narrow layout, and context recovery. Unit tests cover metadata, malformed data, artwork format signatures, track changes, audio normalization, smoothing, stale signal decay, frequency bands and channel switching. These tests simulate the host callback interface; they do not establish actual Lively compatibility.

## Architecture

`src/core` coordinates lifecycle and validated settings. `src/lively` owns the global callbacks and host state. `src/music` normalizes metadata and tracks changes. `src/audio` independently filters and analyzes spectrum input. `src/graphics` constructs the procedural television, lighting, raycast controls and CRT shader. `src/ui` paints the screen texture, creates fictional demo artwork, and provides settings.

Everything is bundled locally; there are no runtime CDN dependencies, API keys, backend, downloaded model files, or desktop audio capture in the browser. Fictional artwork is drawn procedurally. Scanlines, phosphor glow and a small four-tap bloom approximation share one shader pass. Adaptive pixel ratio reduction, a frame cap, 30 Hz screen painting, visibility/host pause checks, stale audio decay, debounced resizing and resource cleanup reduce wallpaper cost. Context restoration re-uploads the screen texture. WebGL2 is required by current Three.js; when unavailable, a clearly explained canvas fallback remains functional for metadata instead of failing silently.

## Deployment

The Pages workflow checks types, runs unit tests, builds, installs Chromium, runs browser tests, uploads the Pages artifact and deploys on every push to `main`. Pull requests validate without deploying. GitHub Pages must be configured for **GitHub Actions**. No permanent dev server is necessary for the deployed wallpaper. For renamed repositories update the browser-test path along with the Vite default; CI already derives its build path.

See [verification and manual host tests](docs/COMPATIBILITY.md) before treating system-media integration as verified.
