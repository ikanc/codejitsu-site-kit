/**
 * Helpers for the `@astrojs/sitemap` integration.
 *
 * Two complementary functions:
 *   - `defaultPriorityRules(site)` produces a `serialize` function that sets
 *     priority and changefreq based on URL shape (home, top-level hubs,
 *     service/area pages, blog posts).
 *   - `excludeFuturePosts(futureSlugs)` produces a `filter` function that
 *     drops scheduled blog posts whose slugs are in the supplied set.
 *
 * Compose both like:
 *
 *   sitemap({
 *     filter: excludeFuturePosts(await blog.getFutureBlogSlugs()),
 *     serialize: defaultPriorityRules(SITE),
 *   })
 */

export interface SitemapItem {
  url: string;
  changefreq?:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never';
  priority?: number;
  lastmod?: string;
}

export interface PriorityRulesOptions {
  /** Extra patterns appended to the defaults. Earlier entries win. */
  rules?: Array<{ pattern: RegExp; priority: number; changefreq?: SitemapItem['changefreq'] }>;
}

/**
 * Returns a `serialize` function that assigns priority/changefreq based on
 * URL shape. Tune via `options.rules` for site-specific top-level paths.
 *
 * @param site The site origin (no trailing slash), e.g. 'https://example.com'.
 */
export function defaultPriorityRules(
  site: string,
  options: PriorityRulesOptions = {}
) {
  const homeUrl = `${site}/`;
  const extra = options.rules ?? [];

  return (item: SitemapItem): SitemapItem => {
    if (item.url === homeUrl) {
      return { ...item, priority: 1.0, changefreq: 'daily' };
    }

    for (const rule of extra) {
      if (rule.pattern.test(item.url)) {
        return {
          ...item,
          priority: rule.priority,
          ...(rule.changefreq && { changefreq: rule.changefreq }),
        };
      }
    }

    // Default heuristics.
    if (/\/(services|service-areas|industries)\/$/.test(item.url)) {
      return { ...item, priority: 0.9, changefreq: 'weekly' };
    }
    if (/\/(services|service-areas|industries)\/[^/]+\/$/.test(item.url)) {
      return { ...item, priority: 0.8, changefreq: 'weekly' };
    }
    if (/\/blog\/$/.test(item.url)) {
      return { ...item, priority: 0.7, changefreq: 'daily' };
    }
    if (/\/blog\/[^/]+\/$/.test(item.url)) {
      return { ...item, priority: 0.6, changefreq: 'monthly' };
    }
    if (/\/blog\/(tag|category)\/[^/]+\/$/.test(item.url)) {
      return { ...item, priority: 0.5, changefreq: 'weekly' };
    }
    return item;
  };
}

/**
 * Returns a `filter` function for `@astrojs/sitemap` that excludes any URL
 * whose final path segment matches a future-dated blog slug.
 *
 * Pass `await blog.getFutureBlogSlugs()` to the constructor.
 */
export function excludeFuturePosts(futureSlugs: string[]) {
  const set = new Set(futureSlugs);
  return (url: string): boolean => {
    const m = url.match(/\/blog\/([^/]+)\/?$/);
    if (!m) return true;
    return !set.has(m[1]);
  };
}

/** Compose multiple filter functions with AND semantics. */
export function composeFilters(...filters: Array<(url: string) => boolean>) {
  return (url: string) => filters.every((f) => f(url));
}

/** Filter helper: exclude URLs matching any of the supplied patterns. */
export function excludePatterns(patterns: RegExp[]) {
  return (url: string) => !patterns.some((p) => p.test(url));
}
