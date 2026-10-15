# Development

## Build and test

Use Node.js 24 and pnpm 11.19.0. Windows companion builds use the exact .NET SDK in `global.json` (10.0.402). Native execution/UI tests require Windows; compilation, license inventory, static executable inspection and the portable migration/extraction tests can run on Linux too.

```powershell
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm test:packaging
pnpm exec playwright install chromium
pnpm test:e2e
```

`pnpm build` regenerates the Spicy renderer, typechecks, builds with Vite and checks the actual final web output. It ships full license materials and an archive of the actual source inputs in `dist/licenses/`. The inventory combines esbuild's emitted dependency graph with Vite's included modules; additions or version changes require review in the final-output check. Vite serves `wallpaper/`, writes `dist/`, and uses `/Lively-wallpaper_Retro_TV/` as its default base. Run `pnpm dev` for development or `pnpm preview` for the built wallpaper on port 4173. Installed Edge can run tests with `$env:PLAYWRIGHT_CHANNEL='msedge'`.

Clean builds identify `git HEAD` and pin source links to its full commit. Dirty trees, live development servers and exported source archives without Git metadata are labeled development builds; they still produce a local source snapshot. `RETROWAVE_RELEASE=1` requires a clean committed tree and is set in publication builds. Unpack the shipped source ZIP, enter `RetroWave-source`, install with the frozen lockfile and use the same build commands above to rebuild without Git history.

```powershell
dotnet run --project companion/tests/RetroWave.Companion.Tests -c Release
dotnet run --project companion/tests/RetroWave.UI.Tests -c Release
./scripts/build-windows.ps1
./companion/tests/package-smoke.ps1
dotnet run --project companion/tests/RetroWave.Licensing.Tests -c Release
```

The Windows ZIP contains one self-contained `RetroWave-Setup.exe`. `-DotNet <path>` selects an SDK. `-Runtime win-arm64` builds an unqualified ARM64 package. `-Offline` supports cached-package publishing without NuGet audit retrieval; normal CI retains auditing.

The packaging script derives the included runtime files from MSBuild's resolved copy-local inputs, collects the original package licenses/notices plus the reviewed native Windows terms in `licenses/windows/`, and embeds `RetroWave.Licenses.zip` in the executable. It also emits `artifacts/RetroWave-licenses.zip`. `RetroWave.PackageAudit` opens the actual release ZIP, parses the .NET bundle, decompresses assemblies/native entries, checks embedded licenses and AGPL metadata, and accounts for every bundled runtime file by hash. The SDK-patched native `singlefilehost.exe` is recorded separately; static inspection does not independently audit its internal native code. `package-smoke.ps1` executes the shipped license extraction command on Windows before checking setup and worker behavior. Do not publish a self-contained distribution built directly with an ad hoc `dotnet publish`; use the packaging script and required checks.

## Architecture

- `wallpaper/src/background/`: shared-renderer genre environments, layered particle effects, cancellable genre resolution, transitions, presets, and metadata-only song accents. See [the background engine guide](backgrounds.md).
- `wallpaper/src/`: Three.js scene, Lively callbacks, settings, playback clock and lyric-provider adapters.
- `wallpaper/vendor/spicy-lyrics/`: unchanged upstream renderer files, license and hash manifest. `wallpaper/vendor/spicy-host/` connects its state and player interfaces to RetroWave.
- `companion/src/`: one native .NET WPF application with management, headless worker and setup modes. Windows GSMTC playback observation is independent of catalogue requests.
- `lively/`: wallpaper registration metadata. URL wallpapers use `--audio --system-nowplaying --pause-event true`.

The bridge listens on `127.0.0.1:43821`, validates origin/Host and requires `X-RetroWave-Key`. Timestamped snapshots drive lyric timing. Credentials are never returned by the bridge. Data lives in `%LocalAppData%\RetroWave`; installed binaries default to `%LocalAppData%\Programs\RetroWave`.

Tests use isolated `RETROWAVE_DATA_ROOT` and `RETROWAVE_BRIDGE_PORT` values. Do not run package tests against the real installation. Browser fixtures establish renderer and callback behavior, not real-player or installed-Lively qualification.

## Actions, Pages and releases

[Validate and deploy RetroWave TV](https://github.com/iamaloneforever/Lively-wallpaper_Retro_TV/actions/workflows/pages.yml) runs unit tests and eight browser-test shards, with one WebGL worker per runner. Independent shards finish even if another fails so their diagnostics remain available. Windows changes and manual runs also build/test the companion and upload `retrowave-windows`.

On `main`, Pages deployment waits for the browser checks and any required Windows checks. A successful Windows build is then published as a GitHub release, tagged `build-<run number>`, with the installer ZIP, the identical embedded license archive, the web build's complete `source.zip`, and a link to its Actions run. Each new release becomes the latest download. Pull requests validate changes without deploying or publishing. License-material changes trigger the Windows job as well as web checks.

To publish a fresh installer without a code change, select **Run workflow** on `main` in Actions. Do not reuse an older ZIP for a new release. GitHub provides the source archives for each release tag.

Screenshots generated by browser tests belong in `test-results/`. `scripts/capture.mjs` refreshes the single desktop preview used in the README with fictional browser-demo metadata.
