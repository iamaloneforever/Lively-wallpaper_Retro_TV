import { expect, it } from 'vitest';
import { ParticleMotion, particleVisibility } from '../../src/background/ParticleMotion';

function random() { let state = 713; return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; }; }
it('keeps visible positions continuous through audio bursts, every style, and rapid retargeting', () => {
  const motion = new ParticleMotion(96, random()), weights = new Float32Array(6), previous = motion.positions.slice();
  for (let frame = 0; frame < 2400; frame++) {
    weights.fill(0); weights[Math.floor(frame / 80) % 6] = 1;
    previous.set(motion.positions);
    motion.tick(1 / 30, weights, frame % 120 < 60 ? 1 : 0, frame % 2, 16 / 9);
    for (let i = 0; i < motion.count; i++) {
      const p = i * 3, x = motion.positions[p], y = motion.positions[p + 1];
      if (particleVisibility(x, y) > 0 || particleVisibility(previous[p], previous[p + 1]) > 0) {
        expect(Math.hypot(x - previous[p], y - previous[p + 1])).toBeLessThan(.0015);
      }
    }
  }
});
it('recycles particles only after fading completely out at both ends of the wrap', () => {
  const motion = new ParticleMotion(1, () => .5), dust = new Float32Array([1, 0, 0, 0, 0, 0]);
  for (let i = 0; i < 300; i++) motion.tick(1 / 30, dust, 0, 0, 1);
  motion.positions[0] = 1.11999; motion.positions[1] = 0;
  expect(particleVisibility(motion.positions[0], 0)).toBe(0);
  motion.tick(1 / 30, dust, 0, 1, 1);
  expect(motion.positions[0]).toBeLessThan(-1);
  expect(particleVisibility(motion.positions[0], motion.positions[1])).toBe(0);
});
it('eases shape and size changes instead of reassigning them in one frame', () => {
  const motion = new ParticleMotion(1, () => .5), dust = new Float32Array([1, 0, 0, 0, 0, 0]);
  for (let i = 0; i < 300; i++) motion.tick(1 / 60, dust, 0, 0, 1);
  const before = motion.shapeA[0];
  motion.tick(1 / 60, new Float32Array([0, 0, 0, 0, 1, 0]), 0, 1, 1);
  expect(motion.shapeA[0]).toBeGreaterThan(before * .97);
  expect(motion.shapeB[0]).toBeGreaterThan(0); expect(motion.shapeB[0]).toBeLessThan(.03);
});
it('keeps motion consistent across frame rates and avoids catch-up jumps after a slow frame', () => {
  const frames = [30, 60, 144].map(fps => {
    const motion = new ParticleMotion(8, random()), weights = new Float32Array([0, 0, 1, 0, 0, 0]);
    for (let i = 0; i < fps * 5; i++) motion.tick(1 / fps, weights, 0, .5, 16 / 9);
    return motion;
  });
  for (let i = 0; i < frames[0].positions.length; i++) {
    expect(frames[0].positions[i]).toBeCloseTo(frames[1].positions[i], 3);
    expect(frames[0].positions[i]).toBeCloseTo(frames[2].positions[i], 3);
  }
  const previous = frames[0].positions.slice();
  frames[0].tick(2, new Float32Array([0, 0, 0, 1, 0, 0]), 0, 1, 1);
  for (let i = 0; i < previous.length; i++) expect(Math.abs(frames[0].positions[i] - previous[i])).toBeLessThan(.0015);
});
it('keeps zero-speed particles stationary while allowing their appearance to settle', () => {
  const motion = new ParticleMotion(8, random()), positions = motion.positions.slice();
  for (let i = 0; i < 120; i++) motion.tick(1 / 60, new Float32Array([1, 0, 0, 0, 0, 0]), 0, 0, 1, 8, 0);
  expect(motion.positions).toEqual(positions);
  expect(motion.shapeA[0]).toBeGreaterThan(.9);
});

it('smoothly accelerates every particle style with music, without teleporting or reversing', () => {
  for (let style = 0; style < 6; style++) {
    const quiet = new ParticleMotion(1, () => .5), music = new ParticleMotion(1, () => .5);
    const weights = new Float32Array(6); weights[style] = 1;
    for (let i = 0; i < 300; i++) {
      quiet.tick(1 / 60, weights, 0, 0, 1);
      music.tick(1 / 60, weights, 0, 0, 1);
    }
    let quietDistance = 0, musicDistance = 0;
    for (let i = 0; i < 180; i++) {
      const q = quiet.positions.slice(), m = music.positions.slice();
      quiet.tick(1 / 60, weights, 0, 0, 1);
      music.tick(1 / 60, weights, 0, .55, 1);
      const delta = Math.hypot(music.positions[0] - m[0], music.positions[1] - m[1]);
      expect(delta).toBeLessThan(.0015);
      quietDistance += Math.hypot(quiet.positions[0] - q[0], quiet.positions[1] - q[1]);
      musicDistance += delta;
    }
    expect(musicDistance).toBeGreaterThan(quietDistance * 1.3);
  }
});
