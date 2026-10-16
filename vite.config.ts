import { defineConfig } from 'vite';
// @ts-expect-error Build plugins run in Node; no application types are needed.
import { webLicenses, legalBanner } from './scripts/web-licenses.mjs';
// @ts-expect-error Build source identity is generated from the actual Git tree.
import { buildInfo } from './scripts/source-snapshot.mjs';
// @ts-expect-error Media build plugin runs in Node.
import { showcaseMedia } from './scripts/showcase-media.mjs';
// @ts-expect-error Shared identity plugin runs in Node.
import { brandMetadata, defaultBase } from './scripts/brand.mjs';
export default defineConfig(({ command }) => {
  const info = buildInfo(command === 'serve');
  const base = process.env.VITE_BASE_PATH || defaultBase;
  return {
    root: 'wallpaper',
    base,
    define: { __SPICY_BOND_BUILD__: JSON.stringify(info) },
    plugins: [brandMetadata(base), webLicenses(info), showcaseMedia()],
    esbuild: { legalComments: 'inline' },
    build: {
      target: 'es2022', outDir: '../dist', emptyOutDir: true,
      modulePreload: { polyfill: false },
      rollupOptions: {
        input: { wallpaper: 'wallpaper/index.html', showcase: 'wallpaper/showcase/index.html' },
        output: { banner: legalBanner },
      },
    },
  };
});
