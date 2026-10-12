# RetroWave TV — Lively Wallpaper setup

The web wallpaper stays hosted at https://iamaloneforever.github.io/Lively-wallpaper_Retro_TV/?live=1. This directory contains Lively metadata; PowerShell helpers are in `../scripts/`.

## Install on Windows

1. Install and start [Lively Wallpaper](https://github.com/rocksdanister/lively).
2. Open PowerShell in the repository root.
3. Run `powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -OpenFolder`.
4. In Lively, use **Add Wallpaper** to import `scripts/RetroWave-TV-Lively.zip`.
5. Check that the imported LivelyInfo.json retains the `Arguments` value.
6. Activate with `powershell -ExecutionPolicy Bypass -File .\scripts\run.ps1`.

Pass `-Monitor 1` to the runner to request a specific monitor.

## Notes

The `Arguments` are `--audio --system-nowplaying --pause-event true`. Lively's handling of ZIP imports, URL-based wallpapers, and these options varies with its version; test your installation. The package does **not** download the website or install any optional Windows media companion. The music application must expose a Windows media session for Now Playing to work.
