# Lyrics and song matching

[Documentation](README.md) · [Installation](getting-started.md) · [Troubleshooting](troubleshooting.md)

Spicy Bond uses the Spicy Lyrics renderer for syllable effects, backing vocals, duet alignment, scrolling and interludes. The native Windows companion supplies live playback timing.

## Enable lyrics

Press **S** on the wallpaper, enable **Background lyrics**, and keep the companion running. Adjust text size, glow, color and reduced effects in the same panel. The full lyrics remain scrollable, and the lyrics area stays separate from the TV.

New profiles use the supplied Spicy Lyrics publishable client key. You can replace or clear it in settings. An existing saved key, including an intentionally blank key, takes precedence. Live requests depend on the key's allowed origins and service availability.

| Source | Requirements |
| --- | --- |
| Spicy Lyrics | A publishable `sl_pk_…` key and a Spotify-format recording ID; Music Finder can resolve IDs for other players |
| LRCLIB | Enable **Use LRCLIB fallback**; title and artist metadata are enough, with no key or Spotify ID required |

For Spicy Lyrics, allow `https://iamaloneforever.github.io` in the [developer dashboard](https://developers.spicylyrics.org/dashboard/applications). Secret keys are rejected. LRCLIB lookups send track metadata to [LRCLIB](https://lrclib.net/). Its wallpaper switch controls fallback requests even if the companion permits that source.

With both lyric sources enabled, both are checked and timed lyrics are preferred over plain text. Working lyrics stay visible while another lookup is pending.

## Find the correct recording

When lyrics cannot be found, **Find your song** opens automatically. **Find song** opens it manually. The picker displays the full now-playing name while allowing separate search-title and artist edits. For example, shorten “Fly Me to the Moon 2008 version” to “Fly Me to the Moon” without changing the actual playback metadata.

Results refresh as you type and show full title, artist, provider and ID. Choose a recording to load its lyrics against the current playback clock. A manual choice remains selected when the companion later resolves another catalogue ID. Corrections apply to the current song and reset when playback changes.

The companion queries every enabled, configured catalogue source concurrently, including Apple iTunes recording IDs and experimental Spotify when consented. A slow or failing source does not block later sources. LRCLIB search also requires the wallpaper fallback setting. Update the Windows companion to use interactive catalogue search.

## Search ranking

The visible score is out of 100:

| Signal | Weight |
| --- | ---: |
| Title | 40% |
| Singer | 25% |
| Duration | 20% |
| Source popularity preference | 10% |
| Agreement across sources | 5% |

Missing singer or duration information is excluded from the calculation. Agreement counts distinct sources returning the same recording; repeated rows from one source do not increase it. Each source also shows its best result score.

In the companion's **Music Finder**, save a popularity weight from 0 to 100 for each source, including LRCLIB. These preferences persist in `settings.json` and default to a neutral 50. They express your preference rather than measured service usage.

## Timing and scrolling

The lyric clock runs independently of the 3D render loop and follows native pauses, seeks and playback rate. For a consistent recording delay, use **Lyric timing adjustment (seconds)**: positive values advance the lyrics; negative values delay them. The adjustment is saved in the JSON settings file.

Timed lyrics retain syllable animation, backing vocals, duet alignment and interlude balls. Untimed lyrics support manual scrolling rather than automatic timing. Provider requests never control native playback.

Enable **Lyric censorship** to mask common English profanity with asterisks. Turning it off restores the original text without changing timing. The preference is saved in the companion JSON. If an older companion drops the preference, the switch stays active locally and the settings panel requests an update.

## Preview songs

The unpaired preview uses Daisy Bell, Amazing Grace and Auld Lang Syne with locally authored cover art and lyric timing. It makes no live lyric-provider requests and plays no audio. **Next preview song** in settings cycles through these songs. Real Lively callbacks take priority; `?live=1` starts without the demo.

See [media capture](media/README.md) for the 30 fps video and screenshots, and [settings and migration](settings.md) for saved key behavior.
