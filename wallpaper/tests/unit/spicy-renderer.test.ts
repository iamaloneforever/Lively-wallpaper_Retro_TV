import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { rendererData } from '../../src/lyrics/SpicyData';
import { parseLyrics, type Lyrics } from '../../src/lyrics/Lyrics';

it('retains every complete upstream source file byte for byte', () => {
  const base = 'wallpaper/vendor/spicy-lyrics/';
  const manifest = JSON.parse(readFileSync(base + 'UPSTREAM.json', 'utf8'));
  expect(manifest.commit).toBe('0ecf3925aac0e9b76b9095ee23b6d5118d9a18cc');
  expect(manifest.files.length).toBe(36);
  for (const file of manifest.files) expect(createHash('sha256').update(readFileSync(base + file.path)).digest('hex')).toBe(file.sha256);
});
it('preserves original duet, background vocal and writer data through parsing', () => {
  const body = { Type: 'Syllable', SongWriters: ['Writer'], Content: [{ Type: 'Vocal', OppositeAligned: true,
    Lead: { StartTime: 0, EndTime: 4, Syllables: [{ Text: 'Lead', StartTime: 0, EndTime: 4 }] },
    Background: [{ StartTime: 1, EndTime: 3, Syllables: [{ Text: 'Backing', StartTime: 1, EndTime: 3 }] }],
  }] };
  const parsed = parseLyrics({ Body: body })!;
  expect(rendererData(parsed)).toMatchObject(body);
});
it('converts LRCLIB line timestamps without requiring a Spotify ID', () => {
  const lyric: Lyrics = { lines: [{ text: 'Local player line', start: 3, end: 8, words: [] }], timed: true, source: 'lrclib', credits: [] };
  expect(rendererData(lyric)).toEqual({ Type: 'Line', StartTime: 3, Content: [{ Type: 'Vocal', Text: 'Local player line', StartTime: 3, EndTime: 8 }], source: 'lrclib' });
});
it('preserves static text and does not create timing for it', () => {
  const lyric: Lyrics = { lines: [{ text: 'Plain lyrics', start: 0, end: 1, words: [] }], timed: false, source: 'lrclib', credits: [] };
  expect(rendererData(lyric)).toEqual({ Type: 'Static', Lines: [{ Text: 'Plain lyrics' }], source: 'lrclib' });
});
it('keeps malformed segment text unclocked and strips remote CSS without changing source data', () => {
  const body = { Type: 'Syllable', styles: { color: 'red' }, classes: 'foreign', Content: [{ Type: 'Vocal',
    Lead: { StartTime: 0, EndTime: 10, Syllables: [{ Text: 'unscheduled', StartTime: -1, EndTime: 4 }] },
  }] };
  const result = rendererData(parseLyrics({ Body: body })!) as typeof body;
  expect(result.Content[0].Lead.Syllables[0].StartTime).toBe(Infinity);
  expect(result.Content[0].Lead.Syllables[0].Text).toBe('unscheduled');
  expect(result.styles).toBeUndefined(); expect(body.Content[0].Lead.Syllables[0].StartTime).toBe(-1);
});
