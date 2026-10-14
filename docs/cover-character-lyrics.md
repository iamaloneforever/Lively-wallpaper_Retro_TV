# Cover color and character motion

Automatic lyrics used to mix 90–95% white into every cover swatch. They now choose a colorful cover swatch, lift its brightness while retaining its hue, and add only enough white to keep dark colors usable. Neutral remains explicitly white. Surrounding lines and waiting characters also use the cover hue.

Smooth mode applies individual color, lift, scale and glow only when a provider segment contains exactly one Unicode grapheme with its own valid start/end timestamps. Each character uses those exact timestamps. Combining accents and joined emoji count as one grapheme and remain intact. Multi-character syllables, whole words and line-only lyrics retain their existing segment/line behavior without character effects or inferred character timestamps. Native animations follow the existing companion clock, pause, seek and playback rate.

Persian, Arabic and other supported joining scripts keep inline glyphs and animate color/glow without transforms that disconnect letters. Classic, Minimal, low power and reduced motion suppress character lift/glow while keeping timed color changes. Untimed lyrics remain static. Animation work is bounded to 320 graphemes per row; unusually long text retains its original segment effect and content.

Verification: TypeScript, production build, all 36 unit tests and all 23 lyric browser tests passed in Edge. Browser regressions cover exact individual-character animation delays/durations, no character effects for word/syllable/line timestamps, actual cover hue, pause/seek, neutral color, Unicode, RTL shaping rules, low power, stale data and provider fallback. Browser fixtures do not establish real Lively/GSMTC integration. The screenshot below uses a fictional track and a red cover fixture.

![Cover-colored characters with an accent and joined emoji](images/wallpaper-polish/cover-character-lyrics.png)
