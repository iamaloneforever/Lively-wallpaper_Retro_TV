import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from '../source-snapshot.mjs';

const collector = fileURLToPath(new URL('../windows-licenses.mjs', import.meta.url));
for (const layout of ['nuget', 'sdk', 'sdk-with-stale-cache']) {
  test(`Windows license collection follows MSBuild's ${layout} native host`, () => {
    const directory = mkdtempSync(join(tmpdir(), 'retrowave-host-test-'));
    const version = '10.0.13', coreName = 'Microsoft.NETCore.App.Runtime.win-x64', hostName = 'Microsoft.NETCore.App.Host.win-x64';
    const cache = join(directory, 'nuget'), core = join(cache, coreName.toLowerCase(), version);
    const cachedHost = join(cache, hostName.toLowerCase(), version);
    const host = layout === 'nuget' ? cachedHost : join(directory, 'installed-sdk', 'packs', hostName, version);
    const hostPath = join(host, 'runtimes', 'win-x64', 'native', 'singlefilehost.exe');
    function write(path, contents) { mkdirSync(join(path, '..'), { recursive: true }); writeFileSync(path, contents); }
    try {
      write(join(core, 'System.Private.CoreLib.dll'), 'runtime binary');
      write(join(core, 'LICENSE.TXT'), 'complete runtime license fixture');
      write(join(core, 'THIRD-PARTY-NOTICES.TXT'), 'complete runtime notices fixture');
      write(hostPath, 'MSBuild-selected native host');
      if (layout === 'nuget') {
        write(join(host, 'LICENSE.TXT'), 'complete host license fixture');
        write(join(host, 'THIRD-PARTY-NOTICES.TXT'), 'complete host notices fixture');
      }
      if (layout === 'sdk-with-stale-cache') write(join(cachedHost, 'runtimes', 'win-x64', 'native', 'singlefilehost.exe'), 'unselected cached host');
      const resolved = { Properties: { NuGetPackageRoot: cache, SingleFileHostSourcePath: hostPath }, Items: {
        ReferenceCopyLocalPaths: [{ Identity: join(core, 'System.Private.CoreLib.dll'), NuGetPackageId: coreName, NuGetPackageVersion: version }],
        ResolvedSingleFileHostPack: [{ Path: hostPath, PackageDirectory: host, PathInPackage: join('runtimes', 'win-x64', 'native', 'singlefilehost.exe'), ...(layout === 'nuget' ? { NuGetPackageId: hostName, NuGetPackageVersion: version } : {}) }],
      } };
      const input = join(directory, 'resolved.json'), output = join(directory, 'output', 'licenses');
      write(input, JSON.stringify(resolved));
      execFileSync(process.execPath, [collector, input, output], { stdio: 'pipe' });
      const inventory = JSON.parse(readFileSync(join(output, 'inventory.json'), 'utf8'));
      const native = inventory.find(pkg => pkg.name === hostName);
      assert.equal(native.version, version);
      assert.equal(native.files[0].sha256, sha256(readFileSync(hostPath)), 'Inventory the selected host, never an inferred cache file');
      const source = layout === 'nuget' ? host : core;
      for (const name of ['LICENSE.TXT', 'THIRD-PARTY-NOTICES.TXT']) {
        const material = native.licenses.find(file => file.endsWith('-' + name));
        assert(material, `Complete ${name} is referenced for the native host`);
        assert.deepEqual(readFileSync(join(output, material)), readFileSync(join(source, name)));
      }
      assert(readFileSync(join(directory, 'output', 'licenses.zip')).length > 0);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
}
