import { expect, it } from 'vitest';
import { hasCharacterTiming, graphemes } from '../../src/lyrics/CharacterMotion';

it('keeps combining accents and joined emoji intact', () => {
  expect(graphemes('e\u0301 👩‍🎤')).toEqual(['e\u0301', ' ', '👩‍🎤']);
});
it('accepts only one grapheme with its own valid timestamps', () => {
  expect(hasCharacterTiming('e\u0301 ', 5, 7)).toBe(true);
  expect(hasCharacterTiming('👩‍🎤 ', 5, 7)).toBe(true);
  for (const text of ['Moon', 'la', 'whole lyric line', '  ']) expect(hasCharacterTiming(text, 5, 7)).toBe(false);
  expect(hasCharacterTiming('a', NaN, 7)).toBe(false);
  expect(hasCharacterTiming('a', -1, 7)).toBe(false);
  expect(hasCharacterTiming('a', 5, 5)).toBe(false);
});
