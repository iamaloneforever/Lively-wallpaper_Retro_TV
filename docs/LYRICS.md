# Ghost lyrics setup

The wallpaper prefers Spicy Lyrics for lyric text and timestamps. Enable **Use LRCLIB fallback** in wallpaper settings to allow sending the song title, artist, album and duration to lrclib.net. This option is off by default. When enabled, it uses the documented LRCLIB public API when no Spicy key or track ID is available, or Spicy returns no lyrics. LRCLIB matches title, artist, album and duration without a Spotify account or session token. Windows media sessions provide the player and playback clock through the optional local companion. Lyrics never start an estimated timer from a song title: without a reliable clock, the lyric layer stays hidden.

## Spicy Lyrics key

Create an application at https://developers.spicylyrics.org/dashboard/applications, enable client access, and allow the origin `https://iamaloneforever.github.io` (no repository path). Add `http://127.0.0.1:4173` for local previews if needed.

Open wallpaper settings with **S**, or add `&settings=1` to the live URL. Paste the **publishable** `sl_pk_…` key and click **Save lyrics key**. It is saved only in that browser/Lively profile. Secret `sl_sk_…` keys are rejected. Browser and Lively storage are separate.

## Automatic player detection

The companion requires Windows 10 version 1809 or later and **Windows PowerShell 5.1**. It selects Windows' current media session, preferring a playing session when the current one is paused. Spotify, browser players and other players can work when they expose a Windows media session with a usable timeline. Apps that do not expose a timeline cannot be synchronized. Playback rate, pause and seeks are read from Windows; the companion never changes playback.

Start the companion from the project folder. No Spotify account, developer application, client ID or client secret is needed:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\companion\Start-Companion.ps1
```

The companion searches **MetaBrainz / ListenBrainz**, a public music metadata lookup, using the song title, artist and album. A single exact metadata match supplies the identifier Spicy requires. Multiple IDs within that one result represent catalogue variants; the first valid ID is used. It does not call Spotify's API or require the Spotify player. Requests are spaced at least one second apart and results are cached in memory.

**Coverage is limited:** The public dataset does not include every recording. Missing albums, unmatched metadata and competing results are skipped for Spicy matching; LRCLIB can still look up lyrics directly. The lookup does not supply duration, so it cannot independently verify the recording length. MetaBrainz receives the song title, artist and album during lookup; Spicy receives the matched track ID. Playback timing stays between Windows and the wallpaper.

For an unmatched song, create `companion/tracks.local.json` containing an exact title/artist pair and the 22-character ID from a public Spotify track URL (opening a public link does not require developer credentials):

```json
{ "Exact song title|Exact artist": "22characterSpotifyIDxx" }
```

Replace the example with a real ID. The map is ignored by Git and takes priority over public lookup. Restart the companion after editing it. Spicy's documented API accepts Spotify-format IDs only, even for songs playing in another application; Spicy cannot fetch by title alone. LRCLIB provides the documented title-based fallback.

Keep the companion running. No startup task, service, firewall rule or installation is created. Close its PowerShell window to stop it.

It listens only on `127.0.0.1:43821`. Only the hosted wallpaper and the documented local preview origins may read it. The browser may ask for local-network access; grant it to the wallpaper to enable timing. A denied permission or stopped companion hides the lyrics instead of allowing them to drift.

Local-network permission belongs to each browser profile: allowing it in Edge does not grant it inside Lively. The hosted HTTPS page was tested successfully in Edge with this origin-specific permission granted. Hosts that deny local access or do not expose a permission prompt need host-side support before they can use the companion. The JavaScript wallpaper cannot grant this permission itself.

## Display behavior

When lyrics and a matching timeline arrive, the camera smoothly pulls back and the TV lowers to leave room for large, lightly echoed text. Motion animates the current phrase from its existing on-screen position; neighboring phrases fade softly. Cover colors tint the letters and one faint vintage ghost trail per line. Word and letter effects use native opacity and transform animations, synchronized on playback snapshots rather than rewriting glyph styles every frame. Syllable timestamps drive word lifts and decorative letter reveals; held words and punctuation receive extra emphasis. Letter timing is an interpolation within each syllable, not additional timing data from the provider. Joined scripts such as Persian and Arabic animate as whole words to preserve their shapes. Reduced-motion settings disable the lifts and trails. Syllable timing fills words progressively, line timing highlights phrases, and untimed lyrics remain static. Credits appear with the lyrics as required by Spicy Lyrics. No lyrics means no camera change. Turning off **Background lyrics** or TV power hides the layer.

Spicy responses are held in memory for the current song only. Track changes cancel obsolete requests. Missing lyrics, denied keys and rate limits are handled without blocking the TV. The visible credit and settings status identify the provider. LRCLIB receives title, artist, album and duration for fallback lookups. Its line-synced lyrics do not receive invented word timings; plain lyrics remain untimed. Spicy authentication errors and rate limits are reported rather than hidden by fallback. Playback polling continues during lyric requests.

References: [Spicy API](https://developers.spicylyrics.org/docs/reference/get.lyrics), [keys](https://developers.spicylyrics.org/docs/keys), [attribution](https://developers.spicylyrics.org/docs/attribution), [MetaBrainz track lookup](https://labs.api.listenbrainz.org/spotify-id-from-metadata).

Public API reference: [LRCLIB](https://lrclib.net/docs). No anonymous Spotify session lookup is used.
