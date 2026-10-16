import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';
import { brand, defaultBase } from './brand.mjs';

const target = new URL(process.argv[2] || `${brand.pagesOrigin}${defaultBase}`);
// Pages/CDN propagation may lag the deploy action. Never accept stale HTML
// whose asset links point outside the public repository path.
for (let attempt = 1; attempt <= 24; attempt++) {
  try {
    const page = new URL(target); page.search = `live=1&deploy-check=${Date.now()}`;
    const response = await fetch(page, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
    assert.equal(response.status, 200, 'Wallpaper HTML must load');
    const html = await response.text();
    const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(match => new URL(match[1], target));
    assert(assets.some(url => url.pathname.endsWith('.js')), 'Startup JavaScript is linked');
    assert(assets.some(url => url.pathname.endsWith('.css')), 'Startup CSS is linked');
    for (const url of assets) {
      assert.equal(url.origin, target.origin);
      assert(url.pathname.startsWith(`${target.pathname}assets/`), `Wrong asset base: ${url.pathname}`);
      const asset = await fetch(url, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
      assert.equal(asset.status, 200, `Asset must load: ${url.pathname}`);
      assert.match(asset.headers.get('content-type') || '', url.pathname.endsWith('.css') ? /text\/css/ : /(?:javascript|ecmascript)/);
      assert((await asset.arrayBuffer()).byteLength > 0, 'Asset must not be empty');
      console.log(`PASS ${url.pathname}`);
    }
    console.log(`PASS published wallpaper at ${target.origin}${target.pathname}`);
    break;
  } catch (error) {
    if (attempt === 24) throw error;
    console.log(`Waiting for Pages propagation (${attempt}/24): ${error.message}`);
    await setTimeout(5000);
  }
}
