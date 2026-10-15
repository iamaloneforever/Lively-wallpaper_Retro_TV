/** Retarget the currently visible mixture, including during rapid track changes. No scene allocations. */
export class ThemeTransition {
  readonly weights: Float32Array;
  private start: Float32Array;
  private target: number;
  private progress = 1;
  constructor(count: number, initial = 0) {
    this.weights = new Float32Array(count); this.weights[initial] = 1;
    this.start = this.weights.slice(); this.target = initial;
  }
  select(index: number): void {
    if (index === this.target || index < 0 || index >= this.weights.length) return;
    this.start.set(this.weights); this.target = index; this.progress = 0;
  }
  tick(dt: number, duration: number, immediate = false): void {
    this.progress = immediate ? 1 : Math.min(1, this.progress + Math.max(0, dt) / Math.max(0.1, duration));
    const t = this.progress * this.progress * (3 - 2 * this.progress);
    for (let i = 0; i < this.weights.length; i++) this.weights[i] = this.start[i] * (1 - t) + (i === this.target ? t : 0);
  }
}
