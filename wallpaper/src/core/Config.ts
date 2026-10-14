export interface Config {
  mode: 'broadcast' | 'vinyl'; casing: 'wood' | 'beige'; brightness: number;
  intensity: number; fps: 30 | 60; lowPower: boolean; antenna: boolean;
  clock: boolean; scanlines: boolean; aberration: boolean; noise: boolean;
  curvature: boolean; glow: boolean; reflections: boolean; interference: boolean; particles: boolean;
  lyrics: boolean;
  publicLyrics: boolean;
  lyricStyle: 'smooth' | 'classic' | 'minimal';
  lyricSize: number;
  lyricIntensity: number;
  lyricColor: 'automatic' | 'neutral';
}
export const defaults: Config = {
  mode: 'broadcast', casing: 'wood', brightness: 1, intensity: 0.65, fps: 60,
  lowPower: false, antenna: true, clock: true, scanlines: true, aberration: true,
  noise: true, curvature: true, glow: true, reflections: true, interference: true, particles: true, lyrics: true, publicLyrics: false,
  lyricStyle: 'smooth', lyricSize: 1, lyricIntensity: 0.65, lyricColor: 'automatic',
};
export function loadConfig(): Config {
  const result = { ...defaults };
  try {
    const saved = JSON.parse(localStorage.getItem('retrowave-settings-v1') || '{}') as Record<string, unknown>;
    for (const key of Object.keys(defaults) as (keyof Config)[]) {
      const v = saved[key];
      if (typeof defaults[key] === 'boolean' && typeof v === 'boolean') Object.assign(result, { [key]: v });
    }
    if (saved.mode === 'broadcast' || saved.mode === 'vinyl') result.mode = saved.mode;
    if (saved.casing === 'wood' || saved.casing === 'beige') result.casing = saved.casing;
    if (saved.fps === 30 || saved.fps === 60) result.fps = saved.fps;
    if (saved.lyricStyle === 'smooth' || saved.lyricStyle === 'classic' || saved.lyricStyle === 'minimal') result.lyricStyle = saved.lyricStyle;
    if (saved.lyricColor === 'automatic' || saved.lyricColor === 'neutral') result.lyricColor = saved.lyricColor;
    for (const [key, min, max] of [['lyricSize', 0.65, 1.35], ['lyricIntensity', 0, 1]] as const) {
      if (typeof saved[key] === 'number' && Number.isFinite(saved[key])) result[key] = Math.max(min, Math.min(max, saved[key]));
    }
    for (const key of ['brightness', 'intensity'] as const) if (typeof saved[key] === 'number' && Number.isFinite(saved[key])) result[key] = Math.max(key === 'brightness' ? 0.3 : 0.2, Math.min(1.5, saved[key]));
  } catch { /* Restricted storage or old preferences: use defaults. */ }
  return result;
}
export function saveConfig(config: Config): boolean {
  try {
    const saved = JSON.stringify(config);
    localStorage.setItem('retrowave-settings-v1', saved);
    return localStorage.getItem('retrowave-settings-v1') === saved;
  } catch { return false; }
}
export function nextMode(mode: Config['mode']): Config['mode'] { return mode === 'broadcast' ? 'vinyl' : 'broadcast'; }
