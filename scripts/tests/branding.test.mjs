import { test } from 'node:test';
import assert from 'node:assert/strict';
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
