import { pass, fail, warn, summarize, anchorHrefs, isExternal } from '../util.mjs';

export async function runLinks(ctx) {
  const { htmlFiles, config } = ctx;
  const siteOrigin = config.site.url.replace(/\/$/, '');
  const results = [];

  // Internal links must end with `/` (trailing slash policy).
  const missingSlash = [];
  // External links must have target="_blank" + rel containing noopener.
  const unsafeExternal = [];
  // Stray dev/localhost references in production HTML.
  const localhost = [];

  for (const f of htmlFiles) {
    for (const { href, full } of anchorHrefs(f.content)) {
      // Ignore anchors-only, mailto, tel, javascript:
      if (href.startsWith('#') || href.startsWith('mailto:') ||
          href.startsWith('tel:') || href.startsWith('javascript:')) continue;

      const external = isExternal(href, siteOrigin);

      if (external) {
        const hasBlank = /target=["']_blank["']/.test(full);
        const hasNoopener = /rel=["'][^"']*noopener[^"']*["']/.test(full);
        if (hasBlank && !hasNoopener) {
          unsafeExternal.push(`${f.relPath}: ${href}`);
        }
      } else {
        // Internal link. Strip query/hash; require trailing slash on the path.
        const cleanPath = href.split('?')[0].split('#')[0];
        if (cleanPath && cleanPath !== '/' && !cleanPath.endsWith('/') &&
            !/\.(html?|xml|txt|webp|png|jpe?g|svg|pdf|json|js|css|ico|woff2?)$/i.test(cleanPath)) {
          missingSlash.push(`${f.relPath}: ${href}`);
        }
      }

      if (/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(href)) {
        localhost.push(`${f.relPath}: ${href}`);
      }
    }

    // Also scan raw content for localhost references (CSS bg images, scripts).
    if (/(?:src|href)=["'][^"']*(?:localhost|127\.0\.0\.1)/.test(f.content)) {
      localhost.push(`${f.relPath}: (other ref)`);
    }
  }

  results.push(summarize('All internal links end with /', dedupe(missingSlash)));
  results.push(summarize('External links use rel="noopener noreferrer"', dedupe(unsafeExternal), 'warn'));
  results.push(summarize('No localhost/dev URLs in production HTML', dedupe(localhost)));

  return results;
}

function dedupe(arr) {
  return Array.from(new Set(arr));
}
