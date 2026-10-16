// Build a standard Win32 .res from the checked-in icon and manifest on any OS.
// The Windows SDK alternative is scripts/build-branding.ps1.
import { readFileSync, writeFileSync } from 'node:fs';
import { brand } from './brand.mjs';
const assets = new URL('../companion/src/SpicyBond.Companion/Assets/', import.meta.url);
const align = buffer => Buffer.concat([buffer, Buffer.alloc((4 - buffer.length % 4) % 4)]);
const u16 = (...values) => { const buffer = Buffer.alloc(values.length * 2); values.forEach((v, i) => buffer.writeUInt16LE(v, i * 2)); return buffer; };
const u32 = (...values) => { const buffer = Buffer.alloc(values.length * 4); values.forEach((v, i) => buffer.writeUInt32LE(v, i * 4)); return buffer; };
const wide = text => Buffer.from(text + '\0', 'utf16le');
function resource(type, name, data, language = 0x409) {
  return Buffer.concat([u32(data.length, 32), u16(0xffff, type, 0xffff, name), u32(0), u16(0x1030, language), u32(0, 0), align(data)]);
}
function block(key, value, children = [], type = 1, length = type ? value.length / 2 : value.length) {
  const prefix = align(Buffer.concat([u16(0, length, type), wide(key)]));
  const body = children.length ? Buffer.concat([align(Buffer.concat([prefix, value])), ...children.map(align)]) : Buffer.concat([prefix, value]);
  body.writeUInt16LE(body.length, 0); return body;
}
const versionNumber = readFileSync(new URL('../companion/src/SpicyBond.Companion/SpicyBond.Companion.csproj', import.meta.url), 'utf8').match(/<Version>([\d.]+)<\/Version>/)[1];
const numbers = versionNumber.split('.').map(Number);
while (numbers.length < 4) numbers.push(0);
const values = {
  CompanyName: `${brand.name} contributors`, FileDescription: `${brand.name} — Music Companion for Lively Wallpaper`,
  FileVersion: numbers.join('.'), InternalName: brand.nativeName, LegalCopyright: `Copyright © 2026 ${brand.name} contributors`,
  OriginalFilename: `${brand.nativeName}.exe`, ProductName: brand.name, ProductVersion: versionNumber,
};
const strings = block('StringFileInfo', Buffer.alloc(0), [block('040904b0', Buffer.alloc(0), Object.entries(values).map(([key, value]) => block(key, wide(value))))]);
const variables = block('VarFileInfo', Buffer.alloc(0), [block('Translation', u16(0x409, 1200), [], 0)]);
const majorMinor = numbers[0] * 65536 + numbers[1], buildRevision = numbers[2] * 65536 + numbers[3];
const fixed = u32(0xfeef04bd, 0x10000, majorMinor, buildRevision, majorMinor, buildRevision, 0x3f, 0, 0x40004, 1, 0, 0, 0);
const version = block('VS_VERSION_INFO', fixed, [strings, variables], 0);
const ico = readFileSync(new URL('SpicyBond.ico', assets));
if (ico.readUInt16LE(2) !== 1) throw new Error('Expected ICO input');
const count = ico.readUInt16LE(4), icons = [], group = [u16(0, 1, count)];
for (let i = 0; i < count; i++) {
  const offset = 6 + i * 16, size = ico.readUInt32LE(offset + 8), position = ico.readUInt32LE(offset + 12);
  const bytes = ico.subarray(position, position + size);
  if (bytes.length !== size) throw new Error('Truncated ICO');
  icons.push(resource(3, i + 1, bytes));
  group.push(ico.subarray(offset, offset + 12), u16(i + 1));
}
const nullResource = Buffer.concat([u32(0, 32), u16(0xffff, 0, 0xffff, 0), Buffer.alloc(16)]);
const output = Buffer.concat([nullResource, ...icons, resource(14, 101, Buffer.concat(group)), resource(24, 1, readFileSync(new URL('SpicyBond.manifest', assets))), resource(16, 1, version)]);
if (process.argv.includes('--check')) {
  if (!readFileSync(new URL('SpicyBond.res', assets)).equals(output)) throw new Error('Windows branding resource is stale. Run pnpm brand:resources.');
} else writeFileSync(new URL('SpicyBond.res', assets), output);
console.log(`${process.argv.includes('--check') ? 'Verified' : 'Built'} SpicyBond.res with ${count} icon sizes, manifest and ${brand.name} ${versionNumber} metadata.`);
