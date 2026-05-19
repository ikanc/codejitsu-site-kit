// Shared helpers used across audit check groups.

export function pass(label, detail) {
  return { status: 'pass', label, detail };
}
export function fail(label, detail) {
  return { status: 'fail', label, detail };
}
export function warn(label, detail) {
  return { status: 'warn', label, detail };
}
export function info(label, detail) {
  return { status: 'info', label, detail };
}

/**
 * Collapses a list of per-page issues into a single check result.
 * If `issues` is empty → pass. Otherwise fail/warn with `issues.length` count
 * and the first few examples.
 */
export function summarize(label, issues, severity = 'fail') {
  if (issues.length === 0) return pass(label);
  const result =
    severity === 'fail' ? fail :
    severity === 'warn' ? warn :
    info;
  return result(`${label} (${issues.length})`, issues);
}

/** Extract <title> innerHTML. */
export function getTitle(html) {
  return html.match(/<title>([^<]*)<\/title>/)?.[1] ?? null;
}

/** Get content of a `<meta name|property="X" content="...">` tag. */
export function getMeta(html, key) {
  const re = new RegExp(
    `<meta\\s+(?:name|property)=["']${escapeRegex(key)}["']\\s+content=["']([^"']*)["']`,
    'i'
  );
  return html.match(re)?.[1] ?? null;
}

/** Get href of a `<link rel="X">` tag. */
export function getLinkHref(html, rel) {
  const re = new RegExp(
    `<link\\s+rel=["']${escapeRegex(rel)}["']\\s+href=["']([^"']*)["']`,
    'i'
  );
  return html.match(re)?.[1] ?? null;
}

export function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Match all `<a href="...">` hrefs in HTML. */
export function* anchorHrefs(html) {
  const re = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    yield { href: m[1], full: m[0] };
  }
}

export function isExternal(href, siteOrigin) {
  if (href.startsWith('http://') || href.startsWith('https://')) {
    return !href.startsWith(siteOrigin);
  }
  if (href.startsWith('//')) return true;
  return false;
}
