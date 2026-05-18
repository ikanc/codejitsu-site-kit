# Blog module — instructions for Claude

When the user asks to **implement codejitsu/core/blog** (or "add the blog system"), do the following.

## What this module provides

A markdown-based blog with:
- File-based posts in `content/blog/*.md` (gray-matter frontmatter)
- Scheduled publishing — future-dated posts are hidden from public pages and sitemap, but their slugs stay buildable so OG meta scrapers (Hootsuite, etc.) can hit them
- Dual-slug resolution — filename slug (`2026-02-08-foo`) and canonical frontmatter slug (`foo`) both resolve to the same post; the frontmatter slug is canonical for SEO
- Reading time, tags, FAQs, categories
- Listing, tag, category pages

## Wiring it into a site

### 1. Install peer deps in the site (one-time)

```bash
npm install gray-matter reading-time
```
(They're transitive deps of `@ibalzam/codejitsu-core`, but Astro's bundler resolves them from the site's `node_modules`.)

### 2. Create the site's blog instance

Copy `templates/lib/blog.ts` → `src/lib/blog.ts` in the site. Edit the config to set the site's default author and (optionally) its category list. The whole file is ~10 lines.

### 3. Add page routes

Copy these from `templates/pages/` → `src/pages/` in the site:
- `blog/index.astro` — listing
- `blog/[...slug].astro` — detail (handles both filename and canonical slug forms)
- `blog/tag/[tag].astro` — tag pages
- `blog/category/[category].astro` — category pages (skip if site has no categories)

Adapt the markup to the site's design system. The page logic (data fetching, getStaticPaths) is the part that must stay correct — styling is the site's job.

### 4. Add the first post

Copy `templates/content/_sample-post.md` → `content/blog/<today>-<slug>.md` and edit.

### 5. Wire scheduled-post filter into the sitemap

In `astro.config.mjs`, import the site's blog instance and exclude future-dated slugs from the sitemap:

```ts
import { blog } from './src/lib/blog';
const futureSlugs = await blog.getFutureBlogSlugs();

// in sitemap integration:
filter: (page) => {
  const m = page.match(/\/blog\/([^/]+)\/?$/);
  return !(m && futureSlugs.includes(m[1]));
}
```

### 6. Wire the daily-deploy GH Action

See `modules/deploy/CLAUDE.md`. The cron rebuilds the site so scheduled posts graduate from hidden to public on their publish date.

## Post frontmatter shape

```yaml
---
title: "How to size a furnace"            # required
description: "Quick guide to BTU sizing"  # required (used as meta description)
date: 2026-03-15                          # required; future date = hidden until that day
slug: how-to-size-a-furnace               # optional; if set, this is the canonical URL
author: "Pearl Remodeling"                # optional; falls back to defaultAuthor in config
image: /images/blog/furnace-sizing.webp   # optional; used for OG + listing card
tags: [HVAC, Heating, Guides]             # optional
faqs:                                      # optional; rendered as FAQ schema + section
  - question: "What BTU do I need?"
    answer: "Roughly 30 BTU per sq ft as a starting point..."
---
```

## What must NOT be done

- **Don't reimplement the loader.** Always import from `@ibalzam/codejitsu-core/blog` via the site's `src/lib/blog.ts`.
- **Don't bypass `getAllPosts()` for the listing.** It's already filtering future-dated posts; bypassing means drafts leak.
- **Don't add `getStaticPaths` that calls `getAllPosts()` alone for the detail page** — it'll exclude future-dated posts and break OG scraping for scheduled releases. Use `getAllPostSlugs()` for path generation.
- **Don't put `.mdx` files in `content/blog/`.** The loader is `.md` only. If MDX support is needed, raise it as a feature request — it's a deliberate scope decision.
- **Don't change the dual-slug resolution.** Old date-prefixed URLs must keep working alongside short canonical slugs.

## Verify

Run `modules/blog/checklist.md` after wiring. Run `checklist/core.md` (sitewide).
