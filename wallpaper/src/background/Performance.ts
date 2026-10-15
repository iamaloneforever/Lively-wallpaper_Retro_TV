export const performancePresets = {
  low: { pixelRatio: 1, particles: 96, fps: 30 },
  balanced: { pixelRatio: 1.5, particles: 256, fps: 60 },
  high: { pixelRatio: 1.75, particles: 512, fps: 60 },
  ultra: { pixelRatio: 2, particles: 768, fps: 60 },
} as const;
export type PerformancePreset = keyof typeof performancePresets;
