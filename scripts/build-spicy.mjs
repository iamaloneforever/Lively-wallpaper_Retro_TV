import { build } from 'esbuild';
import { resolve, relative, dirname } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { legalBanner } from './web-licenses.mjs';
const vendor = resolve('wallpaper/vendor/spicy-lyrics/src');
const host = resolve('wallpaper/vendor/spicy-host');
const aliases = {
  'utils/stores': 'stores', 'utils/uiState': 'stores', 'utils/Logger': 'ui', 'utils/Addons': 'ui',
  'utils/Lyrics/fetchLyrics': 'fetch', 'utils/Lyrics/LyricsSkeleton': 'ui', 'utils/Lyrics/Applyer/Credits/ApplyIsByCommunity': 'ui',
  'components/Global/Global': 'global', 'components/Global/SpotifyPlayer': 'player', 'components/Pages/PageView': 'page',
  'components/Utils/CompactMode': 'ui', 'components/Utils/PopupLyrics': 'ui',
};
const result = await build({ entryPoints: [resolve(host, 'entry.mjs')], outfile: 'wallpaper/src/vendor/SpicyRenderer.mjs', bundle: true, format: 'esm', target: 'es2022', minify: false, metafile: true, legalComments: 'inline',
  banner: { js: legalBanner },
  plugins: [{ name: 'wallpaper-host-boundaries', setup(builder) { builder.onResolve({ filter: /^\./ }, args => {
    const path = relative(vendor, resolve(dirname(args.importer), args.path)).replaceAll('\\', '/').replace(/\.[^.]+$/, '');
    if (aliases[path]) return { path: resolve(host, aliases[path] + '.mjs') };
  }); } }],
});
mkdirSync('.build', { recursive: true });
writeFileSync('.build/spicy-metafile.json', JSON.stringify(result.metafile, null, 2));
