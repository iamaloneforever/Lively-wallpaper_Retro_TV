# Ghost lyrics setup

The wallpaper uses Spicy Lyrics for lyric text and timestamps. Windows media sessions provide the player and playback clock through the optional local companion. Lyrics never start an estimated timer from a song title: without a reliable clock, the lyric layer stays hidden.

## Spicy Lyrics key

Create an application at https://developers.spicylyrics.org/dashboard/applications, enable client access, and allow the origin `https://iamaloneforever.github.io` (no repository path). Add `http://127.0.0.1:4173` for local previews if needed.

Open wallpaper settings with **S**, or add `&settings=1` to the live URL. Paste the **publishable** `sl_pk_…` key and click **Save lyrics key**. It is saved only in that browser/Lively profile. Secret `sl_sk_…` keys are rejected. Browser and Lively storage are separate.

## Automatic player detection

The companion requires Windows 10 version 1809 or later and **Windows PowerShell 5.1**. It selects Windows' current media session, preferring a playing session when the current one is paused. Spotify, browser players and other players can work when they expose a Windows media session with a usable timeline. Apps that do not expose a timeline cannot be synchronized. Playback rate, pause and seeks are read from Windows; the companion never changes playback.

Spicy Lyrics requires a Spotify track ID even when music plays in another app. For automatic matching, create a Spotify developer application with Web API access and set these environment variables **locally** before starting the companion:

```powershell
$env:RETROWAVE_SPOTIFY_CLIENT_ID = 'your application client ID'
$env:RETROWAVE_SPOTIFY_CLIENT_SECRET = 'your application client secret'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\companion\Start-Companion.ps1
```

The Spotify secret stays in the companion process and is never sent to the wallpaper or GitHub. Spotify's developer eligibility and access restrictions apply. Lookup matches title, artist and duration; ambiguous versions are skipped. Keep the companion running. No startup task, service, firewall rule or installation is created. Close its PowerShell window to stop it.

Without Spotify credentials, a manual mapping also works: create `companion/tracks.local.json` containing title/artist pairs and Spotify track IDs:

```json
{ "Exact song title|Exact artist": "22characterSpotifyIDxx" }
```

Replace that example with an actual 22-character ID from a Spotify track URL. The map is ignored by Git. Restart the companion after changing it.

It listens only on `127.0.0.1:43821`. Only the hosted wallpaper and the documented local preview origins may read it. The browser may ask for local-network access; grant it to the wallpaper to enable timing. A denied permission or stopped companion hides the lyrics instead of allowing them to drift.

## Display behavior

When lyrics and a matching timeline arrive, the camera smoothly pulls back and the TV lowers to leave room for large, lightly echoed text. The current phrase stays sharp; neighboring phrases are faded. Syllable timing fills words progressively, line timing highlights phrases, and untimed lyrics remain static. Credits appear with the lyrics as required by Spicy Lyrics. No lyrics means no camera change. Turning off **Background lyrics** or TV power hides the layer.

Spicy responses are held in memory for the current song only. Track changes cancel obsolete requests. Missing lyrics, denied keys and rate limits are handled without blocking the TV. No other lyric provider is silently substituted.

References: [Spicy API](https://developers.spicylyrics.org/docs/reference/get.lyrics), [keys](https://developers.spicylyrics.org/docs/keys), [attribution](https://developers.spicylyrics.org/docs/attribution), [Spotify client credentials](https://developer.spotify.com/documentation/web-api/tutorials/client-credentials-flow).
