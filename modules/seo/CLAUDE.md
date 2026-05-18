# SEO module — instructions for Claude

When the user asks to **set up codejitsu/core/seo** (or "wire up SEO", "add schema.org to every page", "set up the sitemap"), do the following.

## What this module provides

Three layers:

1. **`@ibalzam/codejitsu-core/seo`** (top-level) re-exports:
   - **Schema builders:** `organization()`, `localBusiness()`, `website()`, `blogPosting()`, `faqPage()`, `breadcrumbList()`, `service()`
   - **Safe injection:** `jsonLd(obj)` — stringifies + escapes `</` so the script tag can't be broken out of
   - **Sitemap helpers:** `defaultPriorityRules()`, `excludeFuturePosts()`, `composeFilters()`, `excludePatterns()`
2. **`templates/Head.astro`** — reusable head component (rich: noindex, heroImage preload, article metadata, hreflang, OG/Twitter, JSON-LD).
3. **`templates/robots.txt`** — starter robots.

## Wiring it into a site

### 1. Create a thin site wrapper around Head

Sites have site-specific values (analytics scripts, default OG image, brand name) that shouldn't pollute every page's import. Create `src/components/SiteHead.astro` wrapping the package's Head:

```astro
---
import Head from '@ibalzam/codejitsu-core/seo/Head.astro';
import config from '../../codejitsu.config';

interface Props {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article';
  schema?: Record<string, unknown> | Record<string, unknown>[];
  noindex?: boolean;
  heroImage?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

const props = Astro.props;
---
<Head
  {...props}
  siteUrl={config.site.url}
  siteName={config.site.name}
  locale={config.site.locale ?? 'en_US'}
  image={props.image ?? config.site.defaultOgImage}
  titleSuffix={config.site.titleSuffix}
>
  <slot />
</Head>

<!-- Site-specific analytics / tracking go here -->
<!-- e.g. <script is:inline async src="https://analytics.example.com/script.js" /> -->
```

The site's layout uses `<SiteHead ... />` (not the package's `<Head ... />` directly), so layout pages stay clean.

### 2. Use it on every page

```astro
---
import SiteHead from '~/components/SiteHead.astro';
import { organization, blogPosting } from '@ibalzam/codejitsu-core/seo';
---
<html lang="en">
  <head>
    <SiteHead
      title="Page title"
      description="..."
      schema={[organization({ name: 'Acme', url: 'https://acme.com' })]}
    />
  </head>
  <body>...</body>
</html>
```

### 3. Wire the sitemap

In `astro.config.mjs`:

```ts
import sitemap from '@astrojs/sitemap';
import {
  defaultPriorityRules,
  excludeFuturePosts,
  composeFilters,
  excludePatterns,
} from '@ibalzam/codejitsu-core/seo';
import { blog } from './src/lib/blog';

const SITE = 'https://acme.com';
const futureSlugs = await blog.getFutureBlogSlugs();

export default defineConfig({
  site: SITE,
  integrations: [
    sitemap({
      filter: composeFilters(
        excludeFuturePosts(futureSlugs),
        excludePatterns([/\/lp\//, /\/draft\//]),
      ),
      serialize: defaultPriorityRules(SITE),
    }),
  ],
});
```

### 4. Copy robots.txt

`templates/robots.txt` → `public/robots.txt`. Edit the `Sitemap:` line.

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

`<SiteHead schema={[a, b, c]} />` accepts multiple schemas. Each renders as its own `<script type="application/ld+json">`.

## What must NOT be done

- **Don't inline schema objects.** Always use the builders so types catch missing required fields (e.g. `BlogPosting` requires `publisher`).
- **Don't `JSON.stringify` schemas yourself.** Use `jsonLd()` — escapes `</` so the script tag can't be broken out of. If you see a site doing `set:html={JSON.stringify(s)}`, replace with `set:html={jsonLd(s)}`.
- **Don't reference relative URLs in `og:image`.** OG scrapers require absolute URLs. The package's Head resolves this automatically when you pass a relative path.
- **Don't add `og:image` to a page without an actual image at that path.** Empty OG images render as blank cards.
- **Don't override `canonicalURL` by hand** — pass `path` instead, and let the Head build it. Keeps trailing-slash policy consistent.
- **Don't put site-specific analytics inside the package's Head.** Site-specific things belong in `SiteHead.astro` (the site's wrapper) so the package stays generic.

## Verify

Run `modules/seo/checklist.md`.
