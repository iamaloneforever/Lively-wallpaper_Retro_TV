# Screenshots and video

[Documentation](../README.md) · [Brand guide](../brand/README.md)

[Watch the Spicy Bond demo](spicy-bond-demo.mp4)

## Included media

| File | Contents |
| --- | --- |
| [Cover](../images/cover.png) | Minimal 1600 × 900 dark banner and connected-record logo |
| [Desktop](../images/desktop-preview.png) | Running CRT scene with timed lyrics |
| [Vinyl and lyrics](../images/vinyl-lyrics.png) | Daisy Bell above the second channel |
| [Amazing Grace](../images/amazing-grace.png) | A second public-domain song preview |
| [Effects](../images/effects-preview.png) | Ambient particles and atmospheric effects |
| [Video](spicy-bond-demo.mp4) | H.264, 960 × 540, 30 fps, 360 frames, 12 seconds, silent |
| [Capture metadata](capture.json) | Dimensions, timing, transition and preview provenance |

The captures use the actual WebGL scene and shared lyric renderer. Songs are public-domain compositions: Daisy Bell, Amazing Grace and Auld Lang Syne. Covers and timing are locally authored, and spectrum is simulated. The demo does not play audio or demonstrate a live provider response. Real music and playback timing require the Windows companion.

## Recreate captures

Install Chromium through Playwright and put FFmpeg/ffprobe on PATH. Build and start the production preview:

```powershell
pnpm build
pnpm preview
```

In a second terminal:

```powershell
pnpm capture
pnpm capture:video
```

`capture` renders desktop screenshots and the banner. `capture:video` also captures the 12-second video and applies finishing. Use `--video-only` with the capture script when only video needs regeneration. Set `CAPTURE_URL` for another local URL, `PLAYWRIGHT_EXECUTABLE_PATH` for system Chromium, or `CAPTURE_SOFTWARE=1` for software rendering. Capture can take longer than the output video's duration.

The browser clock is stepped evenly to produce every 30 fps frame. Channel and song changes occur at four and eight seconds. Finishing adds cubic-eased 0.8-second cross-dissolves, a 0.25-second entrance fade, a 0.35-second exit fade, and the current 48 px badge in the corner. The app UI itself stays unchanged.

A clean intermediate is saved at `.build/media-source/spicy-bond-raw.mp4`. Repeat finishing without another browser capture:

```powershell
pnpm video:finish
```

The clean intermediate is ignored by Git and is not in exported source. After a fresh checkout, run `capture:video` to recreate it. Always finish from that raw recording; using an already finished video would compound transitions. The finisher validates 30 fps, 360 frames and a 12-second result before replacing the published MP4.

## Website and release updates

The Vite media plugin serves these canonical docs files in development and emits them into the built website. The showcase and social cover use the same artwork, so no second tracked video copy is required. There are no mobile captures.

After updating captures, run `pnpm build` again. This refreshes the website media and corresponding source snapshot. Browser-regression screenshots are separate and belong in `test-results/`.
