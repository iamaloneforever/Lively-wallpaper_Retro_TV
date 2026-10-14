import { expect, it } from 'vitest';
import { nameSimilarity, rateSongs } from '../../src/music/SongRating';
import type { SongCandidate } from '../../src/music/SongSearch';
const song: SongCandidate = { title: 'Fly Me to the Moon', artist: 'Frank Sinatra', album: '', duration: 120, provider: 'Official Spotify', spotifyId: 'a'.repeat(22), mbid: '', sourcePopularity: 50 };
const rate = (rows: SongCandidate[], title = song.title, artist = song.artist, duration = song.duration) => rateSongs(rows, title, artist, duration);
it('ranks the matching title, singer and duration above a popular wrong recording', () => {
  const wrong = { ...song, title: 'Other song', artist: 'Other singer', duration: 240, sourcePopularity: 100 };
  const rated = rate([wrong, song]);
  expect(rated[0].candidate).toBe(song); expect(rated[0].rating.score).toBe(90);
  expect(nameSimilarity('FLY ME TO THE MOON!', song.title)).toBe(100);
  expect(rate([song], 'Other song')[0].rating.title).toBeLessThan(100);
  expect(rate([{ ...song, duration: 150 }])[0].rating.duration).toBe(0);
});
it('counts agreement across distinct sources without boosting repeated rows from one source', () => {
  const baseline = rate([song])[0].rating;
  expect(rate([song, { ...song }])[0].rating).toEqual(baseline);
  const agreed = rate([song, { ...song, provider: 'ListenBrainz' }, { ...song, spotifyId: '', provider: 'LRCLIB', lrcId: 42 }]);
  expect(agreed[0].rating.sources).toBe(3); expect(agreed[0].rating.repetition).toBe(100);
  expect(agreed[0].rating.score).toBeGreaterThan(baseline.score);
  expect(rate([song, { ...song, provider: 'ListenBrainz', spotifyId: 'b'.repeat(22) }])[0].rating.sources).toBe(1);
});
it('excludes missing metadata and keeps source preferences bounded', () => {
  const rated = rate([{ ...song, duration: 0, sourcePopularity: NaN }], song.title, '', 0)[0].rating;
  expect(rated.singer).toBeNull(); expect(rated.duration).toBeNull(); expect(rated.popularity).toBe(50);
  expect(rated.score).toBe(82);
  expect(rate([{ ...song, sourcePopularity: 1000 }])[0].rating.popularity).toBe(100);
  expect(rate([{ ...song, sourcePopularity: -20 }])[0].rating.popularity).toBe(0);
});
