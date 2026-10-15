import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { crc32 } from 'node:zlib';
import { legalBanner } from './web-licenses.mjs';
import { repository, sha256, sourceSnapshot } from './source-snapshot.mjs';

export function readStoredZip(data) {
  const entries = new Map(); let offset = 0;
  while (data.readUInt32LE(offset) === 0x04034b50) {
    assert.equal(data.readUInt16LE(offset + 8), 0, 'Expected stored ZIP entries');
    const size = data.readUInt32LE(offset + 18), nameLength = data.readUInt16LE(offset + 26), extra = data.readUInt16LE(offset + 28);
    const name = data.subarray(offset + 30, offset + 30 + nameLength).toString();
    const start = offset + 30 + nameLength + extra, bytes = data.subarray(start, start + size);
    assert.equal(crc32(bytes), data.readUInt32LE(offset + 14), `ZIP CRC ${name}`);
    assert(!entries.has(name), `Duplicate ZIP path ${name}`); entries.set(name, bytes); offset = start + size;
  }
  assert.equal(data.readUInt32LE(offset), 0x02014b50, 'ZIP directory is missing');
  return entries;
}

export function checkWeb(directory = 'dist', base = process.env.VITE_BASE_PATH || '/Lively-wallpaper_Retro_TV/') {
  const legal = join(directory, 'licenses'), read = name => readFileSync(join(legal, name));
  const index = read('index.html').toString();
  for (const [file, original] of [['AGPL-3.0.txt', 'LICENSE'], ['RetroWave-MIT.txt', 'LICENSE-MIT'], ['Spicy-AGPL-3.0.txt', 'wallpaper/vendor/spicy-lyrics/LICENSE'], ['spr-MIT.txt', 'licenses/spr-MIT.txt'], ['SPICY-MODIFICATIONS.md', 'licenses/SPICY-MODIFICATIONS.md'], ['Spicy-UPSTREAM.json', 'wallpaper/vendor/spicy-lyrics/UPSTREAM.json'], ['THIRD_PARTY_NOTICES.md', 'THIRD_PARTY_NOTICES.md']]) assert.deepEqual(read(file), readFileSync(original), `Complete ${file}`);
  const inventory = JSON.parse(read('dependencies.json'));
  assert.deepEqual(inventory.map(pkg => `${pkg.name}@${pkg.version}`).sort(), ['@tanstack/virtual-core@3.16.0', 'cubic-spline@3.0.3', 'd3-ease@3.0.1', 'lodash-es@4.18.1', 'simplebar-core@1.3.2', 'simplebar@6.3.3', 'three@0.180.0'].sort(), 'Review actual distributed dependency/version changes');
  for (const pkg of inventory) {
    assert.equal(sha256(read(pkg.file)), pkg.sha256, `Complete ${pkg.name} text`);
    // Independent comparison to the frozen installed package, not just generated hashes.
    const store = readdirSync('node_modules/.pnpm').find(name => name === `${pkg.name.replace('/', '+')}@${pkg.version}`);
    assert(store, `Installed version for ${pkg.name}`);
    const root = join('node_modules/.pnpm', store, 'node_modules', pkg.name);
    const original = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license.md'].find(name => existsSync(join(root, name)));
    assert(original); assert.deepEqual(read(pkg.file), readFileSync(join(root, original)), `Original copyright and terms for ${pkg.name}`);
    read(pkg.notices);
  }
  assert.match(read('d3-ease-3.0.1.txt').toString(), /Copyright 2001 Robert Penner/);
  assert.match(read('d3-ease-3.0.1.txt').toString(), /Copyright 2010-2021 Mike Bostock/);
  assert.match(read('simplebar-core-1.3.2.txt.notices.txt').toString(), /Copyright \(c\) Microsoft Corporation[\s\S]*Permission to use, copy, modify/);
  const info = JSON.parse(read('build-info.json'));
  const archive = read('source.zip'); assert.equal(sha256(archive), info.sourceSha256, 'Source snapshot hash');
  assert.deepEqual(archive, sourceSnapshot().archive, 'Shipped corresponding source matches the actual build tree');
  const entries = readStoredZip(archive), manifest = JSON.parse(read('source-manifest.json'));
  assert.equal(entries.size, manifest.length);
  for (const file of manifest) assert.equal(sha256(entries.get(`RetroWave-source/${file.path}`)), file.sha256, `Actual archived source ${file.path}`);
  for (const file of ['package.json', 'pnpm-lock.yaml', 'global.json', 'scripts/build-spicy.mjs', 'scripts/build-windows.ps1', 'scripts/web-licenses.mjs', 'vite.config.ts', '.github/workflows/pages.yml', 'wallpaper/vendor/spicy-host/entry.mjs', 'wallpaper/vendor/spicy-lyrics/UPSTREAM.json', 'wallpaper/vendor/spicy-lyrics/src/modules/Spring.ts', 'LICENSE', 'LICENSE-MIT']) assert(entries.has(`RetroWave-source/${file}`), `Complete corresponding source includes ${file}`);
  for (const match of index.matchAll(/href="([^"]+)"/g)) {
    const url = new URL(match[1], `https://example.invalid${base}licenses/`);
    if (url.origin !== 'https://example.invalid' || url.pathname === base) continue;
    assert(url.pathname.startsWith(base), `Repository base path for ${url}`);
    assert(existsSync(join(directory, decodeURIComponent(url.pathname.slice(base.length)))), `Working license/source link ${url}`);
  }
  const scripts = readdirSync(join(directory, 'assets')).filter(name => name.endsWith('.js'));
  assert(scripts.length >= 2, 'Main application and lazy lyric renderer');
  const built = scripts.map(name => readFileSync(join(directory, 'assets', name), 'utf8'));
  for (const js of built) assert(js.includes(legalBanner), 'Retained legal banner in every final JS chunk');
  assert(built.some(js => js.includes(`${base}licenses/`)), 'Running wallpaper links to shipped materials under repository base');
  if (info.mode === 'commit') {
    assert.match(info.commit, /^[0-9a-f]{40}$/);
    assert.equal(info.sourceTree, `${repository}/tree/${info.commit}`);
    assert.equal(info.upstreamArchive, `${repository}/archive/${info.commit}.zip`);
    assert(index.includes(info.sourceTree) && index.includes(info.upstreamArchive));
    assert(built.some(js => js.includes(info.commit) && js.includes(info.sourceTree) && js.includes(info.upstreamArchive)), 'Runtime identifies exact build commit and immutable source archive');
  } else {
    assert.equal(info.mode, 'development'); assert.equal(info.commit, null); assert.equal(info.sourceTree, null); assert.equal(info.upstreamArchive, null);
    assert(index.includes('Development build') && built.some(js => js.includes('no exact commit is claimed')), 'Honest development source labeling');
  }
  assert(index.includes('RetroWave modifications to Spicy — 2026-10-15'));
  assert.equal(JSON.parse(readFileSync(join(directory, 'LivelyInfo.json'))).License, 'AGPL-3.0', 'Packaged Lively metadata');
  console.log(`PASS final web artifact: ${inventory.length} bundled packages, complete license texts/banners, ${manifest.length} source files, ${info.mode} identity, base-path links and AGPL metadata`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) checkWeb(process.argv[2]);
