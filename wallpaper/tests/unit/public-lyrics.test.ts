import { describe, expect, it } from 'vitest';
import { parseLrclib } from '../../src/lyrics/PublicLyrics';
import { parsePlayback } from '../../src/lyrics/Lyrics';
const playback = parsePlayback({ title: 'Test song', artist: 'Test artist', trackId: '', duration: 90, position: 1 })!;
const base = { trackName: 'Test song', artistName: 'Test artist', duration: 90 };
describe('documented public lyrics', () => {
  it('accepts a reliable playback clock without a Spotify ID', () => {
    expect(playback.trackId).toBe('');
    expect(playback.duration).toBe(90);
  });
  it('parses repeated LRC timestamps and fractional seconds without inventing words', () => {
    const result = parseLrclib({ ...base, syncedLyrics: '[00:01.25][00:09.500]Repeated\n[00:05]Middle' }, playback)!;
    expect(result.lines.map(line => line.start)).toEqual([1.25, 5, 9.5]);
    expect(result.lines[0].end).toBe(5);
    expect(result.lines.every(line => line.words.length === 0)).toBe(true);
  });
  it('rejects a different recording, duration and instrumental', () => {
    for (const patch of [{ trackName: 'Test song live' }, { artistName: 'Other' }, { duration: 100 }, { instrumental: true }]) {
      expect(parseLrclib({ ...base, ...patch, syncedLyrics: '[00:01]Wrong' }, playback)).toBeNull();
    }
  });
  it('keeps plain lyrics untimed and rejects malformed timestamps', () => {
    expect(parseLrclib({ ...base, plainLyrics: 'Plain phrase' }, playback)?.timed).toBe(false);
    expect(parseLrclib({ ...base, syncedLyrics: '[00:99]Bad' }, playback)).toBeNull();
  });
});
