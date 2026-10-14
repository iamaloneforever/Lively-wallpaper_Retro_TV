let position = 0, playing = false, sampledAt = 0, duration = Infinity, rate = 1;
export function setClock(ms, isPlaying, sampleTime = performance.now(), durationMs = Infinity, playbackRate = 1) {
  position = Number.isFinite(ms) ? Math.max(0, ms) : 0;
  playing = isPlaying; sampledAt = sampleTime; duration = durationMs; rate = Number.isFinite(playbackRate) && playbackRate > 0 && playbackRate <= 4 ? playbackRate : 1;
}
// The renderer keeps time between wallpaper frames, including expensive WebGL frames.
export const SpotifyPlayer = {
  GetPosition: () => Math.min(duration, position + (playing ? Math.max(0, performance.now() - sampledAt) * rate : 0)),
  get IsPlaying() { return playing; }, Seek() {}
};
