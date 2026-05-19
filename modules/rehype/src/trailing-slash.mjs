/**
 * Rehype plugin that enforces a trailing-slash policy on internal `<a href>`
 * values produced by markdown content. Astro's `trailingSlash: 'always'`
 * controls page routing but does NOT rewrite hand-written hrefs in markdown
 * or component templates. This plugin fills that gap for markdown content.
 *
 * Usage in astro.config.mjs:
 *
 *   import trailingSlash from '@ibalzam/codejitsu-core/rehype/trailing-slash';
 *
 *   export default defineConfig({
 *     markdown: {
 *       rehypePlugins: [trailingSlash],
 *     },
 *   });
 *
 * Or with options:
 *
 *   rehypePlugins: [[trailingSlash, { policy: 'always' }]]
 *
 * What it skips (leaves untouched):
 *  - External URLs (http://, https://, //, mailto:, tel:, etc.)
 *  - Anchor-only links (#section)
 *  - Paths ending in a file extension (.pdf, .html, .webp, ...)
 *  - Root path `/`
 *
 * @param {object} [opts]
 * @param {'always' | 'never' | 'preserve'} [opts.policy='always']
 */
export default function rehypeTrailingSlash(opts = {}) {
  const policy = opts.policy ?? 'always';
  if (policy === 'preserve') return () => {};

  return (tree) => {
    walk(tree, (node) => {
      if (node.tagName !== 'a') return;
      const href = node.properties?.href;
      if (typeof href !== 'string') return;

      const normalized = normalize(href, policy);
      if (normalized !== href) {
        node.properties.href = normalized;
      }
    });
  };
}

function walk(node, fn) {
  if (node?.type === 'element') fn(node);
  if (Array.isArray(node?.children)) {
    for (const child of node.children) walk(child, fn);
  }
}

/**
 * Apply policy to a single href. Pure, no side-effects — exported for tests.
 *
 * @param {string} href
 * @param {'always' | 'never'} policy
 */
export function normalize(href, policy) {
  if (!href.startsWith('/')) return href;        // external, anchor, relative — skip
  if (href.startsWith('//')) return href;        // protocol-relative external
  if (href === '/') return href;                  // root is its own canonical

  // Split path / query / fragment so we don't break /foo?bar=baz or /foo#anchor.
  const m = href.match(/^([^?#]*)(\?[^#]*)?(#.*)?$/);
  if (!m) return href;
  let path = m[1];
  const query = m[2] ?? '';
  const fragment = m[3] ?? '';

  if (!path || path === '/') return href;

  // Last segment with a `.` is likely a file (e.g. /robots.txt, /og-image.webp).
  const lastSeg = path.split('/').filter(Boolean).pop() ?? '';
  if (lastSeg.includes('.')) return href;

  const endsWithSlash = path.endsWith('/');

  if (policy === 'always' && !endsWithSlash) {
    path = `${path}/`;
  } else if (policy === 'never' && endsWithSlash) {
    path = path.replace(/\/+$/, '');
  }

  return `${path}${query}${fragment}`;
}
