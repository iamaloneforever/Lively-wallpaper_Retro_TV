# Settings, privacy and migration

[Documentation](README.md) · [Get started](getting-started.md)

## Saved wallpaper preferences

Press **S** to configure the wallpaper. A paired Windows companion saves television, visual-effect, performance and lyric preferences to:

```text
%LocalAppData%\SpicyBond\wallpaper-settings.json
```

Existing installations can continue using their previous data directory. The file is separate from installed binaries, so updates, repair and relocation keep preferences.

```json
{
  "version": 1,
  "config": {
    "mode": "vinyl",
    "lyrics": true
  },
  "lyricsKey": ""
}
```

This is a minimal example; the companion saves the complete normalized configuration. Missing supported fields receive defaults. You may edit the file while the wallpaper runs. Invalid JSON and unsupported values report an error and do not replace the last applied preferences.

On first pairing, browser preferences migrate if the JSON file does not exist. Afterwards, the JSON file is authoritative and browser storage is an offline copy. Offline edits are retried after reconnection. The settings panel reports whether the JSON file has actually been saved. An unpaired browser preview saves only to its browser profile.

## Lyrics keys and provider credentials

New profiles use the supplied publishable Spicy Lyrics key. A saved override, including an intentionally empty string, takes precedence and survives reloads. Clearing the key disables that configured key; it does not silently restore the default. Only publishable `sl_pk_…` keys belong in wallpaper preferences. Secret keys are rejected.

The publishable lyrics key can appear in the JSON preference file. Optional provider credentials remain in Windows Credential Locker, separately from wallpaper settings and the pairing token. They are never returned by the localhost bridge. [Lyrics and matching](lyrics.md).

The updated paired companion also saves custom song effects, shaders, enabled states and the overlay preference in `wallpaper-settings.json`. An existing JSON library is authoritative; browser imports migrate when the file has no library. Unpaired profiles use browser storage, and offline library changes retry after reconnection. Export a backup for sharing or moving computers. In Lively, starter downloads and exports open a Windows Save As dialog; Cancel saves nothing. [Custom effects](custom-effects.md).

## Existing installations

The rebrand preserves data rather than resetting it:

| Existing state | Behavior |
| --- | --- |
| Browser preferences | Copy `retrowave-*` entries to missing `spicy-bond-*` entries once; keep current values and intentionally blank keys |
| Native data | Reuse an existing `%LocalAppData%\RetroWave` directory when the new directory does not exist |
| Older installer journal | Read the `%LocalAppData%\RetroWave TV` journal when needed |
| Provider credentials | Read the old vault entry as fallback; writing a credential migrates that named entry |
| Wallpaper registration | Repair adopts the known old/new project URLs, retains pairing and custom settings, and updates the old default title/contact and license metadata |
| Worker lifecycle | Keep the existing coordination IDs and `X-RetroWave-Key` bridge header so older workers can be stopped and paired clients stay compatible |

New installation paths and public names use Spicy Bond. Legacy names above are intentional compatibility identifiers. Original upstream attribution and historical release evidence keep their original names.

## Privacy and local access

Playback comes from Windows media sessions. The companion listens on authenticated localhost, `127.0.0.1:43821`, and validates the request origin and Host. The wallpaper URL fragment carries its pairing token; do not share a paired URL. There is no telemetry.

Optional catalogue and lyric providers receive track metadata when enabled. Catalogue requests require the companion's consent and configured providers; LRCLIB fallback also requires the wallpaper switch. Allow local-network access in Lively's browser profile if prompted.

For development, use isolated `SPICY_BOND_DATA_ROOT` and `SPICY_BOND_BRIDGE_PORT` values. Legacy environment names remain accepted for upgrades. Do not run installation tests against your real profile.
