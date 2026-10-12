import { describe, it, expect } from 'vitest';
import { AudioEngine } from '../../src/audio/AudioEngine';
import { nextMode } from '../../src/core/Config';
describe('audio processing', () => {
  it('normalizes unbounded input and filters nonfinite values', () => {
    const audio = new AudioEngine(); audio.update([500, -1, NaN, Infinity], 0); audio.tick(0.1, 0);
    expect(audio.spectrum[0]).toBeGreaterThan(0); expect(Math.max(...audio.spectrum)).toBeLessThanOrEqual(1);
    expect([...audio.spectrum.slice(1)]).toEqual(Array(127).fill(0));
  });
  it('smooths attack and release, retains peaks, and decays stale signals', () => {
    const audio = new AudioEngine(); audio.update(Array(128).fill(1), 0); audio.tick(1 / 60, 0);
    const first = audio.spectrum[0]; expect(first).toBeGreaterThan(0); expect(first).toBeLessThan(1);
    audio.tick(1 / 60, 16); expect(audio.spectrum[0]).toBeGreaterThan(first);
    audio.tick(0.1, 700); expect(audio.peaks[0]).toBeGreaterThan(audio.spectrum[0]);
    for (let i = 0; i < 100; i++) audio.tick(0.1, 1000 + i * 100);
    expect(audio.bass).toBeLessThan(0.001);
  });
  it('separates low and high frequency ranges and detects onsets', () => {
    const audio = new AudioEngine(); audio.update(Array.from({ length: 128 }, (_, i) => i < 16 ? 1 : 0), 0); audio.tick(0.1, 0);
    expect(audio.bass).toBeGreaterThan(0.5); expect(audio.mid).toBe(0); expect(audio.treble).toBe(0); expect(audio.transient).toBeGreaterThan(0);
  });
  it('alternates display channels', () => { expect(nextMode('broadcast')).toBe('vinyl'); expect(nextMode('vinyl')).toBe('broadcast'); });
});
