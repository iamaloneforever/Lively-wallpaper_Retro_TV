import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { brand } from './brand.mjs';

export async function renderBrandCover(browser) {
  const logo = await readFile('wallpaper/public/brand/logo.svg', 'utf8');
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
  try {
    await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:${brand.colors.background};color:${brand.colors.foreground};font-family:Arial,Helvetica,sans-serif}.cover{width:1600px;height:900px;display:flex;align-items:center;justify-content:center;position:relative}.identity{display:flex;align-items:center;gap:44px;margin-top:-24px}.identity svg{width:218px;height:218px;flex:none}h1{font-size:142px;font-weight:800;letter-spacing:-7px;line-height:1.06;margin:0}p{font-size:27px;letter-spacing:-.5px;margin:20px 0 0;color:#a5a5ad}.platform{position:absolute;bottom:74px;left:50%;transform:translateX(-50%);font-size:12px;font-weight:600;letter-spacing:2.5px;color:#7c7c87}</style><main class="cover"><div class="identity">${logo}<div><h1>${brand.name}</h1><p>${brand.tagline}</p></div></div><div class="platform">FOR WINDOWS</div></main>`);
    await page.screenshot({ path: 'docs/images/cover.png' });
  } finally { await page.close(); }
}

export async function renderBrandAssets(browser) {
  await mkdir('docs/brand', { recursive: true }); await mkdir('docs/images', { recursive: true });
  const logo = await readFile('wallpaper/public/brand/logo.svg', 'utf8');
  const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
  try {
    await page.setContent(`<style>body{margin:0}svg{display:block;width:100vw;height:100vh}</style>${logo}`);
    await page.screenshot({ path: 'docs/brand/logo.png', omitBackground: true });
    const sizes = [16, 24, 32, 48, 64, 128, 256], images = [];
    for (const size of sizes) { await page.setViewportSize({ width: size, height: size }); images.push(await page.screenshot({ omitBackground: true })); }
    const header = Buffer.alloc(6 + sizes.length * 16); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
    let offset = header.length;
    sizes.forEach((size, i) => { const entry = 6 + i * 16; header[entry] = header[entry + 1] = size === 256 ? 0 : size; header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6); header.writeUInt32LE(images[i].length, entry + 8); header.writeUInt32LE(offset, entry + 12); offset += images[i].length; });
    await writeFile('companion/src/SpicyBond.Companion/Assets/SpicyBond.ico', Buffer.concat([header, ...images]));
    await page.setViewportSize({ width: 720, height: 200 });
    await page.setContent(`<style>body{margin:0;font:12px Arial;color:#fff}svg{display:block;width:100%;height:100%}.grid{height:200px;display:grid;grid-template-columns:1fr 1fr}.row{display:flex;align-items:center;justify-content:space-evenly;background:#101012}.row.light{background:#f3f3f5;color:#111}.sample{display:grid;justify-items:center;gap:15px}</style><div class="grid">${['',' light'].map(theme=>`<div class="row${theme}">${[16,24,32,48].map(size=>`<div class="sample"><div style="width:${size}px;height:${size}px">${logo}</div><span>${size}px</span></div>`).join('')}</div>`).join('')}</div>`);
    await page.screenshot({ path: 'docs/brand/size-preview.png' });
  } finally { await page.close(); }
  await renderBrandCover(browser);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined });
  try { await renderBrandAssets(browser); console.log('Rendered logo, seven Windows icon sizes, size preview and modern banner.'); }
  finally { await browser.close(); }
}
