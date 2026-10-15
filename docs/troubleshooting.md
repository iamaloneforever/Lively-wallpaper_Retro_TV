# Troubleshooting

## Playback and lyrics

| Problem | What to check |
| --- | --- |
| No playback or timeline | Open a player and check RetroWave Diagnostics. The player must publish usable Windows media-session metadata and timing. |
| Lyrics do not appear | Enable Background lyrics, keep the worker running, and configure Spicy Lyrics or LRCLIB. Missing lyrics do not replace the TV display. |
| Spicy returns 401/403 | Check the publishable key and allowed origin in the Spicy developer dashboard. LRCLIB can work independently. |
| No Spotify ID or ambiguous match | Inspect Music Finder candidates and rejection reasons. Enable LRCLIB for title/artist lookup without an ID. |
| Provider unavailable | Check consent, credentials, network access and provider backoff. A provider request does not control the native playback clock. |
| Genre always missing on Spotify | Update the installed companion, allow external catalogue matching, and enable MusicBrainz or Apple iTunes. Spotify often supplies no Windows genre. Check Now Playing → Genres and the wallpaper's Background & Visual Effects status. MusicBrainz artist tags are a labeled fallback when recording genres are absent. |
| Bridge disconnected | Start or restart the companion. Repair setup if pairing is missing. Allow local-network access in Lively's browser profile when prompted. |
| Port already in use | Close an older RetroWave worker or PowerShell companion. Unrelated processes are not terminated. |
| Lively not detected | Open Store or standard Lively once and check its library folder. Portable/custom host locations are not detected automatically. |
| Old wallpaper appearance | Reload or restart the wallpaper in Lively after the Pages deployment finishes. |

The wallpaper's LRCLIB switch controls fallback requests even when the companion allows them. Turning it off stops new requests and clears fallback lyrics. Untimed lyrics do not auto-scroll; scroll the full list manually.

## Settings and installation

Press **S** to open settings and **Escape** to close them. Settings need browser local storage. Desktop icons and Lively input forwarding can affect mouse interaction. WebGL2 and hardware acceleration are recommended.

RetroWave Settings opens setup for repair, relocation or uninstall. Close other management windows before replacing installed files. Relocation preserves settings and pairing. Application data is stored separately from the installation folder.

Uninstall through Windows Installed Apps or setup. This stops the worker and removes owned binaries, shortcuts and registration. Preferences, logs, browser settings and Credential Locker entries are retained; disconnect optional credentials in Music Finder when desired. Close or replace the running wallpaper in Lively afterward.

## Reporting a problem

Include the release/build number, Windows version, Lively version, player name, and sanitized Diagnostics output. For failed builds, include the Actions run link. Do not share credentials or a paired wallpaper URL.
