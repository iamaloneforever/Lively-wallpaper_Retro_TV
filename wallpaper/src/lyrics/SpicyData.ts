import type { Lyrics } from './Lyrics';
export function rendererData(lyrics: Lyrics): unknown {
  if (lyrics.rendererData) {
    const data = structuredClone(lyrics.rendererData);
    // CSS/classes from a remote provider are not host configuration.
    delete data.styles; delete data.classes;
    data.source = lyrics.source === 'lrclib' ? 'lrclib' : 'spl';
    if (data.Type === 'Syllable' && Array.isArray(data.Content)) {
      for (const line of data.Content) {
        for (const vocal of [line.Lead, ...(Array.isArray(line.Background) ? line.Background : [])]) {
          if (!Array.isArray(vocal?.Syllables)) continue;
          for (const part of vocal.Syllables) {
            if (!(Number.isFinite(part.StartTime) && part.StartTime >= 0 && Number.isFinite(part.EndTime) && part.EndTime > part.StartTime)) {
              // Preserve untimed text without inventing a clock for it.
              part.StartTime = Infinity; part.EndTime = Infinity;
            }
          }
        }
      }
    }
    return data;
  }
  if (!lyrics.timed) return { Type: 'Static', Lines: lyrics.lines.map(line => ({ Text: line.text })), source: 'lrclib' };
  return { Type: 'Line', StartTime: lyrics.lines[0]?.start || 0, Content: lyrics.lines.map(line => ({ Type: 'Vocal', Text: line.text, StartTime: line.start, EndTime: line.end })), source: 'lrclib' };
}
