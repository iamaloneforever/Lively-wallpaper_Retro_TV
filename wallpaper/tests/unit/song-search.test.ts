import { afterEach, expect, it, vi } from 'vitest';
import { parseCandidate, searchSongs } from '../../src/music/SongSearch';
import { lookupSelectedLyrics } from '../../src/lyrics/PublicLyrics';
const playback = { title: 'Fly Me to the Moon 2008 version', artist: 'Artist', position: 1, duration: 120, isPlaying: false, player: 'VLC', trackId: '', rate: 1, trackKey: 'a'.repeat(64) };
const candidate = { title: 'Fly Me to the Moon', artist: 'Artist', album: 'Original', duration: 120, provider: 'Experimental Spotify', spotifyId: 'b'.repeat(22), mbid: '' };
afterEach(() => vi.unstubAllGlobals());
it('only accepts candidates with real provider identities', () => {
  expect(parseCandidate(candidate)).toEqual(candidate);
  expect(parseCandidate({ ...candidate, spotifyId: 'invalid' })).toBeNull();
  expect(parseCandidate({ ...candidate, spotifyId: '', lrcId: 42 })?.lrcId).toBe(42);
  expect(parseCandidate({ ...candidate, duration: Infinity })?.duration).toBe(0);
});
it('corrects the lyric identity without mutating native playback', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ Body: { Type: 'Static', Lines: [{ Text: 'Selected lyric' }] } })));
  vi.stubGlobal('fetch', fetcher);
  const result = await lookupSelectedLyrics(playback, candidate, 'sl_pk_test', new AbortController().signal, false);
  expect(fetcher.mock.calls[0][0]).toBe(`https://api.spicylyrics.org/v1/lyrics/${candidate.spotifyId}`);
  expect(result.lyrics?.lines[0].text).toBe('Selected lyric'); expect(playback.title).toContain('2008 version');
});
it('loads the exact selected LRCLIB recording and rejects a different ID', async () => {
  const selected = { ...candidate, spotifyId: '', provider: 'LRCLIB', lrcId: 42 };
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ id: 43, trackName: candidate.title, artistName: candidate.artist, duration: 120, plainLyrics: 'Wrong ID' })));
  vi.stubGlobal('fetch', fetcher);
  const result = await lookupSelectedLyrics(playback, selected, '', new AbortController().signal, true);
  expect(fetcher.mock.calls[0][0]).toBe('https://lrclib.net/api/get/42'); expect(result.lyrics).toBeNull();
});
it('search sends the edited title with pairing and honours LRCLIB permission', async () => {
  vi.stubGlobal('location', { hash: `#bridge=${'c'.repeat(64)}` });
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ trackKey: playback.trackKey, candidates: [candidate], queries: ['Experimental Spotify: Fly Me to the Moon — Artist'] })));
  vi.stubGlobal('fetch', fetcher);
  const result = await searchSongs(candidate.title, candidate.artist, playback, false, new AbortController().signal);
  const url = new URL(fetcher.mock.calls[0][0]);
  expect(url.searchParams.get('title')).toBe(candidate.title); expect(url.searchParams.get('trackKey')).toBe(playback.trackKey);
  expect(fetcher.mock.calls[0][1].headers['X-RetroWave-Key']).toBe('c'.repeat(64));
  expect(fetcher).toHaveBeenCalledTimes(1); expect(result.candidates).toEqual([candidate]);
});
it('unpaired search with LRCLIB off sends no requests', async () => {
  vi.stubGlobal('location', { hash: '' }); const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  const result = await searchSongs(candidate.title, '', playback, false, new AbortController().signal);
  expect(fetcher).not.toHaveBeenCalled(); expect(result.detail).toContain('Pair');
});
it('selected LRCLIB lyrics respect permission', async () => {
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  await lookupSelectedLyrics(playback, { ...candidate, lrcId: 42 }, '', new AbortController().signal, false);
  expect(fetcher).not.toHaveBeenCalled();
});
