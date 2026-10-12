export interface LyricWord { text: string; start: number; end: number }
export interface LyricLine { text: string; start: number; end: number; words: LyricWord[] }
export interface Lyrics { lines: LyricLine[]; timed: boolean; source: string; credits: { name: string; url: string }[] }
const record = (v: unknown): Record<string, unknown> => v && typeof v === 'object' ? v as Record<string, unknown> : {};
const number = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : NaN;
export function parseLyrics(payload: unknown): Lyrics | null {
  const body = record(record(payload).Body);
  const timed = body.Type === 'Line' || body.Type === 'Syllable';
  const items = timed ? body.Content : body.Type === 'Static' ? body.Lines : null;
  if (!Array.isArray(items) || items.length > 2000) return null;
  const lines: LyricLine[] = [];
  for (const item of items) {
    const row = record(item), lead = record(row.Lead);
    if (timed && row.Type !== 'Vocal') continue;
    const words: LyricWord[] = [];
    let text = typeof row.Text === 'string' ? row.Text : '';
    if (body.Type === 'Syllable' && Array.isArray(lead.Syllables)) {
      text = '';
      for (const raw of lead.Syllables.slice(0, 500)) {
        const syllable = record(raw), start = number(syllable.StartTime), end = number(syllable.EndTime);
        if (typeof syllable.Text !== 'string' || !Number.isFinite(start) || !(end > start)) continue;
        const part = syllable.Text.slice(0, 500) + (syllable.IsPartOfWord === true ? '' : ' ');
        words.push({ text: part, start, end }); text += part;
      }
    }
    const start = timed ? number(body.Type === 'Syllable' ? lead.StartTime : row.StartTime) : lines.length;
    const end = timed ? number(body.Type === 'Syllable' ? lead.EndTime : row.EndTime) : lines.length + 1;
    if (text.trim() && text.length <= 4000 && Number.isFinite(start) && end > start) lines.push({ text: text.trim(), start, end, words });
  }
  const credits: Lyrics['credits'] = [];
  if (body.source === 'spicy_lyrics') {
    const attribution = record(body.UploadAttribution);
    for (const role of ['Uploader', 'Maker']) {
      const person = record(attribution[role]);
      if (typeof person.username !== 'string' || typeof person.url !== 'string') continue;
      try { const url = new URL(person.url); if (url.protocol === 'https:' && url.hostname === 'spicylyrics.org') credits.push({ name: `${role}: ${person.username.slice(0, 100)}`, url: url.href }); } catch { /* Reject unsafe credits. */ }
    }
  }
  return lines.length ? { lines: lines.sort((a, b) => a.start - b.start), timed, source: typeof body.source === 'string' ? body.source : 'unknown', credits } : null;
}
export function activeLine(lines: LyricLine[], position: number): number {
  // Keep the previous phrase during an instrumental gap; never jump ahead of playback.
  let index = -1;
  for (let i = 0; i < lines.length && lines[i].start <= position; i++) index = i;
  return index;
}
export interface Playback { title: string; artist: string; trackId: string; position: number; duration: number; isPlaying: boolean; player: string; rate: number }
export function parsePlayback(raw: unknown): Playback | null {
  const v = record(raw);
  if (typeof v.title !== 'string' || typeof v.artist !== 'string' || typeof v.trackId !== 'string' || !/^[a-zA-Z0-9]{22}$/.test(v.trackId) || !Number.isFinite(number(v.position)) || !(number(v.duration) > 0)) return null;
  return { title: v.title, artist: v.artist, trackId: v.trackId, position: Math.min(number(v.position), number(v.duration)), duration: number(v.duration), isPlaying: v.isPlaying === true, player: typeof v.player === 'string' ? v.player : 'Windows media', rate: typeof v.rate === 'number' && v.rate > 0 && v.rate <= 4 ? v.rate : 1 };
}
export function playbackPosition(snapshot: Playback, capturedAt: number, now: number): number {
  return Math.min(snapshot.duration, snapshot.position + (snapshot.isPlaying ? Math.max(0, now - capturedAt) / 1000 * snapshot.rate : 0));
}
