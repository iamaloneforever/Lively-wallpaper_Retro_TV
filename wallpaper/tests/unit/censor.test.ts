import { expect, it } from 'vitest';
import { censorText } from '../../src/lyrics/Censor';
import { rendererData } from '../../src/lyrics/SpicyData';
import { parseLyrics, type Lyrics } from '../../src/lyrics/Lyrics';

it('masks full explicit words and inflections while preserving punctuation and innocent substrings', () => {
  expect(censorText('FUCK, fucking bullshit!')).toBe('****, ******* ********!');
  expect(censorText("Classical bass, Scunthorpe and an assignment.")).toBe('Classical bass, Scunthorpe and an assignment.');
  expect(censorText('niggas and faggots')).toBe('****** and *******');
  expect(censorText('bitches and assholes')).toBe('******* and ********');
});
it('masks split syllables and background vocals without changing timing or original provider data', () => {
  const syllables = [{ Text: 'fuck', IsPartOfWord: true, StartTime: 0, EndTime: 1 }, { Text: 'ing', StartTime: 1, EndTime: 2 }];
  const lyrics = parseLyrics({ Body: { Type: 'Syllable', source: 'spicy_lyrics', Content: [{ Type: 'Vocal', Lead: { StartTime: 0, EndTime: 2, Syllables: syllables }, Background: [{ StartTime: 0, EndTime: 2, Syllables: [{ Text: 'shit', StartTime: 0, EndTime: 2 }] }] }] } })!;
  const original = structuredClone(lyrics);
  const masked = rendererData(lyrics, true) as { Content: { Lead: { Syllables: typeof syllables }; Background: { Syllables: { Text: string }[] }[] }[] };
  expect(masked.Content[0].Lead.Syllables.map(part => part.Text)).toEqual(['****', '***']);
  expect(masked.Content[0].Lead.Syllables[1].StartTime).toBe(1);
  expect(masked.Content[0].Lead.Syllables[1].EndTime).toBe(2);
  expect(masked.Content[0].Background[0].Syllables[0].Text).toBe('****');
  expect(lyrics).toEqual(original);
  expect((rendererData(lyrics, false) as typeof masked).Content[0].Lead.Syllables[0].Text).toBe('fuck');
});
it.each([true, false])('masks fallback lyrics with timed=%s without mutating cached text', timed => {
  const lyrics: Lyrics = { lines: [{ text: 'shit happens', start: 0, end: 5, words: [] }], timed, source: 'lrclib', credits: [] };
  const masked = rendererData(lyrics, true) as { Content?: { Text: string }[]; Lines?: { Text: string }[] };
  expect((masked.Content || masked.Lines)![0].Text).toBe('**** happens');
  expect(lyrics.lines[0].text).toBe('shit happens');
});
