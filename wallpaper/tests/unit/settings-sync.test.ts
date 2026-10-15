import { afterEach, expect, it, vi } from 'vitest';
import { defaults } from '../../src/core/Config';
import { parseSettingsState, SettingsSync, type SettingsDocument } from '../../src/core/SettingsSync';
const initial: SettingsDocument = { version: 1, config: { ...defaults }, lyricsKey: '' };
const stored: SettingsDocument = { version: 1, config: { ...defaults, casing: 'beige', lyricSize: 1.25 }, lyricsKey: 'sl_pk_fixture' };
const state = (settings = stored, revision = 'a'.repeat(64)) => ({ initialized: !!revision, revision, settings });
function create() {
  vi.stubGlobal('location', { hash: `#bridge=${'c'.repeat(64)}` });
  vi.stubGlobal('window', { setTimeout: vi.fn().mockReturnValue(0) });
  const apply = vi.fn(), status = vi.fn(); return { sync: new SettingsSync(initial, apply, status), apply, status };
}
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); vi.unstubAllGlobals(); });
it('validates the shared settings schema and publishable keys', () => {
  expect(parseSettingsState(state())?.settings).toEqual(stored);
  expect(parseSettingsState(state({ ...stored, version: 2 } as unknown as SettingsDocument))).toBeNull();
  expect(parseSettingsState(state({ ...stored, lyricsKey: 'sl_sk_secret' }))).toBeNull();
  expect(parseSettingsState(state({ ...stored, config: { ...defaults, lyricSize: 99 } }))).toBeNull();
});
it('loads saved settings once without rewriting them on startup or unchanged polls', async () => {
  const fetcher = vi.fn().mockImplementation(async () => new Response(JSON.stringify(state()))); vi.stubGlobal('fetch', fetcher);
  const { sync, apply } = create(); await sync.cycle(); await sync.cycle();
  expect(apply).toHaveBeenCalledTimes(1); expect(apply).toHaveBeenCalledWith(stored);
  expect(fetcher.mock.calls.every(call => call[1].method !== 'POST')).toBe(true); sync.dispose();
});
it('migrates browser preferences only when the JSON file is missing', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(state(initial, '')))).mockResolvedValueOnce(new Response(JSON.stringify(state(initial)))); vi.stubGlobal('fetch', fetcher);
  const { sync } = create(); await sync.cycle();
  const saved = JSON.parse(fetcher.mock.calls[1][1].body);
  expect(saved.expectedRevision).toBe(''); expect(saved.settings).toEqual(initial); sync.dispose();
});
it('gives a migration write its full request budget after a slow successful read', async () => {
  vi.useFakeTimers();
  vi.spyOn(AbortSignal, 'timeout').mockImplementation(delay => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException('Request timed out', 'TimeoutError')), delay);
    return controller.signal;
  });
  let calls = 0;
  const fetcher = vi.fn((_url: string, options: RequestInit) => new Promise<Response>((resolve, reject) => {
    const first = calls++ === 0;
    const timer = setTimeout(() => resolve(new Response(JSON.stringify(state(initial, first ? '' : 'a'.repeat(64))))), 1800);
    options.signal!.addEventListener('abort', () => { clearTimeout(timer); reject(options.signal!.reason); }, { once: true });
  }));
  vi.stubGlobal('fetch', fetcher);
  const { sync, status } = create();
  const saving = sync.cycle(); await vi.advanceTimersByTimeAsync(3600); await saving;
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(status).toHaveBeenLastCalledWith(expect.stringContaining('Settings saved in wallpaper-settings.json'));
  sync.dispose();
});
it('still cancels a migration write when the synchronizer is disposed', async () => {
  let writeSignal!: AbortSignal;
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(state(initial, ''))))
    .mockImplementationOnce((_url: string, options: RequestInit) => new Promise<Response>((_resolve, reject) => {
      writeSignal = options.signal!;
      writeSignal.addEventListener('abort', () => reject(writeSignal.reason), { once: true });
    }));
  vi.stubGlobal('fetch', fetcher);
  const { sync, apply, status } = create(); const saving = sync.cycle();
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
  sync.dispose(); await saving;
  expect(writeSignal.aborted).toBe(true); expect(apply).not.toHaveBeenCalled(); expect(status).not.toHaveBeenCalled();
});
it('saves only after changes and preserves remote settings when a revision conflicts', async () => {
  let external = stored;
  const fetcher = vi.fn().mockImplementation(async (_url, options) => {
    if (options.method !== 'POST') return new Response(JSON.stringify(state(external)));
    if (external === stored) { external = { ...stored, config: { ...stored.config, mode: 'vinyl' } }; return new Response('{}', { status: 409 }); }
    const body = JSON.parse(options.body); return new Response(JSON.stringify(state(body.settings, 'b'.repeat(64))));
  }); vi.stubGlobal('fetch', fetcher);
  const { sync, apply } = create(); await sync.cycle();
  sync.changed({ ...stored, config: { ...stored.config, lyricStyle: 'minimal' } });
  await sync.cycle(); await sync.cycle();
  const saved = JSON.parse(fetcher.mock.calls[3][1].body).settings;
  expect(saved.config.mode).toBe('vinyl'); expect(saved.config.lyricStyle).toBe('minimal'); expect(saved.config.casing).toBe('beige');
  expect(apply).toHaveBeenLastCalledWith(saved); sync.dispose();
});
it('retries offline edits without replacing them with an older saved file', async () => {
  const fetcher = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(new Response(JSON.stringify(state()))).mockImplementation(async (_url, options) => new Response(JSON.stringify(state(JSON.parse(options.body).settings, 'b'.repeat(64))))); vi.stubGlobal('fetch', fetcher);
  const { sync } = create(); sync.changed({ ...initial, config: { ...defaults, lyricStyle: 'minimal' } });
  await sync.cycle(); await sync.cycle();
  const saved = JSON.parse(fetcher.mock.calls[2][1].body).settings;
  expect(saved.config.lyricStyle).toBe('minimal'); expect(saved.config.casing).toBe('beige'); sync.dispose();
});

it('a competing first-run writer wins over migration defaults', async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(state(initial, '')))).mockResolvedValueOnce(new Response('{}', { status: 409 })).mockResolvedValueOnce(new Response(JSON.stringify(state(stored)))); vi.stubGlobal('fetch', fetcher);
  const { sync, apply } = create(); await sync.cycle(); await sync.cycle();
  expect(apply).toHaveBeenLastCalledWith(stored); expect(fetcher).toHaveBeenCalledTimes(3); sync.dispose();
});
