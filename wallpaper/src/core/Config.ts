import { isThemeId, isParticleStyle, type ThemeId, type ParticleStyle } from '../background/Themes';
import { performancePresets, type PerformancePreset } from '../background/Performance';
export interface Config {
  songAccents: boolean; particleStyle: ParticleStyle;
  autoGenre: boolean; manualTheme: ThemeId | 'auto'; defaultTheme: ThemeId;
  backgroundAnimation: boolean; backgroundIntensity: number; reactivity: number;
  particleMotion: number; particleScale: number; particleDensity: number; backgroundGlow: number; analogIntensity: number;
  backgroundBrightness: number; transitionDuration: number; reducedMotion: boolean;
  performancePreset: PerformancePreset;
  mode: 'broadcast' | 'vinyl'; casing: 'wood' | 'beige'; brightness: number;
  intensity: number; fps: 30 | 60; lowPower: boolean; antenna: boolean;
  clock: boolean; scanlines: boolean; aberration: boolean; noise: boolean;
  curvature: boolean; glow: boolean; reflections: boolean; interference: boolean; particles: boolean;
  lyrics: boolean; censorLyrics: boolean;
  publicLyrics: boolean;
  lyricStyle: 'smooth' | 'classic' | 'minimal';
  lyricSize: number;
  lyricIntensity: number;
  lyricOffset: number;
  lyricColor: 'automatic' | 'neutral';
}
export const defaults: Config = {
  songAccents: true, particleStyle: 'auto', autoGenre: true, manualTheme: 'auto', defaultTheme: 'synthwave', backgroundAnimation: true,
  backgroundIntensity: 0.65, reactivity: 1, particleMotion: 1.8, particleScale: 1.5, particleDensity: 0.7, backgroundGlow: 0.65,
  analogIntensity: 0.65, backgroundBrightness: 0.85, transitionDuration: 3, reducedMotion: false,
  performancePreset: 'balanced',
  mode: 'broadcast', casing: 'wood', brightness: 1, intensity: 0.65, fps: 60,
  lowPower: false, antenna: true, clock: true, scanlines: true, aberration: true,
  noise: true, curvature: true, glow: true, reflections: true, interference: true, particles: true, lyrics: true, censorLyrics: false, publicLyrics: false,
  lyricStyle: 'smooth', lyricSize: 1, lyricIntensity: 0.65, lyricOffset: 0, lyricColor: 'automatic',
};
export function parseConfig(saved: Record<string, unknown>): Config {
  const result = { ...defaults };
  try {
    for (const key of Object.keys(defaults) as (keyof Config)[]) {
      const v = saved[key];
      if (typeof defaults[key] === 'boolean' && typeof v === 'boolean') Object.assign(result, { [key]: v });
    }
    if (isParticleStyle(saved.particleStyle)) result.particleStyle = saved.particleStyle;
    if (isThemeId(saved.manualTheme) || saved.manualTheme === 'auto') result.manualTheme = saved.manualTheme;
    if (isThemeId(saved.defaultTheme)) result.defaultTheme = saved.defaultTheme;
    if (typeof saved.performancePreset === 'string' && Object.hasOwn(performancePresets, saved.performancePreset)) result.performancePreset = saved.performancePreset as PerformancePreset;
    for (const [key, min, max] of [
      ['particleMotion', 0, 3], ['particleScale', .5, 3], ['backgroundIntensity', 0, 1.5], ['reactivity', 0, 2], ['particleDensity', 0, 1],
      ['backgroundGlow', 0, 1.5], ['analogIntensity', 0, 1], ['backgroundBrightness', 0.1, 1.5], ['transitionDuration', 0.3, 10],
    ] as const) if (typeof saved[key] === 'number' && Number.isFinite(saved[key])) result[key] = Math.max(min, Math.min(max, saved[key]));
    if (saved.mode === 'broadcast' || saved.mode === 'vinyl') result.mode = saved.mode;
    if (saved.casing === 'wood' || saved.casing === 'beige') result.casing = saved.casing;
    if (saved.fps === 30 || saved.fps === 60) result.fps = saved.fps;
    if (saved.lyricStyle === 'smooth' || saved.lyricStyle === 'classic' || saved.lyricStyle === 'minimal') result.lyricStyle = saved.lyricStyle;
    if (saved.lyricColor === 'automatic' || saved.lyricColor === 'neutral') result.lyricColor = saved.lyricColor;
    for (const [key, min, max] of [['lyricSize', 0.65, 1.35], ['lyricIntensity', 0, 1], ['lyricOffset', -30, 30]] as const) {
      if (typeof saved[key] === 'number' && Number.isFinite(saved[key])) result[key] = Math.max(min, Math.min(max, saved[key]));
    }
    for (const key of ['brightness', 'intensity'] as const) if (typeof saved[key] === 'number' && Number.isFinite(saved[key])) result[key] = Math.max(key === 'brightness' ? 0.3 : 0.2, Math.min(1.5, saved[key]));
  } catch { /* Restricted storage or old preferences: use defaults. */ }
  return result;
}
export function loadConfig(): Config {
  try { return parseConfig(JSON.parse(localStorage.getItem('spicy-bond-settings-v1') || '{}')); }
  catch { return { ...defaults }; }
}
export function saveConfig(config: Config): boolean {
  try {
    const saved = JSON.stringify(config);
    localStorage.setItem('spicy-bond-settings-v1', saved);
    return localStorage.getItem('spicy-bond-settings-v1') === saved;
  } catch { return false; }
}
export function nextMode(mode: Config['mode']): Config['mode'] { return mode === 'broadcast' ? 'vinyl' : 'broadcast'; }
