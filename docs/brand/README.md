# Spicy Bond identity

[Documentation](../README.md) · [Media capture](../media/README.md)

![Spicy Bond logo](logo.png)

Two closed record loops form one connected symbol. A solid purple circular badge keeps the yellow mark clear on light and dark backgrounds. Pair it with **Spicy Bond** in bold sans-serif type. The banner uses a near-black surface, white wordmark and the short tagline **Feel the connection.**

## Palette

| Color | Value | Use |
| --- | --- | --- |
| Yellow | `#F5DF48` | Connected records and primary accents |
| Purple | `#6938A8` | Circular logo badge |
| Deep purple | `#241534` | Supporting color |
| Charcoal | `#101012` | Banner and showcase background |
| White | `#F8F8FA` | Wordmark and headings |

## Assets and source of truth

| Asset | Purpose |
| --- | --- |
| [Primary logo](../../wallpaper/public/brand/logo.svg) | Canonical scalable badge; transparent corners, no text |
| [Standalone mark](../../wallpaper/public/brand/mark.svg) | Yellow connected symbol for a dark background |
| [Logo PNG](logo.png) | 512 px transparent export |
| [Small-size preview](size-preview.png) | 16, 24, 32 and 48 px on dark and light backgrounds |
| [Banner](../images/cover.png) | 1600 × 900 project cover |
| [Native icon](../../companion/src/SpicyBond.Companion/Assets/SpicyBond.ico) | 16, 24, 32, 48, 64, 128 and 256 px Windows icon |

[branding.json](../../branding.json) holds the shared name, identifiers, URLs, tagline and palette. `docs/brand/logo.svg`, `docs/brand/mark.svg` and the native SVG are synchronized copies. The generated concept image is reference material; the canonical SVG defines the production mark.

Keep both loops closed and their holes clear. Keep the badge unrotated, preserve its colors and give it space around surrounding content. Use the purple badge on light surfaces and at small sizes. Avoid adding fine decorative lines, gradients, textures or text inside the icon.

## Regenerate

From the repository root, with dependencies and Chromium installed:

```powershell
pnpm brand:sync
pnpm brand:artwork
pnpm brand:check
```

Set `PLAYWRIGHT_EXECUTABLE_PATH` to use system Chromium. `brand:artwork` synchronizes SVG copies and native metadata, renders the PNG/banner/icon previews, produces the ICO and rebuilds the Win32 resource. `brand:resources` only rebuilds the resource from the current icon and manifest. The Windows SDK alternative is `scripts/build-branding.ps1`; `scripts/build-icon.ps1` can redraw the same simple geometry with GDI.

The web build and Windows packaging verify the generated metadata and resources before producing outputs. The main app retains its layout; the logo is used by the favicon, companion, installer and project media. The video corner mark is part of the exported video.

Generated branding text and the embedded manifest use LF line endings on every platform, enforced by `.gitattributes`. This keeps verification and Win32 resource bytes consistent when Git uses Windows checkout conversion.

Independently authored brand assets use the repository's [MIT grant](../../LICENSE-MIT). Upstream names, code and license terms retain their original attribution. [Credits and licenses](../licenses.md).
