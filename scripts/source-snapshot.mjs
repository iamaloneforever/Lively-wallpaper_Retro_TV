import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { crc32 } from 'node:zlib';
import { brand } from './brand.mjs';

export const repository = brand.repository;
export const sha256 = data => createHash('sha256').update(data).digest('hex');
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
function hasRepository(cwd) {
  try { return realpathSync(git(cwd, 'rev-parse', '--show-toplevel')) === realpathSync(cwd); } catch { return false; }
}

export function buildInfo(development = false, cwd = process.cwd()) {
  const tracked = hasRepository(cwd);
  const head = tracked ? git(cwd, 'rev-parse', 'HEAD') : null;
  const dirty = !tracked || !!git(cwd, 'status', '--porcelain', '--untracked-files=normal');
  if (process.env.SPICY_BOND_RELEASE === '1' && (development || dirty)) throw new Error('Release source must be a clean Git checkout.');
  const exact = !development && !dirty;
  return { mode: exact ? 'commit' : 'development', commit: exact ? head : null, baseCommit: head,
    repository, sourceTree: exact ? `${repository}/tree/${head}` : null,
    upstreamArchive: exact ? `${repository}/archive/${head}.zip` : null,
    sourceSnapshot: 'source.zip' };
}

// ZIP with stored entries: portable, no archive-tool dependency; bytes come from
// the actual build tree, including local changes in development snapshots.
export function sourceSnapshot(cwd = process.cwd()) {
  // Recipients can rebuild the shipped source ZIP without a .git directory.
  // Exported-source builds remain honestly labeled development builds.
  function exportedFiles(directory = '') {
    return readdirSync(resolve(cwd, directory), { withFileTypes: true }).flatMap(entry => {
      if (['.git', 'node_modules', '.pnpm-store', 'dist', 'test-results', 'playwright-report', '.research', '.tmp', '.build', 'artifacts', 'bin', 'obj', '.vs'].includes(entry.name) || /^\.env(?:\.|$)|\.local(?:\.json)?$|\.user$/.test(entry.name) || entry.isSymbolicLink()) return [];
      const path = directory ? `${directory}/${entry.name}` : entry.name;
      return entry.isDirectory() ? exportedFiles(path) : [path];
    });
  }
  const paths = [...new Set(hasRepository(cwd) ? execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd, encoding: 'utf8' }).split('\0').filter(Boolean) : exportedFiles())].sort();
  const entries = paths.filter(path => path !== 'node_modules' && existsSync(resolve(cwd, path))).map(path => ({ path, data: readFileSync(resolve(cwd, path)) }));
  const manifest = entries.map(({ path, data }) => ({ path, sha256: sha256(data) }));
  return { archive: storedZip(entries.map(entry => ({ ...entry, path: `SpicyBond-source/${entry.path}` }))), manifest };
}

export function storedZip(entries) {
  const chunks = [], directory = [];
  let offset = 0;
  for (const { path, data } of entries) {
    const name = Buffer.from(path);
    const local = Buffer.alloc(30), central = Buffer.alloc(46);
    local.writeUInt32LE(0x04034b50); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(0x21, 12); // 1980-01-01, reproducible ZIP timestamp
    local.writeUInt32LE(crc32(data), 14); local.writeUInt32LE(data.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
    central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x800, 8);
    central.writeUInt16LE(0x21, 14); central.writeUInt32LE(crc32(data), 16); central.writeUInt32LE(data.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(offset, 42);
    chunks.push(local, name, data); directory.push(central, name); offset += local.length + name.length + data.length;
  }
  const index = Buffer.concat(directory), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(index.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...chunks, index, end]);
}
