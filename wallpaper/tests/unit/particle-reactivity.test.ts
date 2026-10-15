import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { AudioEngine } from '../../src/audio/AudioEngine';
import { BackgroundEngine } from '../../src/background/BackgroundEngine';
import { defaults, type Config } from '../../src/core/Config';

function atmosphere() {
  const engine = new BackgroundEngine(), audio = new AudioEngine();
  let scene!: THREE.Scene;
  const renderer = {
    render: (value: THREE.Scene) => { scene = value; },
    getDrawingBufferSize: (size: THREE.Vector2) => size.set(960, 540), getPixelRatio: () => 1,
  } as unknown as THREE.WebGLRenderer;
  const render = (dt = 1 / 60, config: Config = defaults, reduced = false) =>
    engine.render(renderer, dt, config, audio, 'electronic', reduced, false, [], true);
  render(0, defaults, true); // Settle the genre before measuring motion.
  const environment = ((scene.children[0] as THREE.Mesh).material as THREE.ShaderMaterial).uniforms;
  const particles = ((scene.children[1] as THREE.Points).material as THREE.ShaderMaterial).uniforms;
  return { engine, audio, render, environment, particles };
}

describe('gentle atmosphere audio', () => {
  it('softens sudden loud input and limits the change between frames at maximum sensitivity', () => {
    const app = atmosphere();
    app.audio.bass = app.audio.mid = app.audio.treble = 1; app.audio.transient = 10;
    app.render(1 / 60, { ...defaults, reactivity: 2 });
    expect(app.environment.bands.value.x).toBeGreaterThan(0);
    expect(app.environment.bands.value.x).toBeLessThan(.03);
    expect(app.environment.onset.value).toBeLessThan(.01);
    let previous = app.environment.bands.value.x;
    for (let frame = 0; frame < 240; frame++) {
      app.audio.bass = app.audio.treble = frame % 2;
      app.render(1 / 60, { ...defaults, reactivity: 2 });
      expect(Math.abs(app.environment.bands.value.x - previous)).toBeLessThan(.03);
      expect(app.environment.bands.value.x).toBeLessThan(.55);
      previous = app.environment.bands.value.x;
    }
    app.engine.dispose();
  });
  it('eases back to silence rather than snapping off or leaving a permanent pulse', () => {
    const app = atmosphere(); app.audio.bass = app.audio.mid = app.audio.treble = 1;
    for (let i = 0; i < 120; i++) app.render();
    const loud = app.environment.amplitude.value;
    app.audio.bass = app.audio.mid = app.audio.treble = 0; app.render();
    expect(app.environment.amplitude.value).toBeGreaterThan(loud * .95);
    expect(app.environment.amplitude.value).toBeLessThan(loud);
    for (let i = 0; i < 360; i++) app.render();
    expect(app.environment.amplitude.value).toBeLessThan(.001);
    app.engine.dispose();
  });
  it('gives the same response at 30, 60 and 144 frames per second', () => {
    const responses = [30, 60, 144].map(fps => {
      const app = atmosphere(); app.audio.bass = app.audio.mid = app.audio.treble = 1; app.audio.transient = 1;
      for (let i = 0; i < fps; i++) app.render(1 / fps);
      const result = [app.environment.bands.value.x, app.environment.onset.value, app.particles.emberTime.value];
      app.engine.dispose(); return result;
    });
    expect(responses[0][0]).toBeCloseTo(responses[1][0], 6);
    expect(responses[0][0]).toBeCloseTo(responses[2][0], 6);
    expect(responses[0][1]).toBeCloseTo(responses[2][1], 6);
    expect(responses[0][2]).toBeCloseTo(responses[2][2], 3);
  });
  it('keeps bass-driven motion continuous after a long-running session', () => {
    const fresh = atmosphere(), old = atmosphere();
    for (let i = 0; i < 3600; i++) old.render(1);
    const before = old.particles.emberTime.value;
    fresh.audio.bass = old.audio.bass = 1;
    fresh.render(); old.render();
    const freshStep = fresh.particles.emberTime.value;
    expect(old.particles.emberTime.value - before).toBeCloseTo(freshStep, 9);
    expect(freshStep).toBeGreaterThan(0); expect(freshStep).toBeLessThan(.01);
    fresh.engine.dispose(); old.engine.dispose();
  });
  it('respects zero sensitivity and freezes motion for reduced motion and disabled animation', () => {
    const app = atmosphere(); app.audio.bass = 1; app.audio.transient = 1;
    for (let i = 0; i < 60; i++) app.render();
    app.render(1 / 60, { ...defaults, reactivity: 0 });
    expect(app.environment.bands.value.length()).toBe(0);
    expect(app.environment.onset.value).toBe(0);
    const phase = app.particles.emberTime.value;
    app.render(1, defaults, true); expect(app.particles.emberTime.value).toBe(phase);
    app.render(1, { ...defaults, backgroundAnimation: false }); expect(app.particles.emberTime.value).toBe(phase);
    app.engine.dispose();
  });
});
