# SEO module — checklist

## Setup

- [ ] `src/components/Head.astro` exists and imports from `@ibalzam/codejitsu-core/seo/schema`.
- [ ] Every Astro layout calls `<Head ... />` in its `<head>`.
- [ ] `astro.config.mjs` uses `@astrojs/sitemap` with helpers from `@ibalzam/codejitsu-core/seo/sitemap`.
- [ ] `public/robots.txt` exists and points to the correct sitemap URL.

## Per-page (sample 5+ pages)

- [ ] `<title>` is unique, < 60 chars including suffix.
- [ ] `<meta name="description">` is unique, < 160 chars.
- [ ] `<link rel="canonical">` is absolute, has trailing slash, matches the current URL (or is the chosen canonical of N alternatives).
- [ ] `og:title`, `og:description`, `og:url`, `og:type`, `og:image` (absolute) present.
- [ ] `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image` present.
- [ ] At least one `<script type="application/ld+json">` per page; type matches the page (Organization on home, BlogPosting on posts, etc.).

## Sitemap

- [ ] `sitemap-index.xml` and `sitemap-0.xml` (or named variants) exist after build.
- [ ] No future-dated blog post appears in the sitemap.
- [ ] No URLs matching the site's documented exclusions appear.
- [ ] Priority + changefreq differentiated by page type (home highest, blog posts lower).

## Schema validation

- [ ] Run a sample blog post URL through https://search.google.com/test/rich-results — `BlogPosting` and (if applicable) `FAQPage` show as valid.
- [ ] Run the home URL — `Organization`/`LocalBusiness` and `WebSite` show as valid.
- [ ] No "missing required field" warnings.
