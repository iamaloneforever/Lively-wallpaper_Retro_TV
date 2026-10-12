import { defineConfig } from 'vite';
export default defineConfig({
  root: 'wallpaper',
  base: process.env.VITE_BASE_PATH || '/Lively-wallpaper_Retro_TV/',
  build: { target: 'es2022', outDir: '../dist', emptyOutDir: true },
});
