import { pass, fail, warn, info, summarize, getTitle, getMeta, getLinkHref } from '../util.mjs';

// Required fields per common JSON-LD @type. Used by the schema-completeness check.
const SCHEMA_REQUIRED = {
  Organization:    ['name', 'url'],
  LocalBusiness:   ['name', 'url', 'address', 'telephone'],
  Service:         ['name', 'description', 'provider'],
  BlogPosting:     ['headline', 'datePublished', 'author', 'publisher'],
  Article:         ['headline', 'datePublished', 'author', 'publisher'],
  FAQPage:         ['mainEntity'],
  Product:         ['name', 'image', 'description', 'offers'],
  Event:           ['name', 'startDate', 'location'],
  WebSite:         ['name', 'url'],
  WebPage:         ['name'],
  BreadcrumbList:  ['itemListElement'],
};

const BOILERPLATE_DESC_RE = /^(welcome to|home of|the official|your one-?stop)/i;

export async function runSeo(ctx) {
  const { htmlFiles, config } = ctx;
  const siteOrigin = config.site.url.replace(/\/$/, '');
  const siteName = config.site.name;
  const results = [];

  const titles = new Map();
  const descriptions = new Map();
  const noTitle = [];
  const titleTooLong = [];
  const titleNoBrand = [];
  const noDescription = [];
  const descTooLong = [];
  const descBoilerplate = [];
  const noCanonical = [];
  const wrongCanonicalDomain = [];
  const canonicalNoTrailingSlash = [];
  const noOg = [];
  const noOgImage = [];
  const noTwitter = [];
  const noJsonLd = [];
  const unsafeJsonLd = [];
  const invalidJsonLd = [];
  const incompleteSchemas = [];

  for (const f of htmlFiles) {
    // Title
    const title = getTitle(f.content);
    if (!title) noTitle.push(f.relPath);
    else {
      if (title.length > 60) titleTooLong.push(`${f.relPath} (${title.length} chars)`);
      if (siteName && !title.toLowerCase().includes(siteName.toLowerCase())) {
        // Skip the homepage and 404 — they sometimes omit brand intentionally.
        if (f.relPath !== 'index.html' && f.relPath !== '404.html') {
          titleNoBrand.push(`${f.relPath}: "${title.slice(0, 60)}"`);
        }
      }
      (titles.get(title) ?? titles.set(title, []).get(title)).push(f.relPath);
    }

    // Description
    const desc = getMeta(f.content, 'description');
    if (!desc) noDescription.push(f.relPath);
    else {
      if (desc.length > 160) descTooLong.push(`${f.relPath} (${desc.length} chars)`);
      if (BOILERPLATE_DESC_RE.test(desc)) {
        descBoilerplate.push(`${f.relPath}: "${desc.slice(0, 60)}..."`);
      }
      (descriptions.get(desc) ?? descriptions.set(desc, []).get(desc)).push(f.relPath);
    }

    // Canonical
    const canonical = getLinkHref(f.content, 'canonical');
    if (!canonical) noCanonical.push(f.relPath);
    else {
      if (!canonical.startsWith(siteOrigin)) wrongCanonicalDomain.push(`${f.relPath}: ${canonical}`);
      else if (!canonical.endsWith('/')) canonicalNoTrailingSlash.push(`${f.relPath}: ${canonical}`);
    }

    // OG / Twitter
    if (!getMeta(f.content, 'og:title') || !getMeta(f.content, 'og:description') ||
        !getMeta(f.content, 'og:url') || !getMeta(f.content, 'og:type')) {
      noOg.push(f.relPath);
    }
    if (!getMeta(f.content, 'og:image')) noOgImage.push(f.relPath);
    if (!getMeta(f.content, 'twitter:card')) noTwitter.push(f.relPath);

    // JSON-LD
    const blocks = [...f.content.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)];
    if (blocks.length === 0) {
      noJsonLd.push(f.relPath);
    } else {
      for (const m of blocks) {
        if (/<\/[a-z]/i.test(m[1])) unsafeJsonLd.push(`${f.relPath} (unescaped </ )`);
        let parsed;
        try { parsed = JSON.parse(m[1]); } catch {
          invalidJsonLd.push(`${f.relPath} (invalid JSON)`);
          continue;
        }
        const types = collectTypes(parsed);
        for (const type of types) {
          const required = SCHEMA_REQUIRED[type];
          if (!required) continue;
          const missing = required.filter((k) => !hasField(parsed, k, type));
          if (missing.length > 0) {
            incompleteSchemas.push(`${f.relPath}: ${type} missing ${missing.join(', ')}`);
          }
        }
      }
    }
  }

  results.push(summarize('Every page has <title>', noTitle));
  results.push(summarize('Titles ≤ 60 chars', titleTooLong, 'warn'));
  if (siteName) results.push(summarize('Titles include brand name', titleNoBrand, 'warn'));
  results.push(summarize('Every page has <meta description>', noDescription));
  results.push(summarize('Descriptions ≤ 160 chars', descTooLong, 'warn'));
  results.push(summarize('Descriptions don\'t start with boilerplate ("Welcome to...")', descBoilerplate, 'warn'));
  results.push(summarize('Every page has canonical', noCanonical));
  results.push(summarize('Canonical URLs use site domain', wrongCanonicalDomain));
  results.push(summarize('Canonical URLs have trailing slash', canonicalNoTrailingSlash));
  results.push(summarize('Every page has OG title/description/url/type', noOg));
  results.push(summarize('Every page has og:image', noOgImage, 'warn'));
  results.push(summarize('Every page has Twitter card', noTwitter, 'warn'));
  results.push(summarize('Every page has JSON-LD schema', noJsonLd));
  results.push(summarize('JSON-LD escapes </ safely', unsafeJsonLd));
  results.push(summarize('JSON-LD is valid JSON', invalidJsonLd));
  results.push(summarize('JSON-LD has required fields per @type', incompleteSchemas, 'warn'));

  const dupTitles = [...titles.entries()].filter(([, ps]) => ps.length > 1);
  results.push(
    dupTitles.length === 0
      ? pass('Page titles are unique')
      : warn(`${dupTitles.length} duplicate titles`,
          dupTitles.slice(0, 5).map(([t, ps]) => `"${t.slice(0, 50)}..." → ${ps.length} pages`))
  );

  const dupDesc = [...descriptions.entries()].filter(([, ps]) => ps.length > 1);
  results.push(
    dupDesc.length === 0
      ? pass('Page descriptions are unique')
      : warn(`${dupDesc.length} duplicate descriptions`,
          dupDesc.slice(0, 5).map(([d, ps]) => `"${d.slice(0, 50)}..." → ${ps.length} pages`))
  );

  return results;
}

/** Walk a (possibly nested or arrayed) JSON-LD object and collect every @type. */
function collectTypes(obj) {
  const types = new Set();
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (typeof node['@type'] === 'string') types.add(node['@type']);
    if (Array.isArray(node['@type'])) node['@type'].forEach((t) => types.add(t));
    for (const v of Object.values(node)) walk(v);
  }
  walk(obj);
  return types;
}

/** Does the JSON-LD object (anywhere in its tree) have field `key` set, for the given @type? */
function hasField(obj, key, type) {
  let found = false;
  function walk(node) {
    if (found || !node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    const t = node['@type'];
    const matches = t === type || (Array.isArray(t) && t.includes(type));
    if (matches && node[key] !== undefined && node[key] !== null && node[key] !== '') {
      found = true;
      return;
    }
    for (const v of Object.values(node)) walk(v);
  }
  walk(obj);
  return found;
}
