import { defineConfig } from 'vite';
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/Lively-wallpaper_Retro_TV/',
  build: { target: 'es2022' },
});
