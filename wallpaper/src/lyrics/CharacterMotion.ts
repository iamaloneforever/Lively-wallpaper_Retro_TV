const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
export const graphemes = (text: string): string[] => Array.from(segmenter.segment(text), item => item.segment);

/** Only an individually timestamped grapheme can receive character motion. */
export function hasCharacterTiming(text: string, start: number, end: number): boolean {
  return Number.isFinite(start) && start >= 0 && Number.isFinite(end) && end > start && graphemes(text).filter(part => /\S/u.test(part)).length === 1;
}
