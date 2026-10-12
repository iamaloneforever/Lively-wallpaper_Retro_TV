import { describe, expect, it } from 'vitest';
import { artworkDataUrl, parseMetadata } from '../../src/music/MetadataNormalizer';
import { MusicStore } from '../../src/music/MusicStore';
describe('Windows media metadata', () => {
  it('reads all supported optional fields', () => {
    expect(parseMetadata(JSON.stringify({ Title: 'Song', Artist: 'Artist', AlbumArtist: 'Album artist', AlbumTitle: 'Album', TrackNumber: 3, Genres: ['Soul'], Subtitle: 'Live', PlaybackType: 'Music' }))).toMatchObject({ title: 'Song', artist: 'Artist', albumArtist: 'Album artist', album: 'Album', trackNumber: 3, genres: ['Soul'], subtitle: 'Live', playbackType: 'Music' });
  });
  it('accepts missing metadata and explicit standby', () => {
    expect(parseMetadata('{}')).toMatchObject({ title: '', artist: '', thumbnail: null, trackNumber: null, genres: [] });
    expect(parseMetadata('null')).toBeNull();
  });
  it('ignores malformed and nonobject payloads', () => {
    for (const payload of ['{', '[]', '1', '"song"']) expect(parseMetadata(payload)).toBeUndefined();
  });
  it('does not trust invalid field types', () => {
    expect(parseMetadata('{"Title":{},"TrackNumber":-2,"Genres":[1,"Soul"]}')).toMatchObject({ title: '', trackNumber: null, genres: ['Soul'] });
  });
  it('detects actual raster MIME signatures instead of trusting supplied type', () => {
    const png = btoa('\x89PNG\r\n\x1a\n' + '0000000000000000');
    expect(artworkDataUrl(png)).toBe(`data:image/png;base64,${png}`);
    expect(artworkDataUrl(`data:image/jpeg;base64,${png}`)).toBe(`data:image/png;base64,${png}`);
    const webp = btoa('RIFF0000WEBP000000000000'); expect(artworkDataUrl(webp)).toBe(`data:image/webp;base64,${webp}`);
    for (const [header, mime] of [['\xff\xd8\xff000000000000000000000', 'jpeg'], ['GIF89a000000000000000000', 'gif'], ['BM0000000000000000000000', 'bmp']]) expect(artworkDataUrl(btoa(header))).toContain(`image/${mime};base64,`);
  });
  it('rejects external URLs, SVG, malformed or oversized artwork', () => {
    for (const value of ['https://evil.test/a.png', 'data:image/svg+xml;base64,PHN2Zz4=', btoa('<svg></svg>'), '???', 'a'.repeat(12_000_001)]) expect(artworkDataUrl(value)).toBeNull();
  });
  it('distinguishes track changes from later thumbnail updates', () => {
    const store = new MusicStore(); const changes: boolean[] = [];
    const off = store.subscribe((_, changed) => changes.push(changed));
    const a = parseMetadata('{"Title":"First","Artist":"One","AlbumTitle":"Album"}')!;
    store.update(a); store.update({ ...a, thumbnail: 'updated' }); store.update({ ...a, title: 'Second' }); store.update(null);
    expect(changes).toEqual([true, false, true, true]); off(); store.update(a); expect(changes).toHaveLength(4);
  });
});
