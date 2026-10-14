import { setPage } from './page.mjs';
import { setClock } from './player.mjs';
import * as stores from './stores.mjs';
import Global from './global.mjs';
import { ApplySyllableLyrics } from '../spicy-lyrics/src/utils/Lyrics/Applyer/Synced/Syllable.ts';
import { ApplyLineLyrics } from '../spicy-lyrics/src/utils/Lyrics/Applyer/Synced/Line.ts';
import { ApplyStaticLyrics } from '../spicy-lyrics/src/utils/Lyrics/Applyer/Static.ts';
import { DestroyAllLyricsContainers } from '../spicy-lyrics/src/utils/Lyrics/Applyer/CreateLyricsContainer.ts';
import { LyricsObject, ClearLyricsContentArrays } from '../spicy-lyrics/src/utils/Lyrics/lyrics.ts';
import { ClearScrollSimplebar, ScrollSimplebar } from '../spicy-lyrics/src/utils/Scrolling/Simplebar/ScrollSimplebar.ts';
import { ScrollToActiveLine, InitializeScrollEvents, CleanupScrollEvents, ResetLastLine } from '../spicy-lyrics/src/utils/Scrolling/ScrollToActiveLine.ts';
import { onAnimationFrame } from '../spicy-lyrics/src/utils/AnimationFrameLoop.ts';
import { setBlurringLastLine } from '../spicy-lyrics/src/utils/Lyrics/Animator/Lyrics/LyricsAnimator.ts';

let page = null;
let windowLines = [];
let windowIndex = -1;
let positionMs = 0;
function updateLineWindow() {
  if (!windowLines.length) return;
  let current = 0;
  for (let i = 0; i < windowLines.length; i++) {
    if (windowLines[i].StartTime <= positionMs) current = i;
  }
  if (current === windowIndex) return;
  windowIndex = current;
  for (let i = 0; i < windowLines.length; i++) {
    const element = windowLines[i].HTMLElement;
    const role = i === current - 1 ? 'previous' : i === current ? 'current' : i === current + 1 ? 'next' : '';
    if (role) element.dataset.window = role;
    else delete element.dataset.window;
  }
}
const overflowObserver = new ResizeObserver(entries => {
  const limit = (page?.querySelector('.LyricsContent')?.clientHeight || 0) - 64;
  if (limit < 80) return;
  const maxHeight = limit + 'px';
  if (page.style.getPropertyValue('--row-max-height') !== maxHeight) page.style.setProperty('--row-max-height', maxHeight);
  const rows = new Set(entries.filter(entry => entry.target.classList.contains('line')).map(entry => entry.target));
  if (entries.some(entry => entry.target.classList.contains('LyricsContent'))) for (const row of page.querySelectorAll('.line')) rows.add(row);
  for (const row of rows) row.classList.toggle('OverflowLine', row.scrollHeight > limit + 1);
});
onAnimationFrame(() => { if (stores.$lyricsContainerExists.get()) ScrollToActiveLine(ScrollSimplebar); });
Global.Event.listen('lyrics:apply', () => { CleanupScrollEvents(); InitializeScrollEvents(ScrollSimplebar); ResetLastLine(); });
export function mount(element) {
  clear(); page = element; setPage(element); element.id = 'SpicyLyricsPage'; element.className = 'SpicyRenderer';
  element.innerHTML = '<div class="ContentBox"><div class="LyricsContainer"><div class="LyricsContent"></div></div></div>';
  overflowObserver.observe(element.querySelector('.LyricsContent'));
}
export function clear() {
  overflowObserver.disconnect();
  windowLines = []; windowIndex = -1;
  stores.$lyricsContainerExists.set(false); stores.$currentLyricsType.set('None');
  CleanupScrollEvents(); DestroyAllLyricsContainers(); ClearScrollSimplebar(); ClearLyricsContentArrays(); setBlurringLastLine(null);
  page?.querySelector('.LyricsContent')?.replaceChildren();
}
export function apply(data) {
  stores.$lyricsContainerExists.set(true); stores.$currentLyricsType.set(data.Type);
  if (data.Type === 'Syllable') ApplySyllableLyrics(data);
  else if (data.Type === 'Line') ApplyLineLyrics(data);
  else ApplyStaticLyrics(data);
  overflowObserver.observe(page.querySelector('.LyricsContent'));
  if (data.source === 'lrclib') { const credit = page.querySelector('.LyricsProvider'); if (credit) credit.textContent = 'Provided by: LRCLIB'; }
  // Expose only original provider boundaries for inspection, not invented timings.
  const lines = LyricsObject.Types[data.Type]?.Lines || [];
  page.classList.toggle('ThreeLineWindow', data.Type === 'Line' || data.Type === 'Syllable');
  windowLines = lines.filter(line => !line.DotLine && !line.HTMLElement.classList.contains('bg-line'));
  windowIndex = -1;
  updateLineWindow();
  for (const [index, line] of lines.entries()) {
    overflowObserver.observe(line.HTMLElement);
    line.HTMLElement.dataset.line = String(index);
    if (line.StartTime !== undefined) { line.HTMLElement.dataset.start = String(line.StartTime / 1000); line.HTMLElement.dataset.end = String(line.EndTime / 1000); }
    for (const word of line.Syllables?.Lead || []) { if (Number.isFinite(word.StartTime) && Number.isFinite(word.EndTime)) { word.HTMLElement.dataset.start = String(word.StartTime / 1000); word.HTMLElement.dataset.end = String(word.EndTime / 1000); } }
  }
}
export function clock(positionSeconds, playing, enabled) { positionMs = positionSeconds * 1000; setClock(positionMs, playing); stores.$lyricsContainerExists.set(enabled); if (enabled) updateLineWindow(); }
export function appearance(config, reduced) {
  const simple = reduced || config.lowPower || config.lyricStyle !== 'smooth';
  stores.$simpleLyricsMode.set(simple); stores.$minimalLyricsMode.set(config.lyricStyle === 'minimal'); stores.$smoothScrolling.set(!reduced && !config.lowPower);
  stores.$animationFpsCap.set(config.lowPower ? 30 : config.fps);
  page?.classList.toggle('SimpleLyricsMode', simple); page?.classList.toggle('MinimalLyricsMode', config.lyricStyle === 'minimal');
  page?.classList.toggle('ReducedMotion', reduced || config.lowPower || config.lyricStyle === 'minimal');
}
