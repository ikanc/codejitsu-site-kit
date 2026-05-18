# SEO module — instructions for Claude

When the user asks to **set up codejitsu/core/seo** (or "wire up SEO", "add schema.org to every page", "set up the sitemap"), do the following.

## What this module provides

Three layers:

1. **`@ibalzam/codejitsu-core/seo/schema`** — typed JSON-LD builders: `organization()`, `localBusiness()`, `website()`, `blogPosting()`, `faqPage()`, `breadcrumbList()`, `service()`. Plus `jsonLd(obj)` for safe stringification.
2. **`@ibalzam/codejitsu-core/seo/sitemap`** — helpers for `@astrojs/sitemap`: `defaultPriorityRules()`, `excludeFuturePosts()`, `composeFilters()`, `excludePatterns()`.
3. **`templates/Head.astro`** — reusable head component that takes `{ title, description, canonical, ogImage, ogType, schema }` and injects everything.

## Wiring it into a site

### 1. Copy the Head component

`templates/Head.astro` → `src/components/Head.astro` in the site. This is the single place that renders title, meta, OG, Twitter, canonical, and JSON-LD. Every layout `<head>` should include `<Head ... />`.

### 2. Use it on every page

```astro
---
import Head from '~/components/Head.astro';
import { organization, blogPosting } from '@ibalzam/codejitsu-core/seo/schema';

const SITE = { name: 'Acme Co.', url: 'https://acme.com' };
---
<html lang="en">
  <head>
    <Head
      title="Page title — Acme Co."
      description="..."
      schema={[organization(SITE)]}
    />
  </head>
  <body>...</body>
</html>
```

### 3. Wire the sitemap

In `astro.config.mjs`:

```ts
import sitemap from '@astrojs/sitemap';
import { defaultPriorityRules, excludeFuturePosts, composeFilters, excludePatterns } from '@ibalzam/codejitsu-core/seo/sitemap';
import { blog } from './src/lib/blog';

const SITE = 'https://acme.com';
const futureSlugs = await blog.getFutureBlogSlugs();

export default defineConfig({
  site: SITE,
  integrations: [
    sitemap({
      filter: composeFilters(
        excludeFuturePosts(futureSlugs),
        excludePatterns([/\/lp\//, /\/draft\//]),  // site-specific exclusions
      ),
      serialize: defaultPriorityRules(SITE),
    }),
  ],
});
```

### 4. Copy robots.txt

`templates/robots.txt` → `public/robots.txt`. Edit the `Sitemap:` line to point to the site's actual sitemap URL.

### 5. Per-page schema cheatsheet

| Page type | Schema to inject |
|---|---|
| Home | `organization()`, `website()` |
| Local business home | `localBusiness()` instead of `organization()` |
| Blog index | `website()` |
| Blog post | `blogPosting()` + `faqPage(post.faqs)` if FAQs present + `breadcrumbList()` |
| Service page | `service()` + `breadcrumbList()` |
| Service area page | `localBusiness()` with `areaServed` set + `breadcrumbList()` |
| FAQ-heavy landing page | `faqPage()` + page-type schema |

A single `<Head schema={[a, b, c]} />` accepts multiple schemas. Each renders as its own `<script type="application/ld+json">`.

## What must NOT be done

- **Don't inline schema objects.** Always use the builders so types catch missing required fields (e.g. `BlogPosting` requires `publisher`).
- **Don't hand-write the canonical URL.** Use `Head`'s default (it builds from `Astro.url.pathname` + `Astro.site`) unless overriding for a specific reason.
- **Don't `JSON.stringify` schemas yourself.** Use `jsonLd()` — it escapes `</` so the script tag can't be broken out of.
- **Don't reference relative URLs in `og:image`.** OG scrapers require absolute URLs. `Head` resolves this automatically when you pass a relative path.
- **Don't add `og:image` to a page without an actual image at that path.** Empty OG images render as blank cards on socials.
- **Don't omit the canonical tag on alternative-URL pages** (filename slug + canonical slug both exist for blog posts). The canonical must point to the frontmatter slug version.

## Verify

Run `modules/seo/checklist.md`.
