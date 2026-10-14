import { afterEach, expect, it, vi } from 'vitest';
import { setClock, SpotifyPlayer } from '../../vendor/spicy-host/player.mjs';
import { lyricPosition } from '../../src/lyrics/Lyrics';
import { defaults, parseConfig } from '../../src/core/Config';
afterEach(() => vi.unstubAllGlobals());
it('advances the renderer clock between wallpaper frames and compensates callback delay', () => {
  let now = 1000; vi.stubGlobal('performance', { now: () => now });
  setClock(4000, true, 800, 20000); expect(SpotifyPlayer.GetPosition()).toBe(4200);
  now = 1800; expect(SpotifyPlayer.GetPosition()).toBe(5000);
  setClock(2000, false, now, 20000); now += 1000; expect(SpotifyPlayer.GetPosition()).toBe(2000);
  setClock(19000, true, now, 20000); now += 5000; expect(SpotifyPlayer.GetPosition()).toBe(20000);
  setClock(1000, true, now, 20000); expect(SpotifyPlayer.GetPosition()).toBe(1000);
  setClock(1000, true, now, 20000, 2); now += 500; expect(SpotifyPlayer.GetPosition()).toBe(2000);
});
it('applies a bounded timing adjustment to playback without rewriting provider timestamps', () => {
  const playback = { title: 'Song', artist: 'Artist', trackId: '', position: 4, duration: 20, isPlaying: true, player: 'VLC', rate: 2 };
  expect(lyricPosition(playback, 1000, 2000, 1.5)).toBe(7.5);
  expect(lyricPosition(playback, 1000, 2000, -2)).toBe(4);
  expect(lyricPosition(playback, 1000, 2000, -30)).toBe(0);
  expect(lyricPosition(playback, 1000, 2000, 30)).toBe(20);
  expect(defaults.lyricOffset).toBe(0); expect(parseConfig({ lyricOffset: 90 }).lyricOffset).toBe(30);
});
