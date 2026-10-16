import type { Track } from '../lively/types';
import { songArtist, songArtists, songTitle } from './SongAccents';

export const effectStorageKey = 'retrowave-custom-effects-v1';
export const maxEffectFileBytes = 512 * 1024;
export const shapes = ['circle', 'ring', 'star', 'waves', 'grid', 'particles', 'polygon'] as const;
export const bands = ['bass', 'mid', 'treble', 'amplitude', 'onset'] as const;
export type AudioBand = typeof bands[number];
export type EffectAudio = Record<AudioBand, number>;
export type Signal = number | {
  value: number; audio?: AudioBand; amount?: number;
  period?: number; amplitude?: number; phase?: number;
  keyframes?: [number, number][]; loop?: boolean;
};
// Defaults and final clamps apply to static, animated and reactive values alike.
export const layerParameters = {
  x: [.5, -2, 3], y: [.5, -2, 3], scaleX: [1, .01, 10], scaleY: [1, .01, 10],
  rotation: [0, -36000, 36000], size: [.2, .001, 4], thickness: [.008, .001, 1],
  softness: [.01, .001, 1], opacity: [.6, 0, 1], speed: [.1, -10, 10],
} as const;
export type LayerParameter = keyof typeof layerParameters;
export type EffectLayer = Record<LayerParameter, Signal> & {
  type: typeof shapes[number]; color: string; blend: 'normal' | 'add' | 'screen'; count: number;
};
export interface CustomEffect {
  id: string; name: string; enabled: boolean;
  match: { titles: string[]; artists: string[]; album?: string; versions: 'ignore' | 'exact' };
  replace: boolean; duration: number; layers?: EffectLayer[]; shader?: string;
}
export interface EffectFile { version: 1; effects: CustomEffect[] }
export interface CustomEffectSettings { overlay?: boolean; enabled: boolean; file: EffectFile }
export function parseCustomEffectSettings(value: unknown): CustomEffectSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid custom effect settings');
  const row = value as Record<string, unknown>;
  if (typeof row.enabled !== 'boolean') throw new Error('Invalid custom effects toggle');
  if (row.overlay !== undefined && typeof row.overlay !== 'boolean') throw new Error('Invalid overlay toggle');
  return { ...(row.overlay !== undefined ? { overlay: row.overlay as boolean } : {}), enabled: row.enabled, file: parseEffectFile(JSON.stringify(row.file)) };
}
const fail = (path: string, message: string): never => { throw new Error(`${path}: ${message}`); };
function object(value: unknown, path: string, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail(path, 'expected an object');
  const row = value as Record<string, unknown>;
  for (const key of Object.keys(row)) if (!keys.includes(key)) fail(`${path}.${key}`, 'unknown field');
  return row;
}
function number(value: unknown, path: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) return fail(path, `expected a finite number from ${min} to ${max}`);
  return value;
}
function string(value: unknown, path: string, max = 256): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) return fail(path, `expected nonempty text up to ${max} characters`);
  return value.trim();
}
function boolean(value: unknown, path: string, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') return fail(path, 'expected true or false');
  return value;
}
function choice<T extends string>(value: unknown, path: string, choices: readonly T[], fallback?: T): T {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== 'string' || !choices.includes(value as T)) return fail(path, `choose ${choices.join(', ')}`);
  return value as T;
}
function names(value: unknown, path: string): string[] {
  if (!Array.isArray(value) || !value.length || value.length > 32) return fail(path, 'expected 1–32 names');
  return value.map((entry, index) => string(entry, `${path}[${index}]`));
}
function signal(value: unknown, path: string, min: number, max: number, fallback: number): Signal {
  if (typeof value === 'number') return number(value, path, min, max);
  const row = object(value, path, ['value', 'audio', 'amount', 'period', 'amplitude', 'phase', 'keyframes', 'loop']);
  const result: Exclude<Signal, number> = { value: number(row.value ?? fallback, `${path}.value`, min, max) };
  if (row.audio !== undefined) result.audio = choice(row.audio, `${path}.audio`, bands);
  if (row.amount !== undefined) result.amount = number(row.amount, `${path}.amount`, -36000, 36000);
  if (row.period !== undefined) result.period = number(row.period, `${path}.period`, .1, 86400);
  if (row.amplitude !== undefined) result.amplitude = number(row.amplitude, `${path}.amplitude`, -36000, 36000);
  if (row.phase !== undefined) result.phase = number(row.phase, `${path}.phase`, -36000, 36000);
  if ((row.amplitude !== undefined || row.phase !== undefined) && !result.period) fail(path, 'oscillation needs period');
  if (row.amount !== undefined && !result.audio) fail(path, 'amount needs audio');
  if (row.keyframes !== undefined) {
    if (!Array.isArray(row.keyframes) || row.keyframes.length < 2 || row.keyframes.length > 128) fail(`${path}.keyframes`, 'expected 2–128 [seconds, value] pairs');
    let previous = -1;
    result.keyframes = (row.keyframes as unknown[]).map((frame, index) => {
      const p = `${path}.keyframes[${index}]`;
      if (!Array.isArray(frame) || frame.length !== 2) return fail(p, 'expected [seconds, value]');
      const time = number(frame[0], p, 0, 86400);
      if (time <= previous || index === 0 && time !== 0) fail(p, 'times must start at 0 and strictly increase');
      previous = time;
      return [time, number(frame[1], p, min, max)];
    });
  }
  if (row.loop !== undefined && !result.keyframes) fail(path, 'loop needs keyframes');
  if (result.keyframes) result.loop = boolean(row.loop, `${path}.loop`, false);
  return result;
}
function layer(value: unknown, path: string): EffectLayer {
  const row = object(value, path, ['type', 'color', 'blend', 'count', ...Object.keys(layerParameters)]);
  const color = row.color === undefined ? 'accent' : string(row.color, `${path}.color`);
  if (!['primary', 'accent', 'third'].includes(color) && !/^#[0-9a-f]{6}$/i.test(color)) fail(`${path}.color`, 'use primary, accent, third or #RRGGBB');
  const count = number(row.count ?? 32, `${path}.count`, 1, 256);
  if (!Number.isInteger(count)) fail(`${path}.count`, 'expected an integer');
  const result = { type: choice(row.type, `${path}.type`, shapes), color, blend: choice(row.blend, `${path}.blend`, ['normal', 'add', 'screen'], 'add'), count } as EffectLayer;
  for (const key of Object.keys(layerParameters) as LayerParameter[]) {
    const [fallback, min, max] = layerParameters[key];
    result[key] = row[key] === undefined ? fallback : signal(row[key], `${path}.${key}`, min, max, fallback);
  }
  return result;
}
export function parseEffectFile(text: string): EffectFile {
  if (new TextEncoder().encode(text).length > maxEffectFileBytes) fail('file', 'maximum size is 512 KiB');
  let value: unknown;
  try { value = JSON.parse(text); } catch (error) { return fail('file', `invalid JSON (${(error as Error).message})`); }
  const file = object(value, 'file', ['version', 'effects', '$schema']);
  if (file.version !== 1) fail('file.version', 'expected 1');
  if (!Array.isArray(file.effects) || file.effects.length > 64) fail('file.effects', 'expected an array of up to 64 effects');
  const ids = new Set<string>();
  const effects = (file.effects as unknown[]).map((entry, index): CustomEffect => {
    const path = `effects[${index}]`, row = object(entry, path, ['id', 'name', 'enabled', 'match', 'replace', 'duration', 'layers', 'shader']);
    const id = string(row.id, `${path}.id`, 64);
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) fail(`${path}.id`, 'use lowercase letters, digits, - or _');
    if (ids.has(id)) fail(`${path}.id`, `duplicate id ${id}`);
    ids.add(id);
    const match = object(row.match, `${path}.match`, ['titles', 'artists', 'album', 'versions']);
    const result: CustomEffect = {
      id, name: string(row.name, `${path}.name`), enabled: boolean(row.enabled, `${path}.enabled`, true),
      match: { titles: names(match.titles, `${path}.match.titles`), artists: names(match.artists, `${path}.match.artists`), versions: choice(match.versions, `${path}.match.versions`, ['ignore', 'exact'], 'ignore') },
      replace: boolean(row.replace, `${path}.replace`, false), duration: number(row.duration ?? 12, `${path}.duration`, .1, 86400),
    };
    if (result.match.titles.some(name => !songArtist(name)) || result.match.artists.some(name => !songArtist(name))) fail(`${path}.match`, 'names must contain letters or digits');
    if (match.album !== undefined) result.match.album = string(match.album, `${path}.match.album`);
    if ((row.layers === undefined) === (row.shader === undefined)) fail(path, 'provide either layers or shader');
    if (row.shader !== undefined) result.shader = string(row.shader, `${path}.shader`, 32768);
    else {
      if (!Array.isArray(row.layers) || !row.layers.length || row.layers.length > 16) fail(`${path}.layers`, 'expected 1–16 layers');
      result.layers = (row.layers as unknown[]).map((entry, i) => layer(entry, `${path}.layers[${i}]`));
      if (result.layers.reduce((sum, l) => sum + (l.type === 'particles' ? l.count : 0), 0) > 512) fail(`${path}.layers`, 'maximum combined particle count is 512');
    }
    return result;
  });
  return { version: 1, effects };
}

export function matchesEffect(effect: CustomEffect, track: Track | null): boolean {
  if (!effect.enabled || !track) return false;
  const normalizeTitle = effect.match.versions === 'exact' ? songArtist : songTitle;
  return effect.match.titles.some(title => normalizeTitle(title) === normalizeTitle(track.title))
    && effect.match.artists.some(artist => songArtists(track).includes(songArtist(artist)))
    && (!effect.match.album || songArtist(effect.match.album) === songArtist(track.album));
}
export function mergeEffects(current: EffectFile, incoming: EffectFile): EffectFile {
  // Reimport updates the same id. Last matching entry wins, making explicit overrides predictable.
  const effects = [...current.effects.filter(effect => !incoming.effects.some(next => next.id === effect.id)), ...incoming.effects];
  if (effects.length > 64) fail('library', 'maximum is 64 effects; remove an effect before importing');
  return { version: 1, effects };
}
export function evaluateSignal(signal: Signal, time: number, audio: EffectAudio, min: number, max: number): number {
  if (typeof signal === 'number') return Math.max(min, Math.min(max, signal));
  let value = signal.value;
  const frames = signal.keyframes;
  if (frames) {
    const end = frames[frames.length - 1][0];
    const t = signal.loop ? time % end : Math.min(time, end);
    value = frames[frames.length - 1][1];
    for (let i = 1; i < frames.length; i++) if (t <= frames[i][0]) {
      const [a, av] = frames[i - 1], [b, bv] = frames[i];
      value = av + (bv - av) * (t - a) / (b - a); break;
    }
  }
  if (signal.period) value += Math.sin((time / signal.period + (signal.phase ?? 0)) * Math.PI * 2) * (signal.amplitude ?? 0);
  if (signal.audio) value += audio[signal.audio] * (signal.amount ?? 1);
  return Math.max(min, Math.min(max, value));
}
export function starterEffect(track: Track | null): EffectFile {
  return parseEffectFile(JSON.stringify({ version: 1, effects: [{
    id: 'my-song-effect', name: 'Neon orbit', match: { titles: [track?.title || 'Your song title'], artists: [track?.artist || track?.albumArtist || 'Your artist'] },
    layers: [
      { type: 'ring', color: '#9b73ff', size: { value: .3, audio: 'bass', amount: .08 }, opacity: .65, thickness: .003, softness: .012, scaleY: .65, rotation: { keyframes: [[0, 0], [20, 360]], loop: true } },
      { type: 'particles', color: 'accent', count: 48, size: .004, speed: .08, opacity: { value: .35, audio: 'treble', amount: .5 } },
      { type: 'waves', color: '#56dfff', y: .2, size: .04, thickness: .002, opacity: .45, speed: .2, count: 5 },
    ],
  }] }));
}
