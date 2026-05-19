import { pass, fail, warn, info, summarize } from '../util.mjs';

const PLACEHOLDER_RE = /\b(lorem ipsum|TODO:|FIXME:|XXX:)\b/i;

// Anchor text that's bad for SEO + accessibility. "Click here" doesn't tell
// screen readers (or search engines) what's on the other side of the link.
const GENERIC_ANCHOR_RE = /^(click here|read more|learn more|here|more info|details|continue|see more|find out more)$/i;

export async function runContent(ctx) {
  const { htmlFiles, webpSet } = ctx;
  const results = [];

  const placeholderHits = [];
  const pngWhereWebp = [];
  const imgsNoAlt = [];
  const aTagsNoText = [];
  const genericAnchors = [];

  // Heading hierarchy: every page must have exactly one <h1>, and headings
  // shouldn't skip levels (h1 → h3 without h2).
  const noH1 = [];
  const multiH1 = [];
  const skippedHeading = [];

  for (const f of htmlFiles) {
    // Placeholders
    if (PLACEHOLDER_RE.test(f.content)) placeholderHits.push(f.relPath);

    // PNG/JPG references where WebP exists
    for (const m of f.content.matchAll(/<img[^>]+src=["']([^"']+\.(?:png|jpe?g))["']/gi)) {
      const src = m[1].replace(/^\//, '');
      const noExt = src.replace(/\.(?:png|jpe?g)$/i, '');
      if (webpSet.has(noExt)) pngWhereWebp.push(`${f.relPath}: ${m[1]}`);
    }

    // <img> without alt
    for (const m of f.content.matchAll(/<img(?![^>]*\salt=)[^>]*>/gi)) {
      if (/aria-hidden=["']true["']/.test(m[0])) continue;
      const src = m[0].match(/src=["']([^"']+)["']/)?.[1] ?? '(no src)';
      imgsNoAlt.push(`${f.relPath}: ${src}`);
    }

    // <a> tags: empty content + generic anchor text
    for (const m of f.content.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)) {
      const inner = m[1].replace(/<[^>]+>/g, '').trim();
      const hasAriaLabel = /aria-label=["'][^"']+["']/.test(m[0]);
      const hasTitle = /title=["'][^"']+["']/.test(m[0]);
      const href = m[0].match(/href=["']([^"']+)["']/)?.[1] ?? '?';

      if (!inner && !hasAriaLabel && !hasTitle) {
        aTagsNoText.push(`${f.relPath}: <a href="${href}"> (empty)`);
      } else if (GENERIC_ANCHOR_RE.test(inner) && !hasAriaLabel) {
        genericAnchors.push(`${f.relPath}: "${inner}" → ${href}`);
      }
    }

    // Heading hierarchy
    const headings = [...f.content.matchAll(/<h([1-6])(?:\s[^>]*)?>/gi)].map((m) => parseInt(m[1], 10));
    const h1Count = headings.filter((h) => h === 1).length;
    if (h1Count === 0) noH1.push(f.relPath);
    if (h1Count > 1) multiH1.push(`${f.relPath} (${h1Count} <h1>s)`);

    let prev = 0;
    for (const h of headings) {
      if (prev > 0 && h - prev > 1) {
        skippedHeading.push(`${f.relPath}: h${prev} → h${h}`);
        break;
      }
      prev = h;
    }
  }

  results.push(summarize('No placeholder text (Lorem/TODO/FIXME)', placeholderHits));
  results.push(summarize('No raw PNG/JPG where WebP exists', pngWhereWebp));
  results.push(summarize('All images have alt text', dedupe(imgsNoAlt), 'warn'));
  results.push(summarize('All links have accessible text', dedupe(aTagsNoText), 'warn'));
  results.push(summarize('No generic anchor text ("click here" etc.)', dedupe(genericAnchors), 'warn'));
  results.push(summarize('Every page has exactly one <h1>', noH1));
  results.push(summarize('No multiple <h1>s', multiH1, 'warn'));
  results.push(summarize('Heading hierarchy is sequential', dedupe(skippedHeading), 'warn'));

  return results;
}

function dedupe(arr) {
  return Array.from(new Set(arr)).slice(0, 20);
}
