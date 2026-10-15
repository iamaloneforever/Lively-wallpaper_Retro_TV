import { defineConfig } from 'vite';
// @ts-expect-error Build plugins run in Node; no application types are needed.
import { webLicenses, legalBanner } from './scripts/web-licenses.mjs';
// @ts-expect-error Build source identity is generated from the actual Git tree.
import { buildInfo } from './scripts/source-snapshot.mjs';
export default defineConfig(({ command }) => {
  const info = buildInfo(command === 'serve');
  return {
  root: 'wallpaper',
  base: process.env.VITE_BASE_PATH || '/Lively-wallpaper_Retro_TV/',
  define: { __RETROWAVE_BUILD__: JSON.stringify(info) },
  plugins: [webLicenses(info)],
  esbuild: { legalComments: 'inline' },
  build: { target: 'es2022', outDir: '../dist', emptyOutDir: true, modulePreload: { polyfill: false }, rollupOptions: { output: { banner: legalBanner } } },
  };
});
