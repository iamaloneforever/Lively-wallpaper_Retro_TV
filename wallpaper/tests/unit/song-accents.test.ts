import { expect, it } from 'vitest';
import { matchSongAccent, songAccents } from '../../src/background/SongAccents';
import type { Track } from '../../src/lively/types';
const track: Track = { title: '', artist: '', albumArtist: '', album: '', thumbnail: null, trackNumber: null, genres: [], subtitle: '', playbackType: '' };
it.each(songAccents)('matches $id only for the corresponding artist and title', rule => {
  expect(matchSongAccent({ ...track, title: rule.titles[0], artist: rule.artist })?.id).toBe(rule.id);
  expect(matchSongAccent({ ...track, title: rule.titles[0], artist: 'A cover band' })).toBeNull();
  expect(matchSongAccent({ ...track, title: 'Another song', artist: rule.artist })).toBeNull();
});
it('handles punctuation, case, remasters and live versions', () => {
  expect(matchSongAccent({ ...track, title: 'TAKE ON ME (2015 Remaster)', artist: 'A‐Ha' })?.id).toBe('take-on-me');
  expect(matchSongAccent({ ...track, title: 'Space Oddity - 2015 Remastered', artist: 'David Bowie' })?.id).toBe('space-oddity');
  expect(matchSongAccent({ ...track, title: 'Take On Me (Live)', artist: 'a-ha' })?.id).toBe('take-on-me');
  expect(matchSongAccent(null)).toBeNull();
});
it('accepts explicit artist aliases and title variants without treating cover artists as matches', () => {
  for (const rule of songAccents) {
    const artists = [rule.artist, ...('artists' in rule ? rule.artists : [])];
    for (const artist of artists) for (const title of rule.titles) {
      expect(matchSongAccent({ ...track, title, artist })?.id).toBe(rule.id);
      expect(matchSongAccent({ ...track, title: `${title} (Live)`, artist })?.id).toBe(rule.id);
    }
  }
  expect(matchSongAccent({ ...track, title: 'Purple Rain', artist: 'A cover artist', albumArtist: 'Prince' })).toBeNull();
  expect(matchSongAccent({ ...track, title: 'snowfall', albumArtist: 'Øneheart & reidenshi' })?.id).toBe('snowfall');
  expect(matchSongAccent({ ...track, title: 'Time', artist: 'Hans Zimmer' })).toBeNull();
});
it.each([
  '(Live at Wembley, 1986)', '[Radio Edit]', '- Single Version', '- Album Version',
  '(Acoustic Version)', '- Unplugged', '- Extended Mix', '(Mono)',
  '(2015 Remaster)', '- Remastered 2020', '- Original Mix', '- Stereo Mix',
  '(Live) - 2011 Remaster', '(Live from London) [Remastered 2024]',
  '(Tiësto Remix)', '- Remix', '(Sped Up)', '- Slowed + Reverb',
  '(feat. Guest)', 'feat. Guest',
])('recognizes a familiar song with the version suffix %s', suffix => {
  expect(matchSongAccent({ ...track, title: `Never Gonna Give You Up ${suffix}`, artist: 'Rick Astley' })?.id).toBe('never-gonna-give-you-up');
});
it.each([
  'Rick Astley, Guest', 'Guest; Rick Astley', 'Rick Astley & Guest', 'Guest and Rick Astley',
  'Rick Astley feat. Guest', 'Rick Astley ft. Guest', 'Rick Astley featuring Guest',
  'Guest with Rick Astley', 'Rick Astley x Guest', 'Rick Astley / Guest',
])('recognizes complete artist credits in %s', artist => {
  expect(matchSongAccent({ ...track, title: 'Never Gonna Give You Up', artist })?.id).toBe('never-gonna-give-you-up');
});
it('supports collaboration-only credits and falls back only when the artist is empty', () => {
  expect(matchSongAccent({ ...track, title: 'snowfall', artist: 'reidenshi' })?.id).toBe('snowfall');
  expect(matchSongAccent({ ...track, title: 'snowfall', artist: 'Oneheart' })?.id).toBe('snowfall');
  expect(matchSongAccent({ ...track, title: 'Time (Live)', artist: '  ', albumArtist: 'Pink Floyd' })?.id).toBe('time');
  expect(matchSongAccent({ ...track, title: 'Thunderstruck - Radio Edit', artist: 'AC/DC' })?.id).toBe('thunderstruck');
});
it('keeps meaningful subtitles and rejects partial names and cover credits', () => {
  for (const title of ['Time After Time', 'Time (The Musical)', 'Time - A Different Song', 'Time Machine']) {
    expect(matchSongAccent({ ...track, title, artist: 'Pink Floyd' })).toBeNull();
  }
  for (const artist of ['Rick Astley Tribute', 'Not Rick Astley', 'Rick Astleyish', 'A cover band']) {
    expect(matchSongAccent({ ...track, title: 'Never Gonna Give You Up (Live)', artist, albumArtist: 'Rick Astley' })).toBeNull();
  }
});
