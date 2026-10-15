import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { normalizeGenre, themes } from '../../src/background/Themes';
import { ThemeTransition } from '../../src/background/Transition';
import { GenreResolver } from '../../src/background/GenreResolver';
import { BackgroundEngine } from '../../src/background/BackgroundEngine';
import { defaults, parseConfig } from '../../src/core/Config';
import { songAccents, accentEffects } from '../../src/background/SongAccents';
import { AudioEngine } from '../../src/audio/AudioEngine';
import type { Track } from '../../src/lively/types';

const track: Track = { title: 'A song', artist: 'An artist', album: 'An album', albumArtist: '', thumbnail: null, trackNumber: null, genres: [], subtitle: '', playbackType: '' };
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('genre selection', () => {
  it.each([
    ['Dark synthwave', 'synthwave'], ['Progressive house', 'electronic'], ['K-Pop', 'pop'], ['Death Metal', 'rock'],
    ['Hip-Hop', 'hiphop'], ['Bebop jazz', 'jazz'], ['Chamber music', 'classical'], ['Downtempo', 'ambient'],
    ['Lo-fi hip hop', 'lofi'], ['R&B', 'soul'], ['Indie rock', 'indie'], ['Drum & Bass', 'electronic'],
    ['Synth-pop', 'synthwave'], ['Symphonic Metal', 'rock'], ['Neo-Soul', 'soul'], ['Dream pop', 'indie'], ['Soundtrack', 'classical'],
  ])('maps %s to %s', (genre, theme) => expect(normalizeGenre([genre])).toBe(theme));
  it('uses only supplied genres, respects their order and rejects unknowns', () => {
    expect(normalizeGenre([])).toBeNull(); expect(normalizeGenre(['unknown', 'trap'])).toBe('hiphop');
    expect(normalizeGenre(['pop', 'metal'])).toBe('pop'); expect(normalizeGenre(['unclassified'])).toBeNull();
  });
  it('prefers native genres and never requests the companion when disabled or unpaired', () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch); vi.stubGlobal('location', { hash: '' });
    const resolver = new GenreResolver(); resolver.setTrack({ ...track, genres: ['Jazz'] });
    expect(resolver.detected).toBe('jazz'); resolver.setTrack(null); expect(resolver.detected).toBeNull();
    resolver.setTrack(track); resolver.tick(100, track, true); expect(fetch).not.toHaveBeenCalled();
    vi.stubGlobal('location', { hash: '#bridge=' + 'a'.repeat(64) }); resolver.tick(100, track, false); expect(fetch).not.toHaveBeenCalled(); resolver.dispose();
  });
  it('discards a delayed response for a previous recording and caches companion genres', async () => {
    vi.stubGlobal('location', { hash: '#bridge=' + 'a'.repeat(64) });
    let finish!: (r: Response) => void;
    const fetch = vi.fn(() => new Promise<Response>(resolve => { finish = resolve; })); vi.stubGlobal('fetch', fetch);
    const resolver = new GenreResolver(); resolver.setTrack(track); resolver.tick(0, track, true);
    const other = { ...track, title: 'Another song' }; resolver.setTrack(other);
    finish(new Response(JSON.stringify({ title: track.title, artist: track.artist, genres: ['rock'], capturedAtUnixMs: Date.now() })));
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1)); await new Promise(resolve => setTimeout(resolve, 0)); expect(resolver.detected).toBeNull();
    resolver.tick(100, other, true);
    finish(new Response(JSON.stringify({ title: other.title, artist: other.artist, genres: ['ambient'], capturedAtUnixMs: Date.now() })));
    await vi.waitFor(() => expect(resolver.detected).toBe('ambient'));
    resolver.setTrack(track); resolver.setTrack(other); expect(resolver.detected).toBe('ambient'); resolver.tick(1000, other, true); expect(fetch).toHaveBeenCalledTimes(2); resolver.dispose();
  });
  it('ignores stale and album-mismatched companion snapshots', async () => {
    vi.stubGlobal('location', { hash: '#bridge=' + 'a'.repeat(64) });
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ title: track.title, artist: track.artist, album: 'Different album', genres: ['rock'], capturedAtUnixMs: Date.now() })));
    vi.stubGlobal('fetch', fetch); const resolver = new GenreResolver(); resolver.setTrack(track); resolver.tick(0, track, true);
    await new Promise(resolve => setTimeout(resolve, 0)); expect(resolver.detected).toBeNull();
    fetch.mockResolvedValue(new Response(JSON.stringify({ title: track.title, artist: track.artist, genres: ['rock'], capturedAtUnixMs: Date.now() - 10000 })));
    resolver.tick(3000, track, true); await new Promise(resolve => setTimeout(resolve, 0)); expect(resolver.detected).toBeNull(); resolver.dispose();
  });
});
describe('interruptible environment transitions', () => {
  it('crossfades the visible mixture with no jump when retargeted', () => {
    const transition = new ThemeTransition(11); transition.select(1); transition.tick(.5, 2);
    const visible = [...transition.weights]; expect(visible[0]).toBeGreaterThan(0); expect(visible[1]).toBeGreaterThan(0);
    transition.select(2); transition.tick(0, 2); expect([...transition.weights]).toEqual(visible);
    for (let i = 0; i < 5000; i++) {
      transition.select(i % 11); transition.tick(1 / 60, 2);
      expect([...transition.weights].reduce((a, b) => a + b)).toBeCloseTo(1, 5);
    }
    transition.select(3); transition.tick(2, 2); expect(transition.weights[3]).toBe(1);
    expect([...transition.weights].filter(w => w !== 0)).toHaveLength(1);
  });
  it('settles immediately for reduced motion and clamps invalid indices', () => {
    const transition = new ThemeTransition(11); transition.select(9); transition.tick(0, 3, true); expect(transition.weights[9]).toBe(1);
    transition.select(-1); transition.select(11); transition.tick(1, 1); expect(transition.weights[9]).toBe(1);
  });
});
describe('environment resources and motion', () => {
  it('reuses its buffers through 5000 changes, respects caps and disposes all resources', () => {
    const engine = new BackgroundEngine(), audio = new AudioEngine(); let scene!: THREE.Scene;
    const renderer = { render: (s: THREE.Scene) => { scene = s; }, getDrawingBufferSize: (size: THREE.Vector2) => size.set(960, 540), getPixelRatio: () => 1 } as unknown as THREE.WebGLRenderer;
    engine.render(renderer, .1, defaults, audio, 'synthwave', false, false, [], true);
    const objects = [...scene.children] as (THREE.Mesh | THREE.Points)[];
    const geometries = objects.map(object => object.geometry), materials = objects.map(object => object.material as THREE.ShaderMaterial);
    const disposal = [...geometries, ...materials].map(() => vi.fn(() => {}));
    [...geometries, ...materials].forEach((resource, i) => resource.addEventListener('dispose', disposal[i]));
    for (let i = 0; i < 5000; i++) engine.render(renderer, 1 / 60, { ...defaults, performancePreset: 'low', particleDensity: 1 }, audio, themes[i % themes.length].id, false, false, [], true);
    expect(scene.children).toEqual(objects); expect(objects.map(object => object.geometry)).toEqual(geometries); expect(geometries[1].drawRange.count).toBe(96);
    const time = materials[0].uniforms.time.value;
    audio.update(Array(128).fill(1)); audio.tick(.1);
    engine.render(renderer, 1, defaults, audio, 'pop', true, true, [], true);
    expect(materials[0].uniforms.time.value).toBe(time); expect(materials[0].uniforms.bands.value.length()).toBe(0); expect(materials[0].uniforms.onset.value).toBe(0);
    expect(objects[1].visible).toBe(false); expect(engine.transition.weights[2]).toBe(1);
    engine.render(renderer, 1, { ...defaults, backgroundAnimation: false }, audio, 'ambient', false, false, [], true);
    expect(materials[0].uniforms.time.value).toBe(time);
    for (const [preset, cap] of [['low', 96], ['balanced', 256], ['high', 512], ['ultra', 768]] as const) {
      engine.render(renderer, .1, { ...defaults, performancePreset: preset, particleDensity: 1 }, audio, 'ambient', false, false, [], true);
      expect(geometries[1].drawRange.count).toBe(cap);
    }
    for (const accent of songAccents) {
      engine.render(renderer, .1, defaults, audio, 'ambient', true, false, [], true, accent);
      expect(materials[0].uniforms.songWeights.value[accentEffects.indexOf(accent.effect)]).toBe(1);
    }
    engine.render(renderer, .1, { ...defaults, songAccents: false }, audio, 'ambient', true, false, [], true, songAccents[0]);
    expect(materials[0].uniforms.songWeights.value[0]).toBe(1);
    engine.dispose(); disposal.forEach(spy => expect(spy).toHaveBeenCalledOnce()); expect(scene.children).toHaveLength(0);
  });
  it('validates stored settings and migrates old preferences', () => {
    expect(parseConfig({ mode: 'vinyl' })).toEqual({ ...defaults, mode: 'vinyl' });
    const config = parseConfig({ manualTheme: 'bogus', defaultTheme: 'jazz', transitionDuration: Infinity, particleDensity: 9, reactivity: -1, performancePreset: '__proto__' });
    expect(config.manualTheme).toBe('auto'); expect(config.defaultTheme).toBe('jazz'); expect(config.transitionDuration).toBe(3); expect(config.particleDensity).toBe(1); expect(config.reactivity).toBe(0); expect(config.performancePreset).toBe('balanced');
  });
});

describe('song easter eggs and layered effects', () => {
  it('gives every genre at least two effect layers with a normalized budget', () => {
    for (const theme of themes) {
      const weights = Object.values(theme.effects); expect(weights.length).toBeGreaterThanOrEqual(2);
      expect(weights.reduce((a: number, b: number) => a + b, 0)).toBeCloseTo(1);
    }
  });
});
