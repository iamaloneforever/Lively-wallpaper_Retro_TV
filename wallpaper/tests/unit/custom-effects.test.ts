import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { evaluateSignal, matchesEffect, maxEffectFileBytes, mergeEffects, parseEffectFile, starterEffect, type EffectAudio, type Signal } from '../../src/background/CustomEffects';
import type { Track } from '../../src/lively/types';

const track: Track = { title: 'My Song', artist: 'My Artist', albumArtist: '', album: 'Album', thumbnail: null, trackNumber: null, genres: [], subtitle: '', playbackType: '' };
const audio: EffectAudio = { bass: .8, mid: .4, treble: .2, amplitude: .3, onset: .5 };
const raw = () => ({ version: 1, effects: [{ id: 'test', name: 'Test', match: { titles: ['My Song'], artists: ['My Artist'] }, layers: [{ type: 'ring' }] }] });
const parse = (effect: Record<string, unknown>) => parseEffectFile(JSON.stringify({ version: 1, effects: [effect] }));

it('provides a starter bound to the current song, with a lossless export/import', () => {
  const file = starterEffect(track);
  expect(file.effects[0].layers).toHaveLength(3);
  expect(matchesEffect(file.effects[0], track)).toBe(true);
  expect(parseEffectFile(JSON.stringify(file))).toEqual(file);
  expect(starterEffect(null).effects[0].match.titles).toEqual(['Your song title']);
});
it('requires complete title and artist credits, supports aliases, albums, versions and Unicode', () => {
  const file = starterEffect(track), effect = file.effects[0];
  expect(matchesEffect(effect, { ...track, title: 'MY SONG (Live) - 2024 Remaster', artist: 'Guest; My Artist' })).toBe(true);
  expect(matchesEffect(effect, { ...track, artist: 'My Artist Tribute', albumArtist: 'My Artist' })).toBe(false);
  expect(matchesEffect(effect, { ...track, title: 'My Song Part Two' })).toBe(false);
  expect(matchesEffect(effect, { ...track, artist: '', albumArtist: 'My Artist' })).toBe(true);
  expect(matchesEffect(effect, null)).toBe(false);
  effect.match.versions = 'exact';
  expect(matchesEffect(effect, { ...track, title: 'My Song (Live)' })).toBe(false);
  effect.match.album = 'Other album';
  expect(matchesEffect(effect, track)).toBe(false);
  effect.match = { titles: ['夜に駆ける'], artists: ['YOASOBI'], versions: 'ignore' };
  expect(matchesEffect(effect, { ...track, title: '夜に駆ける', artist: 'YOASOBI' })).toBe(true);
  expect(matchesEffect(effect, { ...track, title: '別の曲', artist: 'YOASOBI' })).toBe(false);
  effect.enabled = false;
  expect(matchesEffect(effect, { ...track, title: '夜に駆ける', artist: 'YOASOBI' })).toBe(false);
});
it('rejects unsupported versions', () => {
  expect(() => parseEffectFile(JSON.stringify({ ...raw(), version: 2 }))).toThrow(/version/);
});
it.each([
  ['bad id', { id: '../evil' }, /id/],
  ['unknown field', { typo: 1 }, /unknown field/],
  ['empty artist', { match: { titles: ['Song'], artists: [] } }, /artists/],
  ['wildcard artist', { match: { titles: ['Song'], artists: ['*'] } }, /names/],
  ['empty layers', { layers: [] }, /layers/],
  ['both renderers', { shader: 'vec4 effect(vec2 uv){return vec4(1.);}' }, /either layers or shader/],
  ['no renderer', { layers: undefined }, /either layers or shader/],
  ['unknown shape', { layers: [{ type: 'unknown' }] }, /type/],
  ['unknown color', { layers: [{ type: 'ring', color: 'red' }] }, /color/],
  ['invalid coordinate', { layers: [{ type: 'ring', x: 999 }] }, /x/],
  ['zero scale', { layers: [{ type: 'ring', scaleX: 0 }] }, /scaleX/],
  ['fractional count', { layers: [{ type: 'particles', count: 1.5 }] }, /integer/],
  ['huge count', { layers: [{ type: 'particles', count: 5000 }] }, /count/],
  ['particle budget', { layers: Array.from({ length: 3 }, () => ({ type: 'particles', count: 256 })) }, /combined particle count/],
  ['layer budget', { layers: Array.from({ length: 17 }, () => ({ type: 'ring' })) }, /1–16/],
  ['unknown audio', { layers: [{ type: 'ring', size: { audio: 'low' } }] }, /audio/],
  ['zero period', { layers: [{ type: 'ring', size: { period: 0 } }] }, /period/],
  ['unordered frames', { layers: [{ type: 'ring', size: { keyframes: [[0, 1], [0, 2]] } }] }, /strictly increase/],
  ['nonzero first frame', { layers: [{ type: 'ring', size: { keyframes: [[1, 1], [2, 2]] } }] }, /start at 0/],
  ['missing audio', { layers: [{ type: 'ring', size: { amount: 1 } }] }, /needs audio/],
  ['missing period', { layers: [{ type: 'ring', size: { amplitude: 1 } }] }, /needs period/],
  ['missing frames', { layers: [{ type: 'ring', size: { loop: true } }] }, /needs keyframes/],
])('rejects %s with a field-specific error', (_name, patch, message) => {
  expect(() => parse({ ...raw().effects[0], ...patch })).toThrow(message);
});
it('rejects malformed, oversized, duplicate and non-finite input', () => {
  expect(() => parseEffectFile('{')).toThrow(/invalid JSON/);
  expect(() => parseEffectFile(' '.repeat(maxEffectFileBytes + 1))).toThrow(/512 KiB/);
  const overflow = JSON.stringify({ version: 1, effects: [{ ...raw().effects[0], duration: 1 }] }).replace('"duration":1', '"duration":1e999');
  expect(() => parseEffectFile(overflow)).toThrow(/duration/);
  expect(() => parseEffectFile(JSON.stringify({ version: 1, effects: [raw().effects[0], raw().effects[0]] }))).toThrow(/duplicate/);
  expect(() => parseEffectFile(JSON.stringify({ version: 1, effects: Array.from({ length: 65 }, () => raw().effects[0]) }))).toThrow(/64/);
});
it('interpolates and loops keyframes, holds the final value, and combines oscillation and audio', () => {
  const frames: Signal = { value: 0, keyframes: [[0, 0], [2, 10], [4, 20]] };
  expect(evaluateSignal(frames, 1, audio, -100, 100)).toBe(5);
  expect(evaluateSignal(frames, 10, audio, -100, 100)).toBe(20);
  expect(evaluateSignal({ ...frames, loop: true }, 5, audio, -100, 100)).toBe(5);
  expect(evaluateSignal({ value: 1, period: 4, amplitude: 2, audio: 'bass', amount: 5 }, 1, audio, 0, 100)).toBe(7);
  expect(evaluateSignal({ value: 1, audio: 'bass', amount: 100 }, 0, audio, 0, 1)).toBe(1);
  expect(evaluateSignal({ value: 1, audio: 'bass', amount: -100 }, 0, audio, 0, 1)).toBe(0);
});
it('merges by ID, retains unrelated effects, and gives the latest import precedence', () => {
  const first = parseEffectFile(JSON.stringify(raw()));
  const other = parse({ ...raw().effects[0], id: 'other' });
  const replacement = parse({ ...raw().effects[0], name: 'Replacement' });
  const merged = mergeEffects(mergeEffects(first, other), replacement);
  expect(merged.effects.map(effect => effect.id)).toEqual(['other', 'test']);
  expect(merged.effects[1].name).toBe('Replacement');
  expect(first.effects[0].name).toBe('Test');
});
it.each(['neon-orbit.json', 'aurora-shader.json'])('ships a valid, exportable %s example', name => {
  const file = parseEffectFile(readFileSync(`wallpaper/public/effects/${name}`, 'utf8'));
  expect(file.effects).toHaveLength(1);
  expect(parseEffectFile(JSON.stringify(file))).toEqual(file);
});
it('uses imported effects as atmosphere overlays unless replacement is explicitly requested', () => {
  expect(starterEffect(track).effects[0].replace).toBe(false);
  expect(parseEffectFile(JSON.stringify(raw())).effects[0].replace).toBe(false);
  expect(parse({ ...raw().effects[0], replace: true }).effects[0].replace).toBe(true);
});
