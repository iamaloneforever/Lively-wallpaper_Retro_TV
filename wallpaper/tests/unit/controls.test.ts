import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { defaults, loadConfig } from '../../src/core/Config';
import { Television } from '../../src/graphics/Television';
import type { ScreenPainter } from '../../src/ui/ScreenPainter';

afterEach(() => vi.unstubAllGlobals());
describe('configuration migration', () => {
  it('retains old preferences and defaults new appearance settings to Smooth', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ casing: 'beige', fps: 30, publicLyrics: true, intensity: 1.2 }) });
    expect(loadConfig()).toEqual({ ...defaults, casing: 'beige', fps: 30, publicLyrics: true, intensity: 1.2 });
  });
  it('bounds appearance values and rejects unsupported presets', () => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ lyricSize: 9, lyricIntensity: -2, lyricStyle: 'random', lyricColor: 'neon' }) });
    expect(loadConfig()).toMatchObject({ lyricSize: 1.35, lyricIntensity: 0, lyricStyle: 'smooth', lyricColor: 'automatic' });
  });
});
describe('channel pivot', () => {
  it('turns around the cabinet Z axis with stable attachment and independent gain control', () => {
    const context = new Proxy({}, { get: () => () => {}, set: () => true });
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => context }) });
    const texture = new THREE.Texture();
    const tv = new Television({ texture } as ScreenPainter);
    const channel = tv.targets.find(target => target.userData.action === 'channel')!;
    const gain = tv.targets.find(target => target.userData.action === 'intensity')!;
    tv.group.updateMatrixWorld(true);
    const original = tv.channel.position.clone();
    const gainMatrix = gain.parent!.matrix.clone();
    expect(channel.parent).toBe(tv.channel);
    expect(channel.rotation.toArray().slice(0, 3)).toEqual([0, 0, 0]);
    expect(original.toArray()).toEqual([2.67, .95, 1.54]);
    tv.configure({ ...defaults, mode: 'vinyl' }, true);
    tv.updateDial(1 / 60, false);
    expect(tv.channel.rotation.z).toBeGreaterThan(0);
    expect(tv.channel.rotation.z).toBeLessThan(Math.PI / 2);
    for (let i = 0; i < 120; i++) tv.updateDial(1 / 60, false);
    expect(tv.channel.rotation.z).toBe(Math.PI / 2);
    tv.group.updateMatrixWorld(true);
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(tv.channel.matrixWorld);
    expect(normal.distanceTo(new THREE.Vector3(0, 0, 1))).toBeLessThan(1e-9);
    for (let i = 0; i < 100; i++) { tv.configure({ ...defaults, mode: i % 2 ? 'broadcast' : 'vinyl' }, true); tv.updateDial(.02, false); }
    for (let i = 0; i < 120; i++) tv.updateDial(1 / 30, false);
    expect(tv.channel.rotation.toArray().slice(0, 3)).toEqual([0, 0, 0]);
    expect(tv.channel.position.equals(original)).toBe(true);
    expect(gain.parent!.matrix.equals(gainMatrix)).toBe(true);
    expect(tv.group.rotation.toArray().slice(0, 3)).toEqual([0, 0, 0]);
    // Frame independent damping reaches the same angle over equal elapsed time.
    tv.configure({ ...defaults, mode: 'vinyl' }, true);
    for (let i = 0; i < 15; i++) tv.updateDial(1 / 30, false);
    const at30 = tv.channel.rotation.z;
    tv.configure(defaults, true); tv.updateDial(0, true);
    tv.configure({ ...defaults, mode: 'vinyl' }, true);
    for (let i = 0; i < 30; i++) tv.updateDial(1 / 60, false);
    expect(tv.channel.rotation.z).toBeCloseTo(at30, 8);
    tv.dispose(); texture.dispose();
  });
});
