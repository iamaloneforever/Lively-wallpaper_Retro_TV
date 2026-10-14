const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
export const graphemes = (text: string): string[] => Array.from(segmenter.segment(text), item => item.segment);

/** Decorative stagger inside a provider segment, not provider character timestamps. */
export function characterWindow(start: number, end: number, index: number, count: number): { delay: number; duration: number } {
  const span = (end - start) * 1000;
  return { delay: start * 1000 + span * .75 * index / count, duration: span * (.25 + .75 / count) };
}
