import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { brand, brandMetadata } from '../brand.mjs';

test('wallpaper and showcase identity follows the configured repository base', () => {
  for (const base of ['/', '/Spicy-Bond/', '/Lively-wallpaper_Retro_TV/']) {
    const transform = brandMetadata(base).transformIndexHtml.handler;
    const html = transform('<title>%BRAND_NAME% — %BRAND_TAGLINE%</title><meta content="%BRAND_COVER%"><a href="%BRAND_REPOSITORY%">Windows</a>');
    assert(html.includes(`<title>${brand.name} — ${brand.tagline}</title>`));
    assert(html.includes(`${brand.pagesOrigin}${base}brand/cover.png`));
    assert(html.includes(brand.repository));
    assert(!html.includes('%BRAND_'));
    assert.throws(() => transform('%BRAND_UNKNOWN%'), /Unknown brand metadata/);
  }
});

test('branding and embedded resources survive a Windows-style Git checkout without accepting stale metadata', () => {
  const directory = mkdtempSync(join(tmpdir(), 'spicy-bond-crlf-'));
  const source = join(directory, 'source'), checkout = join(directory, 'checkout');
  const native = 'companion/src/SpicyBond.Companion';
  const git = (cwd, ...args) => execFileSync('git', args, { cwd, stdio: 'pipe' });
  const check = script => execFileSync(process.execPath, [`scripts/${script}.mjs`, '--check'], { cwd: checkout, stdio: 'pipe' });
  try {
    mkdirSync(source);
    const paths = [
      '.gitattributes', 'branding.json', 'package.json', 'lively/LivelyInfo.json',
      'licenses/windows/dotnet-windows-license-information.md', 'wallpaper/vendor/spicy-lyrics/src/modules/Spring.ts',
      'scripts/brand.mjs', 'scripts/sync-branding.mjs', 'scripts/build-branding.mjs',
      'wallpaper/public/brand/logo.svg', 'wallpaper/public/brand/mark.svg', 'docs/brand/logo.svg', 'docs/brand/mark.svg',
      `${native}/Branding.g.cs`, `${native}/Branding.props`, `${native}/SpicyBond.Companion.csproj`,
      ...['SpicyBond.svg', 'SpicyBond.ico', 'SpicyBond.manifest', 'SpicyBond.res'].map(file => `${native}/Assets/${file}`),
    ];
    for (const path of paths) {
      const target = join(source, path); mkdirSync(dirname(target), { recursive: true }); cpSync(path, target);
    }
    git(source, 'init'); git(source, 'add', '.');
    git(source, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'commit', '-m', 'Branding fixture');
    git(directory, 'clone', '--config', 'core.autocrlf=true', source, checkout);
    // Confirm the fixture really applied Windows conversion to ordinary text.
    assert(readFileSync(join(checkout, native, 'SpicyBond.Companion.csproj'), 'utf8').includes('\r\n'));
    for (const path of [`${native}/Branding.g.cs`, `${native}/Branding.props`, `${native}/Assets/SpicyBond.manifest`]) {
      assert(!readFileSync(join(checkout, path), 'utf8').includes('\r'), `Canonical LF for ${path}`);
    }
    for (const path of ['licenses/windows/dotnet-windows-license-information.md', 'wallpaper/vendor/spicy-lyrics/src/modules/Spring.ts']) {
      assert.deepEqual(readFileSync(join(checkout, path)), readFileSync(path), `Original third-party bytes for ${path}`);
    }
    check('sync-branding'); check('build-branding');
    const generated = join(checkout, native, 'Branding.g.cs');
    writeFileSync(generated, readFileSync(generated, 'utf8').replace('Spicy Bond', 'Stale Brand'));
    assert.throws(() => check('sync-branding'), /out of date/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
