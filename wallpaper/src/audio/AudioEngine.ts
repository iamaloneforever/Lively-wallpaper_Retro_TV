const average = (array: Float32Array, start: number, end: number): number => {
  let sum = 0; for (let i = start; i < end; i++) sum += array[i]; return sum / (end - start);
};
export class AudioEngine {
  readonly spectrum = new Float32Array(128);
  readonly peaks = new Float32Array(128);
  private target = new Float32Array(128);
  private scale = 1;
  private previousBass = 0;
  bass = 0; mid = 0; treble = 0; transient = 0;
  lastInput = -Infinity;
  update(values: number[], now = performance.now()): void {
    if (!Array.isArray(values)) return;
    let max = 1;
    for (const value of values.slice(0, 128)) if (Number.isFinite(value)) max = Math.max(max, Math.abs(value));
    this.scale = Math.max(max, this.scale * 0.98);
    for (let i = 0; i < 128; i++) {
      const value = Number.isFinite(values[i]) ? Math.max(0, values[i]) / this.scale : 0;
      this.target[i] = value < 0.015 ? 0 : Math.min(1, value);
    }
    this.lastInput = now;
  }
  tick(dt: number, now = performance.now()): void {
    if (now - this.lastInput > 500) this.target.fill(0);
    for (let i = 0; i < 128; i++) {
      const rate = this.target[i] > this.spectrum[i] ? 18 : 5;
      this.spectrum[i] += (this.target[i] - this.spectrum[i]) * (1 - Math.exp(-rate * dt));
      this.peaks[i] = Math.max(this.spectrum[i], this.peaks[i] - dt * 0.35);
    }
    this.bass = average(this.spectrum, 0, 16);
    this.mid = average(this.spectrum, 16, 72);
    this.treble = average(this.spectrum, 72, 128);
    // An onset measure, deliberately not a beat or BPM estimate.
    this.transient = Math.max(this.transient * Math.exp(-8 * dt), Math.max(0, this.bass - this.previousBass) * 6);
    this.previousBass = this.bass;
  }
}
