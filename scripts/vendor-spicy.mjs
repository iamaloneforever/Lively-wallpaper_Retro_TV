import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, resolve, relative, extname } from 'node:path';
import { createHash } from 'node:crypto';
const source = resolve(process.argv[2]);
const target = resolve('wallpaper/vendor/spicy-lyrics');
const boundaries = new Set(['utils/stores', 'utils/uiState', 'utils/Logger', 'utils/Addons', 'utils/Lyrics/fetchLyrics', 'utils/Lyrics/LyricsSkeleton', 'utils/Lyrics/Applyer/Credits/ApplyIsByCommunity', 'components/Global/Global', 'components/Global/SpotifyPlayer', 'components/Pages/PageView', 'components/Utils/CompactMode', 'components/Utils/PopupLyrics']);
const manifest = [];
function copy(path) {
  if (manifest.some(item => item.path === path)) return;
  const data = readFileSync(resolve(source, path));
  mkdirSync(dirname(resolve(target, path)), { recursive: true }); copyFileSync(resolve(source, path), resolve(target, path));
  manifest.push({ path, sha256: createHash('sha256').update(data).digest('hex') });
  if (!/\.[cm]?[jt]sx?$/.test(path)) return;
  for (const match of data.toString().matchAll(/(?:from\s+|import\s*)["'](\.[^"']+)["']/g)) {
    let dependency = relative(source, resolve(source, dirname(path), match[1])).replaceAll('\\', '/');
    if (boundaries.has(dependency.replace(/^src\//, '').replace(/\.[^.]+$/, ''))) continue;
    if (!extname(dependency)) dependency += '.ts';
    copy(dependency);
  }
}
for (const path of ['src/utils/EventManager.ts', 'src/utils/Lyrics/Applyer/Synced/Syllable.ts', 'src/utils/Lyrics/Applyer/Synced/Line.ts', 'src/utils/Lyrics/Applyer/Static.ts', 'src/utils/Lyrics/Animator/Main.ts', 'src/utils/Scrolling/ScrollToActiveLine.ts', 'src/css/Lyrics/main.css', 'src/css/Lyrics/Mixed.css', 'src/css/Simplebar.css', 'LICENSE']) copy(path);
writeFileSync(resolve(target, 'UPSTREAM.json'), JSON.stringify({ repository: 'https://github.com/Spikerko/spicy-lyrics', commit: '0ecf3925aac0e9b76b9095ee23b6d5118d9a18cc', license: 'AGPL-3.0', hostBoundaries: [...boundaries], files: manifest }, null, 2) + '\n');
console.log(`Vendored ${manifest.length} complete upstream files.`);
