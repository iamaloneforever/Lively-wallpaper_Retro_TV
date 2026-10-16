// Match complete words and common inflections; never censor substrings in words such as "class".
const explicit = /(?<![\p{L}\p{N}_])(?:motherfuck(?:ers?|ing|in|ed|s)?|fuck(?:ers?|ing|in|ed|s)?|bullshit(?:ting)?|shit(?:head(?:s)?|ting|ty|ted|s)?|bitch(?:es|ing|in|y)?|bastards?|assholes?|ass|dick(?:heads?|s)?|cock(?:suckers?|s)?|puss(?:y|ies)|cunts?|whores?|sluts?|damn(?:ed|it)?|nigg(?:a|er)s?|fag(?:got)?s?|twats?)(?![\p{L}\p{N}_])/giu;
export const censorText = (text: string): string => text.replace(explicit, word => '*'.repeat(word.length));

/** Apply only to a renderer copy: syllable boundaries, timing and the original lyrics stay intact. */
export function censorRendererText(value: unknown): void {
  if (Array.isArray(value)) { value.forEach(censorRendererText); return; }
  if (!value || typeof value !== 'object') return;
  const row = value as Record<string, unknown>;
  if (Array.isArray(row.Syllables)) {
    const parts = row.Syllables as Record<string, unknown>[];
    for (let start = 0; start < parts.length;) {
      let end = start;
      while (end + 1 < parts.length && parts[end]?.IsPartOfWord === true) end++;
      const word = parts.slice(start, end + 1).map(part => typeof part?.Text === 'string' ? part.Text : '').join('');
      const masked = censorText(word); let offset = 0;
      for (let i = start; i <= end; i++) {
        if (typeof parts[i]?.Text !== 'string') continue;
        const length = (parts[i].Text as string).length;
        parts[i].Text = masked.slice(offset, offset + length); offset += length;
      }
      start = end + 1;
    }
  }
  for (const [key, child] of Object.entries(row)) {
    if (key === 'Text' && typeof child === 'string') row[key] = censorText(child);
    else if (key !== 'Syllables') censorRendererText(child);
  }
}
