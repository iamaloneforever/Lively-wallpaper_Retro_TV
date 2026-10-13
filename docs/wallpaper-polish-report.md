# Wallpaper settings, channel dial and lyrics polish

## Causes and changes

| Area | Finding | Change |
| --- | --- | --- |
| Settings | The entire panel, including its header, was the scroll container. It had no independently focusable scroll region, explicit touch/scroll containment or modal scene boundary. The original wheel failure inside Lively could not be reproduced in this environment. | Bounded flex panel with fixed header, `min-height:0` scrollable content, keyboard focus, native scrollbar, `pan-y` and contained scrolling. Settings stop event propagation and disable scene input while open; the background is inert. |
| Channel dial | The cylinder used an X Euler orientation and then a Z Euler rotation. With this composition, its cylinder axis and attached marker tilted rather than rotating about the cabinet's front-facing axis. | Bake the fixed orientation into the cylinder geometry. Rotate a separate Z pivot containing the knob and face marker. Damping is independent of frame rate, targets are exactly 0 and π/2, and gain remains separate. |
| Lyric colors | `special` was assigned for punctuation or a duration ≥1.2 seconds and given another accent color. Per-letter opacity also changed neighboring text independently. | Remove `special`, per-letter elements and the colored duplicate-line shadow. Use consistent past/upcoming/active colors and intentional singing highlights only on timestamped segments. |
| Timing semantics | The renderer divided each provider syllable duration evenly among its graphemes. Invalid syllable timing discarded its text. | Render intact provider segments with their original timestamps; retain invalid segments as unclocked text. Joined word containers retain syllables without fragmenting script shaping. Line-only lyrics have no word animations. |
| Static lyrics | Only the first two static lines were rendered by the three-slot timed renderer. | Show every untimed line in a readable, manually scrollable stage without fabricated karaoke or automatic advancement. |
| Late responses | A pending provider request was not invalidated when the companion reported unmatched/no-session data or disconnected. | Abort it and advance the generation; stale lyric responses cannot repopulate a cleared track. |

Settings retain every existing option and now group Appearance, Television display, Visual effects, Performance, Lyrics appearance, and Demo/diagnostics. Slider values update immediately. New preferences safely extend `retrowave-settings-v1`; old values survive and new users receive Smooth. Brightness migration now respects the slider's minimum. Shortcuts ignore text editing and modifier combinations.

## Animation and color behavior

Smooth uses measured line heights, retained previous/active/upcoming elements, vertical movement, scale and a restrained settling curve. Interrupted transitions sample the displayed pose before retargeting. Provider-timed words receive up to 3px upward motion and 2.5% scaling, multiplied by intensity. Intact timed syllables brighten smoothly and settle into the completed ink color. No letter timestamps are inferred.

Classic shortens line transitions and suppresses word movement. Minimal, low power and reduced-motion preferences remove spatial lyric animation while keeping timestamp-based highlighting. Lyric size spans 65–135%; intensity spans 0–100%. Untimed and line-only providers stay at their actual timing granularity.

Native text animations remain anchored to the authenticated companion's estimated playback clock. Pause, rate changes, seeks and Lively suspension resynchronize existing animations. Routine polls do not recreate animations. Missing/stale snapshots hide lyrics. Full-track changes cancel old data, animations and layout observers.

The automatic palette tints high-contrast text using album colors. A luminance calculation adds only the dark backing needed for at least 4.5:1 active-text contrast against a conservative album backdrop bound. Neutral provides stable near-white ink. This bound is a model of the album backdrop, not a certification of every rendered pixel or lower-contrast inactive line.

Long lines retain wrapping and can scroll within a bounded active area. The stage leaves room above the antenna; an upcoming line that cannot fit beneath a tall active phrase stays hidden until it becomes active. Short lines have padding for vocal movement without unnecessary scrollbars. Persian, Arabic, mixed direction, combining marks, emoji and repeated whitespace remain intact. Attribution links and static lyric scrolling now sit above the canvas and receive input.

The public [Spicy Lyrics project](https://github.com/Spikerko/spicy-lyrics) and its documented timing distinctions informed the interaction direction. Its AGPL implementation was not copied. The code independently extends the existing Motion/Three.js architecture; no dependency was added.

## Validation

- TypeScript check and production build passed.
- 31 unit tests passed, including legacy configuration migration, bounded presets, channel pivot and equal elapsed time at 30/60Hz, and palette contrast/fallback calculations.
- 31 Playwright tests passed locally in installed Microsoft Edge with one worker; subsequent refinements were checked with the 20 affected lyric cases and five settings/transition cases.
- Settings checks exercise wheel input, keyboard Home/End, real scrollbar-thumb dragging, browser touch events, small viewports, a 3x device pixel ratio, persistence/reset, every boolean preference, interactive controls after scrolling and repeated opening/closing.
- Dial checks exercise physical raycast clicks, on-screen switching, selector switching, rapid toggling, persisted channel state, fixed pivot/axis, deterministic settling, independent gain and existing drag/WebGL recovery.
- Lyrics checks cover actual provider segment timestamps, unclocked malformed segments, pause/resume, rate changes, seeks, intermediate line positions, zero style/class writes in settled paused lyrics, Lively suspension, stale snapshots, disconnection/reconnection, provider backoff, delayed obsolete responses, LRCLIB, untimed lyrics, missing lyrics, long/multiline text, joining scripts, mixed direction and reduced/low-power modes.
- Headless scrollbar hiding is disabled so drag tests and screenshots exercise the visible native scrollbar. Thumb coordinates avoid its arrow buttons.

Browser screenshots use deterministic, fictional playback/provider responses; they do not show real music integration. Motion checks sample intermediate frames and native animation clocks rather than relying on screenshots alone.

## Visual evidence

| Evidence | Screenshot |
| --- | --- |
| Settings top / bottom | [Top](images/wallpaper-polish/settings-top.png) · [Bottom](images/wallpaper-polish/settings-bottom.png) |
| Small high-DPI settings | [Narrow panel](images/wallpaper-polish/settings-dpi-zoom.png) |
| Channel 01 / 02 | [Broadcast](images/wallpaper-polish/channel-broadcast.png) · [Vinyl](images/wallpaper-polish/channel-vinyl.png) |
| Timed syllables / active line / transition | [Syllables](images/wallpaper-polish/lyrics-syllables.png) · [Active line](images/wallpaper-polish/ghost-lyrics.png) · [Transition](images/wallpaper-polish/lyrics-transition.png) |
| Persian/Arabic and mixed text | [RTL](images/wallpaper-polish/lyrics-rtl.png) · [Timed joining script](images/wallpaper-polish/lyrics-rtl-syllables.png) · [Mixed](images/wallpaper-polish/lyrics-mixed.png) |
| Long and narrow text | [Long line](images/wallpaper-polish/lyrics-long.png) · [Narrow lyrics](images/wallpaper-polish/ghost-lyrics-mobile.png) |
| Album palettes | [Light](images/wallpaper-polish/lyrics-album-light.png) · [Dark](images/wallpaper-polish/lyrics-album-dark.png) · [Saturated](images/wallpaper-polish/lyrics-album-saturated.png) |

## Performance and limits

### Follow-up for GitHub Actions run 38441577788

The first PR run reported 28/31 browser tests passing. The suspended-appearance test found a real clock mismatch: native animations had advanced beyond `lastPosition` before the host pause, so rebuilding colors rewound them by about 261 ms. Suspension now captures the displayed native animation time, normalizes the paused segments to it and preserves that position when rebuilding appearance. A regression test covers a native clock 350 ms ahead of the last rendered frame.

The two settings tests exhausted their total 60-second budgets during ordinary click sequences. Downloaded traces show software-rendered frames approximately 320–330 ms apart, with controls visible and stable and no reported overlay interception. Settings also marked the cabinet material for shader invalidation on every input; that now happens only when its texture changes, with regression coverage. CI uses a 960×540 desktop viewport to reduce software framebuffer work; explicit narrow/high-DPI contexts remain unchanged. Clicks, assertions and timeouts have not been relaxed or bypassed.

Follow-up local validation: typecheck and production build passed, all 33 unit tests passed, and all 31 browser tests passed in Edge with CI settings (1.3 minutes); the three affected tests also passed separately. Linux Chromium verification is tracked separately by the PR workflow.

Run 38445857988 confirmed the suspension and rapid-channel regressions were resolved, with 29/31 browser tests passing. The remaining full-settings sequence still exhausted its aggregate budget; its clicks completed, but the final low-power toggle reached the time limit. While settings are open, the background scene now waits at least 125 ms after render submission and eight eligible animation callbacks before drawing again, giving DOM input and scrolling actual idle frames even when the compositor finishes long after GPU submission returns. Playback polling, lyric clocks and audio continue; closing settings restores the chosen scene frame rate. A browser regression samples real WebGL draws across animation frames to verify both pacing and restoration.

That run also exposed the older native-animation test's fixed 180 ms timer assumption: a timer can fire without a new animation frame on a slow runner. The test now samples actual animation frames over the observation interval, and its mock snapshots include their capture timestamp so transport delay cannot reset the clock. The progress and zero-paused-drift assertions are unchanged.

Run 38447671500 passed every lyric test (30/32 browser tests overall). It showed that submission-time pacing alone did not guarantee skipped browser frames, motivating the explicit callback pacing above. Settings persistence, each boolean group's persistence/reset, and repeated modal opening now have separate focused tests instead of sharing one aggregate 60-second scenario. Every original control still receives real input and persistence assertions; per-toggle reset assertions were added. No timeout was increased. The browser suite now contains 35 tests.

Final local follow-up: typecheck/build passed. The complete 35-test run passed 34 tests and exposed a refresh-rate assumption in the new pacing observation; after observing at least 24 callbacks and 500 ms and comparing render fractions, all eight settings tests passed (12.6 seconds). The other 27 tests had passed in the full run. Final Linux results are recorded in PR #3's workflow and description.

No framework, runtime CDN or package dependency was added. Timed rendering retains at most three rows; per-letter animation objects have been replaced with intact provider-segment objects. Layout is measured on row/configuration/resize changes, not every frame. Settled paused lyrics produced zero style/class mutations over the tested observation period. Existing 30/60 FPS and TV quality behavior remain intact. The production JavaScript bundle is approximately 548 kB (144 kB gzip); Vite still emits its >500 kB chunk advisory.

These are browser observations, not a long-duration CPU/GPU, battery or leak benchmark. Live Lively/WebView2 input forwarding, actual GSMTC playback, physical touchpad hardware and real display scaling remain unqualified. Browser touch events, Edge and simulated playback were tested. The zoom check uses the reduced CSS viewport and increased pixel ratio corresponding to 150% zoom, not the browser's zoom menu. Per-pixel contrast, perfect shaping on every font/platform, mechanical clipping at every camera pose and live provider availability are not claimed as certified.

The companion, authentication, provider request contracts, installer, CRT shaders, camera targets, audio callbacks and Pages base URL were not changed. This feature is delivered for review; it does not merge or deploy to Pages.

## Files

- `wallpaper/src/core/App.ts`, `Config.ts`: settings boundaries, bindings, appearance and migration.
- `wallpaper/src/ui/Settings.ts`, `wallpaper/src/style.css`: layout, groups, scrolling and lyric presentation.
- `wallpaper/src/graphics/Television.ts`, `SceneManager.ts`: correct dial pivot/damping and scene input gating.
- `wallpaper/src/lyrics/Lyrics.ts`, `LyricsController.ts`, new `LyricsPalette.ts`: truthful text timing, palettes, presets and stale-response handling.
- `playwright.config.ts`, existing `lyrics.spec.ts`, new `settings.spec.ts`, `lyrics-polish.spec.ts`, `controls.test.ts`, `lyrics-palette.test.ts`: regression coverage.
- README, this report and the accompanying screenshots.
