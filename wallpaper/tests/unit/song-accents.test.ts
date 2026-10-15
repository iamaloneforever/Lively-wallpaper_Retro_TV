import { expect, it } from 'vitest';
import { matchSongAccent, songAccents } from '../../src/background/SongAccents';
import type { Track } from '../../src/lively/types';
const track: Track = { title: '', artist: '', albumArtist: '', album: '', thumbnail: null, trackNumber: null, genres: [], subtitle: '', playbackType: '' };
it.each(songAccents)('matches $id only for the corresponding artist and title', rule => {
  expect(matchSongAccent({ ...track, title: rule.titles[0], artist: rule.artist })?.id).toBe(rule.id);
  expect(matchSongAccent({ ...track, title: rule.titles[0], artist: 'A cover band' })).toBeNull();
  expect(matchSongAccent({ ...track, title: 'Another song', artist: rule.artist })).toBeNull();
});
it('handles punctuation, case, and remaster suffixes without matching live versions', () => {
  expect(matchSongAccent({ ...track, title: 'TAKE ON ME (2015 Remaster)', artist: 'A‐Ha' })?.id).toBe('take-on-me');
  expect(matchSongAccent({ ...track, title: 'Space Oddity - 2015 Remastered', artist: 'David Bowie' })?.id).toBe('space-oddity');
  expect(matchSongAccent({ ...track, title: 'Take On Me (Live)', artist: 'a-ha' })).toBeNull();
  expect(matchSongAccent(null)).toBeNull();
});
it('accepts explicit artist aliases and title variants without treating cover artists as matches', () => {
  for (const rule of songAccents) {
    const artists = [rule.artist, ...('artists' in rule ? rule.artists : [])];
    for (const artist of artists) for (const title of rule.titles) {
      expect(matchSongAccent({ ...track, title, artist })?.id).toBe(rule.id);
      expect(matchSongAccent({ ...track, title: `${title} (Live)`, artist })).toBeNull();
    }
  }
  expect(matchSongAccent({ ...track, title: 'Purple Rain', artist: 'A cover artist', albumArtist: 'Prince' })).toBeNull();
  expect(matchSongAccent({ ...track, title: 'snowfall', albumArtist: 'Øneheart & reidenshi' })?.id).toBe('snowfall');
  expect(matchSongAccent({ ...track, title: 'Time', artist: 'Hans Zimmer' })).toBeNull();
});
