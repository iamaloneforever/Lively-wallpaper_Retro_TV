import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import assert from 'node:assert/strict';

const markdown = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const path = `${directory}/${entry.name}`;
  return entry.isDirectory() ? markdown(path) : entry.name.endsWith('.md') ? [path] : [];
});
const files = ['README.md', 'THIRD_PARTY_NOTICES.md', ...markdown('docs')];
let links = 0;
for (const path of files) {
  const text = readFileSync(path, 'utf8').replace(/^```[^\n]*\n[\s\S]*?^```/gm, '');
  for (const match of text.matchAll(/!?\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
    const href = match[1];
    if (/^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(href)) continue;
    const target = decodeURIComponent(href.split(/[?#]/)[0]);
    assert(existsSync(resolve(dirname(path), target)), `Broken local link in ${path}: ${href}`);
    links++;
  }
}
for (const path of ['docs/README.md', 'docs/getting-started.md', 'docs/lyrics.md', 'docs/settings.md', 'docs/development.md', 'docs/media/README.md', 'docs/brand/README.md', 'docs/licenses.md']) assert(files.includes(path), `Missing guide: ${path}`);
console.log(`PASS documentation: ${files.length} Markdown files, ${links} local links and media references.`);
