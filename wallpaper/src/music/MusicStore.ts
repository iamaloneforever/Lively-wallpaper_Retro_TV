import type { Track } from '../lively/types';
export class MusicStore {
  track: Track | null = null;
  private listeners = new Set<(track: Track | null, changed: boolean) => void>();
  update(track: Track | null): void {
    const old = this.track;
    const changed = old?.title !== track?.title || old?.artist !== track?.artist || old?.album !== track?.album || old?.trackNumber !== track?.trackNumber;
    this.track = track;
    for (const listener of this.listeners) listener(track, changed);
  }
  subscribe(listener: (track: Track | null, changed: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
