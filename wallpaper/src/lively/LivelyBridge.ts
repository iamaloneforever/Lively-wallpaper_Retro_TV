import { parseMetadata } from '../music/MetadataNormalizer';
import type { MusicStore } from '../music/MusicStore';
import type { AudioEngine } from '../audio/AudioEngine';
export class LivelyBridge {
  mediaReceived = false; audioReceived = false; paused = false;
  onConnection: () => void = () => {};
  constructor(store: MusicStore, audio: AudioEngine) {
    window.livelyCurrentTrack = data => {
      const track = parseMetadata(data);
      if (track === undefined) return;
      this.mediaReceived = true; this.onConnection(); store.update(track);
    };
    window.livelyAudioListener = values => {
      if (!Array.isArray(values)) return;
      this.audioReceived = true; this.onConnection(); audio.update(values);
    };
    window.livelyWallpaperPlaybackChanged = data => {
      try { const v = JSON.parse(data) as { IsPaused?: unknown }; this.paused = v.IsPaused === true; } catch { /* Ignore malformed host messages. */ }
    };
  }
  dispose(): void {
    delete window.livelyCurrentTrack; delete window.livelyAudioListener; delete window.livelyWallpaperPlaybackChanged;
  }
}
