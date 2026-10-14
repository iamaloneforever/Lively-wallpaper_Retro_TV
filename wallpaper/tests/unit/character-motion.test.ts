import { expect, it } from 'vitest';
import { characterWindow, graphemes } from '../../src/lyrics/CharacterMotion';

it('keeps combining accents and joined emoji intact', () => {
  expect(graphemes('e\u0301 👩‍🎤')).toEqual(['e\u0301', ' ', '👩‍🎤']);
});
it('staggers effects entirely within the actual provider segment', () => {
  const windows = Array.from({ length: 10 }, (_, i) => characterWindow(5, 7, i, 10));
  expect(windows[0].delay).toBe(5000);
  windows.forEach((window, i) => {
    expect(window.delay + window.duration).toBeLessThanOrEqual(7000);
    if (i) expect(window.delay).toBeGreaterThan(windows[i - 1].delay);
  });
  expect(windows[9].delay + windows[9].duration).toBe(7000);
});
