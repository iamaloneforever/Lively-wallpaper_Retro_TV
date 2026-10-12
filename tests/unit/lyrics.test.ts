import { describe, expect, it } from 'vitest';
import { activeLine, parseLyrics, parsePlayback, playbackPosition } from '../../src/lyrics/Lyrics';
const body = (value: object) => ({ Body: { id: 'a'.repeat(22), source: 'spotify', ...value } });
describe('Spicy lyric timings', () => {
  it('joins syllables without breaking words and keeps timestamps in seconds', () => {
    const result = parseLyrics(body({ Type: 'Syllable', Content: [{ Type: 'Vocal', Lead: { StartTime: 4, EndTime: 8, Syllables: [{ Text: 'Moon', StartTime: 4, EndTime: 5, IsPartOfWord: true }, { Text: 'light', StartTime: 5, EndTime: 6 }, { Text: 'echo', StartTime: 6, EndTime: 8 }] } }] }))!;
    expect(result.lines[0].text).toBe('Moonlight echo'); expect(result.lines[0].words).toHaveLength(3);
    expect(activeLine(result.lines, 3.9)).toBe(-1); expect(activeLine(result.lines, 4)).toBe(0);
  });
  it('sorts line timings, keeps phrases in gaps and follows backward seeks', () => {
    const result = parseLyrics(body({ Type: 'Line', Content: [{ Type: 'Vocal', Text: 'Second', StartTime: 10, EndTime: 12 }, { Type: 'Vocal', Text: 'First', StartTime: 2, EndTime: 5 }] }))!;
    expect(activeLine(result.lines, 8)).toBe(0); expect(activeLine(result.lines, 11)).toBe(1); expect(activeLine(result.lines, 3)).toBe(0);
  });
  it('does not invent timings for static lyrics or accept malformed responses', () => {
    expect(parseLyrics(body({ Type: 'Static', Lines: [{ Text: 'Untimed phrase' }] }))?.timed).toBe(false);
    expect(parseLyrics({ Body: { Type: 'Line', Content: [{ Type: 'Vocal', Text: 'Invalid', StartTime: -1, EndTime: 2 }] } })).toBeNull();
    expect(parseLyrics({ Body: { error: 'lyrics_not_found' } })).toBeNull();
  });
  it('credits community contributors while rejecting unsafe credit links', () => {
    const result = parseLyrics(body({ source: 'spicy_lyrics', Type: 'Static', Lines: [{ Text: 'Test' }], UploadAttribution: { Uploader: { username: 'Artist', url: 'https://spicylyrics.org/uid/123' }, Maker: { username: 'Unsafe', url: 'javascript:alert(1)' } } }))!;
    expect(result.credits).toEqual([{ name: 'Uploader: Artist', url: 'https://spicylyrics.org/uid/123' }]);
  });
  it('anchors playback to actual snapshots, honors pause/rate, and clamps to duration', () => {
    const snapshot = parsePlayback({ title: 'Test', artist: 'Artist', trackId: 'a'.repeat(22), position: 4, duration: 20, isPlaying: true, rate: 2 })!;
    expect(playbackPosition(snapshot, 1000, 3000)).toBe(8);
    expect(playbackPosition({ ...snapshot, isPlaying: false }, 1000, 3000)).toBe(4);
    expect(playbackPosition(snapshot, 1000, 30000)).toBe(20);
    expect(parsePlayback({ ...snapshot, trackId: '', position: NaN })).toBeNull();
  });
});
