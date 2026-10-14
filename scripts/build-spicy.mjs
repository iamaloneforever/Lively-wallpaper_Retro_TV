import { build } from 'esbuild';
import { resolve, relative, dirname } from 'node:path';
const vendor = resolve('wallpaper/vendor/spicy-lyrics/src');
const host = resolve('wallpaper/vendor/spicy-host');
const aliases = {
  'utils/stores': 'stores', 'utils/uiState': 'stores', 'utils/Logger': 'ui', 'utils/Addons': 'ui',
  'utils/Lyrics/fetchLyrics': 'fetch', 'utils/Lyrics/LyricsSkeleton': 'ui', 'utils/Lyrics/Applyer/Credits/ApplyIsByCommunity': 'ui',
  'components/Global/Global': 'global', 'components/Global/SpotifyPlayer': 'player', 'components/Pages/PageView': 'page',
  'components/Utils/CompactMode': 'ui', 'components/Utils/PopupLyrics': 'ui',
};
await build({ entryPoints: [resolve(host, 'entry.mjs')], outfile: 'wallpaper/src/vendor/SpicyRenderer.mjs', bundle: true, format: 'esm', target: 'es2022', minify: false,
  banner: { js: '/* Spicy Lyrics renderer, upstream 0ecf3925aac0e9b76b9095ee23b6d5118d9a18cc. AGPL-3.0; full source and license in wallpaper/vendor/spicy-lyrics. */' },
  plugins: [{ name: 'wallpaper-host-boundaries', setup(builder) { builder.onResolve({ filter: /^\./ }, args => {
    const path = relative(vendor, resolve(dirname(args.importer), args.path)).replaceAll('\\', '/').replace(/\.[^.]+$/, '');
    if (aliases[path]) return { path: resolve(host, aliases[path] + '.mjs') };
  }); } }],
});
