const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smoothstep = (low: number, high: number, value: number) => {
  const t = clamp((value - low) / (high - low)); return t * t * (3 - 2 * t);
};
export const particleVisibility = (x: number, y: number): number =>
  1 - smoothstep(.78, 1, Math.max(Math.abs(x), Math.abs(y)));

/** Persistent positions and eased velocities; changing an effect never replaces a trajectory. */
export class ParticleMotion {
  readonly positions: Float32Array;
  readonly seeds: Float32Array;
  readonly shapeA: Float32Array;
  readonly shapeB: Float32Array;
  private velocities: Float32Array;
  private target = new Float32Array(6);
  private time = 0;
  constructor(readonly count = 768, random: () => number = Math.random) {
    this.positions = new Float32Array(count * 3); this.seeds = new Float32Array(count);
    this.shapeA = new Float32Array(count * 4); this.shapeB = new Float32Array(count * 2);
    this.velocities = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      this.positions[i * 3] = random() * 2 - 1; this.positions[i * 3 + 1] = random() * 2 - 1;
      this.positions[i * 3 + 2] = random(); this.seeds[i] = random();
    }
  }
  tick(dt: number, weights: Float32Array, orbit: number, bass: number, aspect: number, active = this.count, speed = 1): void {
    // Drop catch-up motion after a slow frame; never advance visible particles in a large jump.
    const step = Math.max(0, Math.min(1 / 30, dt));
    if (!step) return;
    const travel = step * Math.max(0, speed);
    this.time += travel;
    const ease = 1 - Math.exp(-step / .8), width = Math.max(.5, aspect);
    for (let i = 0; i < Math.min(active, this.count); i++) {
      const seed = this.seeds[i], choice = (seed * 73.19) % 1;
      let total = 0, norm = 0;
      for (let j = 0; j < 6; j++) {
        const weight = smoothstep(total - .015, total + .015, choice) - smoothstep(total + weights[j] - .015, total + weights[j] + .015, choice);
        this.target[j] = weight; total += weights[j]; norm += weight;
      }
      for (let j = 0; j < 6; j++) {
        const array = j < 4 ? this.shapeA : this.shapeB, offset = i * (j < 4 ? 4 : 2) + (j < 4 ? j : j - 4);
        array[offset] += (this.target[j] / Math.max(norm, .001) - array[offset]) * ease;
      }
      const a = i * 4, b = i * 2, p = i * 3;
      const dust = this.shapeA[a], sparkle = this.shapeA[a + 1], ember = this.shapeA[a + 2], rain = this.shapeA[a + 3];
      const bokeh = this.shapeB[b], firefly = this.shapeB[b + 1];
      const drift = .008 + seed * .008, phase = this.time * .25 + seed * Math.PI * 2;
      const x = this.positions[p], y = this.positions[p + 1];
      const vx = (drift * .35 * (dust + bokeh) + sparkle * (drift * .3 - y * .008 * orbit) +
        ember * Math.sin(phase * .6) * .003 - rain * drift * .4 + firefly * Math.sin(phase) * drift * .4) / width;
      const vy = drift * .25 * (dust + bokeh) + sparkle * (drift * .2 + x * .008 * orbit) +
        ember * drift * 1.2 * (1 + bass * .08) - rain * drift * 2 + firefly * Math.cos(phase * .7) * drift * .3;
      this.velocities[b] += (vx - this.velocities[b]) * ease;
      this.velocities[b + 1] += (vy - this.velocities[b + 1]) * ease;
      let nextX = x + this.velocities[b] * travel, nextY = y + this.velocities[b + 1] * travel;
      // The shader is fully transparent beyond +/-1, before either coordinate recycles.
      if (nextX > 1.12) nextX -= 2.24; else if (nextX < -1.12) nextX += 2.24;
      if (nextY > 1.12) nextY -= 2.24; else if (nextY < -1.12) nextY += 2.24;
      this.positions[p] = nextX; this.positions[p + 1] = nextY;
    }
  }
}
