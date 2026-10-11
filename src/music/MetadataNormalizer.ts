import type { Track } from '../lively/types';
const string = (v: unknown): string => typeof v === 'string' ? v.slice(0, 4096).trim() : '';

/** Only raster formats with a recognized signature are permitted. SVG and URLs are rejected. */
export function artworkDataUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 12_000_000) return null;
  const raw = value.startsWith('data:') ? value.match(/^data:image\/(?:png|jpeg|gif|webp|bmp);base64,([\s\S]+)$/i)?.[1] : value;
  if (!raw) return null;
  const base64 = raw.replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0) return null;
  try {
    const b = atob(base64.slice(0, 32));
    const mime = b.startsWith('\x89PNG\r\n\x1a\n') ? 'image/png'
      : b.startsWith('\xff\xd8\xff') ? 'image/jpeg'
      : b.startsWith('GIF87a') || b.startsWith('GIF89a') ? 'image/gif'
      : b.startsWith('RIFF') && b.slice(8, 12) === 'WEBP' ? 'image/webp'
      : b.startsWith('BM') ? 'image/bmp' : null;
    return mime ? `data:${mime};base64,${base64}` : null;
  } catch { return null; }
}
export function parseMetadata(payload: string): Track | null | undefined {
  try {
    const v: unknown = JSON.parse(payload);
    if (v === null) return null;
    if (typeof v !== 'object' || Array.isArray(v)) return undefined;
    const x = v as Record<string, unknown>;
    return {
      title: string(x.Title), artist: string(x.Artist), album: string(x.AlbumTitle),
      albumArtist: string(x.AlbumArtist), thumbnail: artworkDataUrl(x.Thumbnail),
      trackNumber: typeof x.TrackNumber === 'number' && Number.isFinite(x.TrackNumber) && x.TrackNumber > 0 ? Math.floor(x.TrackNumber) : null,
      genres: Array.isArray(x.Genres) ? x.Genres.filter((g): g is string => typeof g === 'string').slice(0, 30) : [],
      subtitle: string(x.Subtitle), playbackType: string(x.PlaybackType),
    };
  } catch { return undefined; }
}
