import { readFileSync } from 'node:fs';
export const showcaseAssets = {
  'brand/cover.png': 'docs/images/cover.png',
  'media/desktop-preview.png': 'docs/images/desktop-preview.png',
  'media/vinyl-lyrics.png': 'docs/images/vinyl-lyrics.png',
  'media/effects-preview.png': 'docs/images/effects-preview.png',
  'media/spicy-bond-demo.mp4': 'docs/media/spicy-bond-demo.mp4',
};
// Keep one checked-in copy of each capture and ship it on the website as well.
export function showcaseMedia() {
  return { name: 'spicy-bond-showcase-media',
    generateBundle() {
      for (const [fileName, path] of Object.entries(showcaseAssets)) this.emitFile({ type: 'asset', fileName, source: readFileSync(path) });
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = (request.url || '').split('?')[0];
        const entry = Object.entries(showcaseAssets).find(([url]) => pathname.endsWith('/' + url));
        if (!entry) return next();
        try { response.setHeader('Content-Type', entry[0].endsWith('.mp4') ? 'video/mp4' : 'image/png'); response.end(readFileSync(entry[1])); }
        catch { next(); }
      });
    },
  };
}
