import { rateSongs } from '../music/SongRating';
import type { Playback } from '../lyrics/Lyrics';
import { searchSongs, type SongCandidate } from '../music/SongSearch';

/** A correction belongs to the native song, never to subsequent playback. */
export class SongPicker {
  private dialog: HTMLDialogElement;
  private playback: Playback | null = null;
  private identity = '';
  private searchTitle: string | null = null;
  private searchArtist: string | null = null;
  private autoOpened = false;
  private autoRequested = false;
  private allowPublic = false;
  private enabled = false;
  private request: AbortController | null = null;
  private timer = 0;
  private generation = 0;
  private disposed = false;
  private returnFocus: HTMLElement | null = null;
  private query<T extends HTMLElement = HTMLElement>(selector: string): T { return this.dialog.querySelector<T>(selector)!; }
  constructor(private root: HTMLElement, private select: (candidate: SongCandidate) => void) {
    this.dialog = document.createElement('dialog'); this.dialog.className = 'song-picker'; this.dialog.id = 'song-picker';
    this.dialog.setAttribute('aria-labelledby', 'song-picker-heading');
    this.dialog.innerHTML = `<header class="song-picker-heading"><div><span class="eyebrow">MUSIC FINDER</span><h2 id="song-picker-heading">Find your song</h2></div><button type="button" id="close-song-picker" aria-label="Close song picker">✕</button></header>
      <p>Choose the right recording to load its lyrics.</p>
      <div class="song-picker-playing"><span>Now playing · full name</span><strong id="song-picker-native"></strong></div>
      <form method="dialog" id="song-picker-form"><label>Song name<input id="song-picker-title" type="search" maxlength="512" autocomplete="off" placeholder="Edit the song name" /></label><label>Artist (optional)<input id="song-picker-artist" type="search" maxlength="512" autocomplete="off" placeholder="Artist name" /></label></form>
      <p class="song-picker-query" id="song-picker-query"></p><p id="song-picker-status" role="status" aria-live="polite"></p>
      <p id="song-picker-rating-note" class="song-picker-query">Score: title 40%, singer 25%, duration 20%, source weight 10%, agreement 5%. Unknown fields are excluded.</p><div id="song-picker-sources" class="song-picker-sources" aria-label="Source ratings"></div>
      <div id="song-picker-results" class="song-picker-results" aria-label="Song search results"></div>`;
    root.append(this.dialog);
    this.query('#close-song-picker').onclick = () => this.close();
    this.dialog.addEventListener('close', () => { this.cancel(); this.returnFocus?.focus({ preventScroll: true }); });
    this.dialog.addEventListener('cancel', () => this.cancel());
    // Search inputs can consume Escape to clear text before the dialog sees it.
    this.dialog.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopPropagation(); this.autoRequested = false; this.autoOpened = true; this.close();
    }, { capture: true });
    this.query('#song-picker-title').addEventListener('input', () => this.schedule());
    this.query('#song-picker-artist').addEventListener('input', () => this.schedule());
    this.query('#song-picker-form').addEventListener('submit', event => { event.preventDefault(); this.schedule(); });
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'click', 'wheel', 'touchstart', 'touchmove']) this.dialog.addEventListener(type, event => event.stopPropagation());
  }
  setContext(identity: string, playback: Playback | null, enabled: boolean, allowPublic: boolean, hasLyrics = false): void {
    const changed = identity !== this.identity;
    const permissionChanged = allowPublic !== this.allowPublic;
    if (changed) { this.close(); this.identity = identity; this.searchTitle = null; this.searchArtist = null; this.autoOpened = false; this.autoRequested = false; this.playback = null; }
    this.enabled = enabled; this.allowPublic = allowPublic;
    this.playback = playback;
    if (hasLyrics) this.autoRequested = false;
    this.root.querySelector<HTMLButtonElement>('#find-song')!.disabled = !enabled || !this.playback;
    if (!enabled || !playback) this.close();
    else if (permissionChanged && this.dialog.open) this.schedule();
    if (this.autoRequested && enabled && this.root.querySelector<HTMLElement>('#settings')?.hidden) this.missingLyrics();
  }
  missingLyrics(): void {
    if (!this.enabled || !this.playback || this.autoOpened || this.disposed) return;
    this.autoRequested = true;
    if (!this.root.querySelector<HTMLElement>('#settings')?.hidden) return;
    this.autoRequested = false; this.autoOpened = true; this.open();
  }
  open(): void {
    if (!this.enabled || !this.playback || this.dialog.open || this.disposed) return;
    this.returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.query('#song-picker-native').textContent = `${this.playback.title} — ${this.playback.artist}`;
    this.query<HTMLInputElement>('#song-picker-title').value = this.searchTitle ?? this.playback.title;
    this.query<HTMLInputElement>('#song-picker-artist').value = this.searchArtist ?? this.playback.artist;
    this.dialog.showModal(); this.query('#song-picker-title').focus(); this.schedule();
  }
  close(): void { this.cancel(); if (this.dialog.open) this.dialog.close(); }
  private cancel(): void { clearTimeout(this.timer); this.request?.abort(); this.request = null; this.generation++; }
  private schedule(): void {
    this.cancel(); this.query('#song-picker-results').replaceChildren(); this.query('#song-picker-sources').replaceChildren();
    const title = this.query<HTMLInputElement>('#song-picker-title').value.trim();
    const artist = this.query<HTMLInputElement>('#song-picker-artist').value.trim();
    this.searchTitle = title; this.searchArtist = artist;
    this.query('#song-picker-query').textContent = `Searching for: ${title}${artist ? ` — ${artist}` : ''}`;
    if (title.length < 2) { this.query('#song-picker-status').textContent = 'Enter at least two characters to search.'; return; }
    this.query('#song-picker-status').textContent = 'Searching…';
    this.timer = window.setTimeout(() => void this.search(title, artist), 350);
  }
  private async search(title: string, artist: string): Promise<void> {
    if (!this.playback || !this.dialog.open) return;
    const generation = this.generation, request = new AbortController(); this.request = request;
    try {
      const result = await searchSongs(title, artist, this.playback, this.allowPublic, AbortSignal.any([request.signal, AbortSignal.timeout(20000)]));
      if (this.disposed || generation !== this.generation || !this.dialog.open) return;
      if (result.queries.length) this.query('#song-picker-query').textContent = result.queries.join('\n');
      this.query('#song-picker-status').textContent = `${result.candidates.length ? `${result.candidates.length} results. Choose your recording.` : 'No songs found. Try a different name or artist.'} ${result.detail}`;
      const ranked = rateSongs(result.candidates, title, artist, this.playback.duration);
      const providers = [...new Set(ranked.map(row => row.candidate.provider))];
      for (const provider of providers) {
        const rows = ranked.filter(row => row.candidate.provider === provider);
        const badge = document.createElement('span'); badge.className = 'song-picker-source';
        badge.textContent = `${provider} · best ${rows[0].rating.score}/100 · ${rows.length} results`;
        this.query('#song-picker-sources').append(badge);
      }
      for (const { candidate, rating } of ranked) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'song-picker-result';
        const title = document.createElement('strong'); title.textContent = candidate.title;
        const artist = document.createElement('span'); artist.textContent = `${candidate.artist}${candidate.album ? ` · ${candidate.album}` : ''}`;
        const detail = document.createElement('small');
        const duration = candidate.duration > 0 ? `${Math.floor(candidate.duration / 60)}:${String(Math.floor(candidate.duration % 60)).padStart(2, '0')} · ` : '';
        detail.textContent = `${duration}${candidate.provider} · ${candidate.spotifyId ? `Spotify ID: ${candidate.spotifyId}` : candidate.lrcId ? `Lyrics ID: ${candidate.lrcId}` : candidate.catalogueId ? `Apple ID: ${candidate.catalogueId}` : `Recording ID: ${candidate.mbid}`}`;
        const score = document.createElement('span'); score.className = 'song-picker-score'; score.textContent = `Match ${rating.score}/100`;
        const breakdown = document.createElement('small'); breakdown.className = 'song-picker-rating';
        breakdown.textContent = `Title ${rating.title}% · Singer ${rating.singer === null ? 'unknown' : rating.singer + '%'} · Duration ${rating.duration === null ? 'unknown' : rating.duration + '%'} · Source weight ${rating.popularity}% · Appears in ${rating.sources} source${rating.sources === 1 ? '' : 's'}`;
        button.append(title, score, artist, detail, breakdown); button.onclick = () => { this.autoOpened = false; this.select(candidate); this.close(); };
        this.query('#song-picker-results').append(button);
      }
    } catch {
      if (this.disposed || generation !== this.generation || request.signal.aborted) return;
      this.query('#song-picker-status').textContent = 'Search could not finish. Edit the name to try again.';
    }
  }
  dispose(): void { this.disposed = true; this.close(); this.dialog.remove(); }
}
