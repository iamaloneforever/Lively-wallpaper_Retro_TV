import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { dirname, resolve, basename } from 'node:path';
import { sha256, sourceSnapshot, buildInfo } from './source-snapshot.mjs';

export const legalBanner = '/*! Spicy Bond combined wallpaper: AGPL-3.0. Includes Spicy Lyrics by Spikerko and contributors, upstream 0ecf3925aac0e9b76b9095ee23b6d5118d9a18cc; spring port Copyright (c) Fraktality, MIT. Independently authored Spicy Bond code: MIT. Full licenses, modification notice and corresponding source: licenses/index.html (relative to wallpaper URL). */';
const text = path => readFileSync(path, 'utf8');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

function packageFor(path) {
  if (!path.includes('node_modules')) return null;
  let dir = dirname(realpathSync(path));
  while (!existsSync(resolve(dir, 'package.json'))) {
    if (dirname(dir) === dir) throw new Error(`No package for ${path}`);
    dir = dirname(dir);
  }
  return { dir, ...JSON.parse(text(resolve(dir, 'package.json'))) };
}

export function webLicenseFiles(info, modules) {
  const inputs = new Set(modules);
  // Spicy is prebundled by esbuild. Its output attribution must use that build's
  // module graph too, not the list of top-level production or dev dependencies.
  const meta = JSON.parse(text('.build/spicy-metafile.json'));
  for (const output of Object.values(meta.outputs)) for (const [path, input] of Object.entries(output.inputs)) if (input.bytesInOutput > 0) inputs.add(resolve(path));
  const packages = new Map();
  for (const input of inputs) {
    const pkg = packageFor(input);
    if (!pkg) continue;
    const key = `${pkg.name}@${pkg.version}`;
    if (!packages.has(key)) packages.set(key, { ...pkg, inputs: [], notices: new Set() });
    const item = packages.get(key); item.inputs.push(input);
    // Includes the Microsoft permissive helper notice embedded in SimpleBar's
    // published JS, in addition to the package-level MIT license.
    for (const comment of text(input).match(/\/\*[\s\S]*?\*\//g) || []) if (/copyright|licen[sc]e|SPDX-/i.test(comment)) item.notices.add(comment);
  }
  const files = new Map([
    ['AGPL-3.0.txt', readFileSync('LICENSE')], ['SpicyBond-MIT.txt', readFileSync('LICENSE-MIT')],
    ['Spicy-AGPL-3.0.txt', readFileSync('wallpaper/vendor/spicy-lyrics/LICENSE')],
    ['spr-MIT.txt', readFileSync('licenses/spr-MIT.txt')],
    ['SPICY-MODIFICATIONS.md', readFileSync('licenses/SPICY-MODIFICATIONS.md')],
    ['THIRD_PARTY_NOTICES.md', readFileSync('THIRD_PARTY_NOTICES.md')],
    ['Spicy-UPSTREAM.json', readFileSync('wallpaper/vendor/spicy-lyrics/UPSTREAM.json')],
  ]);
  const inventory = [];
  for (const [key, pkg] of [...packages].sort()) {
    const license = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license.md'].find(name => existsSync(resolve(pkg.dir, name)));
    if (!license) throw new Error(`Missing complete license for distributed ${key}`);
    const file = `${pkg.name.replaceAll('/', '_').replaceAll('@', '')}-${pkg.version}.txt`;
    const original = readFileSync(resolve(pkg.dir, license));
    files.set(file, original);
    const notices = `${file}.notices.txt`;
    files.set(notices, Buffer.from([...pkg.notices].join('\n\n') + '\n'));
    inventory.push({ name: pkg.name, version: pkg.version, license: pkg.license, file, sha256: sha256(original), notices,
      inputs: [...new Set(pkg.inputs)].map(path => { const normalized = path.replaceAll('\\', '/'); return normalized.slice(normalized.lastIndexOf('/node_modules/') + 14); }).sort() });
  }
  const snapshot = sourceSnapshot();
  files.set('source.zip', snapshot.archive);
  files.set('source-manifest.json', Buffer.from(JSON.stringify(snapshot.manifest, null, 2) + '\n'));
  files.set('build-info.json', Buffer.from(JSON.stringify({ ...info, sourceSha256: sha256(snapshot.archive) }, null, 2) + '\n'));
  files.set('dependencies.json', Buffer.from(JSON.stringify(inventory, null, 2) + '\n'));
  const version = info.commit ? `Build commit: <a href="${info.sourceTree}">${info.commit}</a>. <a href="${info.upstreamArchive}">GitHub source archive for this commit</a>.` : 'Development build: local changes or a development server. The base commit is not claimed as the exact source. The local archive captures the build inputs at snapshot time.';
  const links = [...files.keys()].filter(name => name !== 'source.zip').map(name => `<li><a href="${name}">${escape(name)}</a></li>`).join('\n');
  files.set('index.html', Buffer.from(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Spicy Bond — Source and licenses</title><style>body{font:1rem/1.6 system-ui;max-width:75ch;margin:2rem auto;padding:0 1rem}a{color:#075b99}pre{white-space:pre-wrap}a:focus-visible{outline:3px solid #075b99}</style><main><h1>Source and licenses</h1><p>The combined Spicy Bond wallpaper is licensed under AGPL-3.0, without warranty. Independently authored Spicy Bond code retains its MIT grant. Third-party code retains its original terms. The separately installed native companion is MIT; this does not apply to the combined wallpaper.</p><p>${version}</p><p><a href="source.zip" download>Download complete corresponding source snapshot</a> — includes wallpaper, vendored renderer, host adapters, companion, build scripts, workflows, licenses and lockfiles. No account required.</p><h2>Spicy Bond modifications to Spicy — 2026-10-15</h2><pre>${escape(text('licenses/SPICY-MODIFICATIONS.md'))}</pre><h2>Shipped license materials</h2><ul>${links}</ul><h2>Bundled dependency versions</h2><ul>${inventory.map(pkg => `<li>${escape(pkg.name)} ${pkg.version}: <a href="${pkg.file}">${escape(pkg.license)}</a>; <a href="${pkg.notices}">retained source notices</a></li>`).join('')}</ul><p><a href="../">Return to wallpaper</a></p></main></html>`));
  return files;
}

export function webLicenses(info) {
  return { name: 'spicy-bond-distribution-licenses',
    generateBundle(_options, bundle) {
      if (info.mode === 'commit' && buildInfo().commit !== info.commit) throw new Error('Source changed during the build. Rebuild before distribution.');
      const modules = Object.values(bundle).filter(item => item.type === 'chunk').flatMap(item => Object.keys(item.modules).filter(path => !path.startsWith('\0') && existsSync(path)));
      for (const [name, source] of webLicenseFiles(info, modules)) this.emitFile({ type: 'asset', fileName: `licenses/${name}`, source });
      this.emitFile({ type: 'asset', fileName: 'LivelyInfo.json', source: readFileSync('lively/LivelyInfo.json') });
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const marker = '/licenses/'; const at = request.url?.indexOf(marker) ?? -1;
        if (at < 0) return next();
        const name = request.url.slice(at + marker.length).split('?')[0] || 'index.html';
        // Dev source changes are not an exact committed release. Generate each
        // requested snapshot from the current local source, without a commit claim.
        const modules = [realpathSync('node_modules/three/src/Three.js')];
        const data = webLicenseFiles(info, modules).get(name);
        if (!data) return next();
        response.setHeader('Content-Type', basename(name).endsWith('.html') ? 'text/html; charset=utf-8' : name.endsWith('.zip') ? 'application/zip' : 'text/plain; charset=utf-8');
        response.end(data);
      });
    },
  };
}
