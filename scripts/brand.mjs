import { readFileSync } from 'node:fs';

// Shared by Vite, artwork generation and native metadata generation.
export const brand = JSON.parse(readFileSync(new URL('../branding.json', import.meta.url), 'utf8'));
export const defaultBase = `/${brand.slug}/`;
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

export function brandMetadata(base = defaultBase) {
  const values = {
    NAME: brand.name, TAGLINE: brand.tagline, DESCRIPTION: brand.description,
    REPOSITORY: brand.repository, DOWNLOAD: `${brand.repository}/releases/latest`,
    BACKGROUND: brand.colors.background, PURPLE: brand.colors.purple,
    YELLOW: brand.colors.yellow, FOREGROUND: brand.colors.foreground,
    COVER: new URL(`${base}brand/cover.png`, brand.pagesOrigin).href,
  };
  return {
    name: 'spicy-bond-brand-metadata',
    transformIndexHtml: {
      order: 'pre',
      handler: html => html.replace(/%BRAND_([A-Z]+)%/g, (_, key) => {
        if (!(key in values)) throw new Error(`Unknown brand metadata: ${key}`);
        return escapeHtml(values[key]);
      }),
    },
  };
}
