import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildInfo, sourceSnapshot } from '../source-snapshot.mjs';
import { readStoredZip, checkWeb } from '../check-web.mjs';

test('clean releases identify the exact commit; dirty and live builds do not', () => {
  const directory = mkdtempSync(join(tmpdir(), 'spicy-bond-source-test-'));
  const git = (...args) => execFileSync('git', args, { cwd: directory, stdio: 'pipe' });
  const previousRelease = process.env.SPICY_BOND_RELEASE; delete process.env.SPICY_BOND_RELEASE;
  try {
    git('init'); git('config', 'user.name', 'Test'); git('config', 'user.email', 'test@example.invalid');
    writeFileSync(join(directory, 'source.txt'), 'committed'); git('add', '.'); git('commit', '-m', 'fixture');
    const info = buildInfo(false, directory);
    assert.equal(info.mode, 'commit'); assert.equal(info.commit, git('rev-parse', 'HEAD').toString().trim());
    assert.equal(buildInfo(true, directory).commit, null);
    writeFileSync(join(directory, 'source.txt'), 'local changes'); writeFileSync(join(directory, 'adapter.txt'), 'new adapter');
    const dirty = buildInfo(false, directory); assert.equal(dirty.commit, null); assert.equal(dirty.sourceTree, null); assert.equal(dirty.mode, 'development');
    const snapshot = readStoredZip(sourceSnapshot(directory).archive);
    assert.equal(snapshot.get('SpicyBond-source/source.txt').toString(), 'local changes');
    assert.equal(snapshot.get('SpicyBond-source/adapter.txt').toString(), 'new adapter');
    rmSync(join(directory, 'source.txt'));
    assert(!readStoredZip(sourceSnapshot(directory).archive).has('SpicyBond-source/source.txt'), 'Development snapshot respects local deletions');
    process.env.SPICY_BOND_RELEASE = '1'; assert.throws(() => buildInfo(false, directory), /clean Git checkout/);
  } finally { if (previousRelease === undefined) delete process.env.SPICY_BOND_RELEASE; else process.env.SPICY_BOND_RELEASE = previousRelease; rmSync(directory, { recursive: true, force: true }); }
});

test('final-output check rejects truncated licenses, removed banners and false source identity', () => {
  const directory = mkdtempSync(join(tmpdir(), 'spicy-bond-output-test-'));
  try {
    cpSync('dist', directory, { recursive: true }); checkWeb(directory);
    const file = join(directory, 'licenses/d3-ease-3.0.1.txt'), full = readFileSync(file);
    writeFileSync(file, 'BSD-3-Clause'); assert.throws(() => checkWeb(directory), /Complete d3-ease/); writeFileSync(file, full);
    const infoPath = join(directory, 'licenses/build-info.json'), original = readFileSync(infoPath), info = JSON.parse(original);
    info.mode = 'development'; info.commit = '0'.repeat(40); writeFileSync(infoPath, JSON.stringify(info)); assert.throws(() => checkWeb(directory)); writeFileSync(infoPath, original);
    const entry = readFileSync(join(directory, 'index.html'), 'utf8').match(/src="[^"]*\/assets\/([^\"]+\.js)"/)[1];
    const jsPath = join(directory, 'assets', entry), js = readFileSync(jsPath, 'utf8');
    writeFileSync(jsPath, js.replace(/\/\*! Spicy Bond combined wallpaper:[\s\S]*?\*\//g, ''));
    assert.throws(() => checkWeb(directory), /Retained legal banner/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('exported source without Git is rebuildable and does not borrow a parent repository commit', () => {
  const directory = mkdtempSync(join(tmpdir(), 'spicy-bond-export-test-'));
  try {
    writeFileSync(join(directory, 'adapter.ts'), 'export const adapted = true;');
    const info = buildInfo(false, directory); assert.equal(info.commit, null); assert.equal(info.baseCommit, null);
    const snapshot = readStoredZip(sourceSnapshot(directory).archive);
    assert.equal(snapshot.get('SpicyBond-source/adapter.ts').toString(), 'export const adapted = true;');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
