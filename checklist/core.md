# Sitewide checklist — every Codejitsu site

Walk through this list after any non-trivial change. Programmatic checks are runnable via `npx codejitsu-check` (runs from the site repo root after `npm run build`).

The runner covers the easy stuff (file presence, meta tags, canonical, schema script tags, PNG-where-WebP-exists, placeholder text). The rest needs human + Claude judgment.

## Build + deploy

- [ ] `npm run build` exits 0 with no warnings about missing pages, unresolved imports, or broken links.
- [ ] `dist/` contains static HTML for every expected route. No `.html` route is missing.
- [ ] `wrangler.toml` is present and points to `dist`.
- [ ] `.github/workflows/daily-deploy.yml` exists; the `CLOUDFLARE_DEPLOY_HOOK_URL` secret is set in the repo (skip if site has no scheduled content).

## URLs + routing

- [ ] Astro config has `trailingSlash: 'always'` and `output: 'static'`.
- [ ] No internal link in any `.astro`/`.tsx` file points to a URL without a trailing slash.
- [ ] Canonical URL appears on every page in `<head>` and matches the trailing-slash policy.

## SEO

- [ ] Every page has `<title>` and `<meta name="description">`. No duplicates across pages.
- [ ] OG meta on every page: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`.
- [ ] Twitter card meta on every page.
- [ ] JSON-LD schema appropriate per page type (Organization, LocalBusiness, BlogPosting, FAQPage). Use `@ibalzam/codejitsu-core/seo/schema` builders.
- [ ] `sitemap-index.xml` generated and lists every public page. Future-dated blog posts are excluded.
- [ ] `robots.txt` at root and references the sitemap.
- [ ] `llms.txt` and `llms-full.txt` at root, regenerated this build.

## Images

- [ ] No `<img src="*.png">` or `<img src="*.jpg">` references in built HTML where a WebP equivalent exists.
- [ ] Astro `image.defaults` includes `format: 'webp'`.
- [ ] All images in `public/images/` over 500KB have been run through `codejitsu-optimize-images` or have a documented exception.

## Performance

- [ ] No client-side JS on pages that don't need it (Astro should ship zero JS by default).
- [ ] `inlineStylesheets: 'always'` in build config (or justified opt-out).
- [ ] Hero image uses `loading="eager"` + `fetchpriority="high"`; everything else lazy-loaded.

## Accessibility

- [ ] Every `<img>` has alt text (decorative images: `alt=""`).
- [ ] Every interactive element is keyboard-reachable and has a visible focus style.
- [ ] Color contrast meets WCAG AA on body text.

## Content

- [ ] No placeholder text (`Lorem ipsum`, `TODO`, `FIXME`) in shipped routes.
- [ ] Every blog post in `content/blog/` has required frontmatter (see `modules/blog/checklist.md`).

## When something on this list changes

If a new invariant is added to a Codejitsu site, add it here AND bump the package version with a `MIGRATIONS/<version>.md` note so existing sites can adopt it.
