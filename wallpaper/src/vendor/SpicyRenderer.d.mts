export function mount(element: HTMLElement): void;
export function clear(): void;
export function apply(data: unknown): void;
export function clock(positionSeconds: number, playing: boolean, enabled: boolean, sampledAt?: number, durationSeconds?: number, rate?: number): void;
export function appearance(config: import('../core/Config').Config, reduced: boolean): void;
