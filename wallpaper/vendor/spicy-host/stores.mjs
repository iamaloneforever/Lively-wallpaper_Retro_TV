// The wallpaper owns player/settings state; the renderer reads the same store API.
export const atom = initial => {
  let value = initial; const listeners = new Set();
  return { get: () => value, set(next) { if (Object.is(next, value)) return; value = next; for (const fn of listeners) fn(value); },
    listen(fn) { listeners.add(fn); return () => listeners.delete(fn); }, subscribe(fn) { fn(value); listeners.add(fn); return () => listeners.delete(fn); } };
};
export const $lyricsContainerExists = atom(false), $currentLyricsType = atom('None');
export const $minimalLyricsMode = atom(false), $simpleLyricsMode = atom(false), $simpleLyricsModeRenderingType = atom('calculate');
export const $smoothScrolling = atom(true), $seekFadeCompensation = atom(false), $scrollLeadEnabled = atom(false), $scrollLeadMs = atom(0);
export const $developerMode = atom(false), $animationFpsCapEnabled = atom(true), $animationFpsCap = atom(60), $romanization = atom(false);
