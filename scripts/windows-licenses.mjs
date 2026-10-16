import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join, basename, dirname } from 'node:path';
import { storedZip, sha256 } from './source-snapshot.mjs';

const [resolvedPath, outputDirectory] = process.argv.slice(2);
const resolved = JSON.parse(readFileSync(resolvedPath, 'utf8').replace(/^\uFEFF/, ''));
const assets = new Map();
// ReferenceCopyLocalPaths contains the conflict winners (e.g. WPF WindowsBase,
// rather than the .NET facade). DropFromSingleFile files are excluded by the SDK;
// the native runtime in a single-file build is supplied by singlefilehost.exe.
for (const item of resolved.Items.ReferenceCopyLocalPaths.filter(item => item.DropFromSingleFile !== 'true')) {
  if (!item.NuGetPackageId) throw new Error(`Unattributed redistributed input: ${item.Identity}`);
  assets.set(item.Identity, item);
}
const packages = new Map();
for (const item of assets.values()) {
  const name = item.NuGetPackageId, version = item.NuGetPackageVersion;
  if (!packages.has(name)) packages.set(name, { name, version, files: [], licenses: [] });
  packages.get(name).files.push({ path: basename(item.Identity), sha256: sha256(readFileSync(item.Identity)) });
}
// MSBuild can select a host installed with the SDK instead of a NuGet cache
// entry. Inventory the actual selected binary and its resolved pack metadata.
const core = [...packages.values()].find(pkg => pkg.name.startsWith('Microsoft.NETCore.App.Runtime.'));
if (!core) throw new Error('Missing self-contained .NET runtime inventory');
const hostPacks = resolved.Items.ResolvedSingleFileHostPack || [];
const hostPack = hostPacks[0], hostPath = resolved.Properties.SingleFileHostSourcePath;
if (hostPacks.length !== 1 || !hostPath || !hostPack.Path || !hostPack.PackageDirectory || !hostPack.PathInPackage || resolve(hostPath) !== resolve(hostPack.Path) || resolve(hostPack.PackageDirectory, hostPack.PathInPackage) !== resolve(hostPath)) throw new Error('Missing or inconsistent MSBuild single-file host resolution');
// SDK-installed packs omit NuGet identity fields. Their resolved pack directory
// carries the actual package name/version selected by the SDK.
const hostDirectory = resolve(hostPack.PackageDirectory);
const host = { name: hostPack.NuGetPackageId || basename(dirname(hostDirectory)), version: hostPack.NuGetPackageVersion || basename(hostDirectory), files: [], licenses: [] };
if (host.name !== core.name.replace('.Runtime.', '.Host.')) throw new Error('Native host does not match the selected runtime');
host.files.push({ path: 'singlefilehost.exe (executable host template)', sha256: sha256(readFileSync(hostPath)) }); packages.set(host.name, host);
const materials = new Map([['SpicyBond-MIT.txt', readFileSync('LICENSE-MIT')]]);
for (const name of readdirSync('licenses/windows')) materials.set(name, readFileSync(join('licenses/windows', name)));
for (const pkg of packages.values()) {
  const expected = pkg.name === 'Microsoft.Windows.SDK.NET.Ref' ? '10.0.19041.57' : '10.0.13';
  if (pkg.version !== expected) throw new Error(`Review Windows licenses for ${pkg.name} ${pkg.version} before release`);
  const directory = pkg === host ? hostPack.PackageDirectory : join(resolved.Properties.NuGetPackageRoot, pkg.name.toLowerCase(), pkg.version);
  const names = directory && existsSync(directory) ? readdirSync(directory).filter(name => /^(license|third.?party.?notices)(\..*)?$/i.test(name)) : [];
  for (const name of names) {
    const file = `${pkg.name}-${pkg.version}-${name}`;
    materials.set(file, readFileSync(join(directory, name))); pkg.licenses.push(file);
  }
  if (pkg === host && !pkg.licenses.length) {
    // SDK-installed host packs omit package license files. For the reviewed
    // 10.0.13 Windows host/runtime, both full texts are byte-identical in their
    // published packages. Reuse those shipped texts rather than SDK-wide notices.
    if (host.version !== core.version || !core.licenses.some(file => /-LICENSE\.TXT$/i.test(file)) || !core.licenses.some(file => /-THIRD-PARTY-NOTICES\.TXT$/i.test(file))) throw new Error('Missing reviewed native host license materials');
    pkg.licenses.push(...core.licenses);
  }
  if (pkg.name === 'Microsoft.Windows.SDK.NET.Ref') pkg.licenses.push('WINDOWS-SDK-LICENSE.txt', 'CsWinRT-MIT.txt');
  if (!pkg.licenses.length) throw new Error(`Missing license for ${pkg.name}`);
}
const safe = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
materials.set('inventory.json', Buffer.from(JSON.stringify([...packages.values()], null, 2) + '\n'));
const links = [...materials.keys()].map(name => `<li><a href="${name}">${safe(name)}</a></li>`).join('\n');
materials.set('index.html', Buffer.from(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Spicy Bond companion licenses</title><style>body{font:1rem/1.6 system-ui;max-width:75ch;margin:2rem auto;padding:0 1rem}a{color:#075b99}</style><main><h1>Spicy Bond companion licenses</h1><p>Copyright © 2026 Spicy Bond contributors. The independently authored native companion is MIT licensed, without warranty. It contains no Spicy renderer code. The combined web wallpaper is AGPL-3.0 and its complete source and licenses are accessible from the running wallpaper's Source and licenses entry.</p><p>This self-contained Windows distribution also includes Microsoft .NET, WPF and Windows projection binaries, under their respective terms, including the Microsoft .NET Library and Windows SDK licenses. The companion's MIT grant does not relicense those components. By using or redistributing those components, you must comply with their applicable terms; please read the complete materials below before installing or redistributing.</p><p>Extract these materials without installation: <code>SpicyBond-Setup.exe --licenses --licenses-dir C:\\path\\to\\licenses</code>. Open them from setup's Licenses button or the installed application's About page.</p><ul>${links}</ul></main></html>`));
const manifest = [...materials].map(([file, data]) => ({ file, sha256: sha256(data), size: data.length }));
materials.set('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2) + '\n'));
mkdirSync(outputDirectory, { recursive: true });
for (const [file, data] of materials) writeFileSync(resolve(outputDirectory, file), data);
writeFileSync(resolve(outputDirectory, '../licenses.zip'), storedZip([...materials].map(([path, data]) => ({ path, data }))));
console.log(`Packaged ${materials.size} license materials for ${packages.size} redistributed Windows components.`);
