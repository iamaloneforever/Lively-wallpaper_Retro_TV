let position = 0, playing = false;
export function setClock(ms, isPlaying) { position = ms; playing = isPlaying; }
// This is a compatibility name used by upstream imports, not a Spotify service.
export const SpotifyPlayer = { GetPosition: () => position, get IsPlaying() { return playing; }, Seek() {} };
