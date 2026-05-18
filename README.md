# @ibalzam/codejitsu-core

Shared core for all Codejitsu sites. Two channels per module:

- **Code** — importable via `@ibalzam/codejitsu-core/<module>` (Astro/TS).
- **Instructions** — a `CLAUDE.md` per module that tells Claude how to wire it into a site, what to do, what to avoid.

Sites stay thin: configuration + content + brand. Everything else lives here.

## Modules

| Module | Subpath | What it provides |
|---|---|---|
| `config` | `@ibalzam/codejitsu-core/config` | `defineConfig()` + types for the unified `codejitsu.config.ts` |
| `blog` | `@ibalzam/codejitsu-core/blog` | `createBlog()` (fs+gray-matter) and `createBlogFromCollection()` (Astro CC) with scheduled publishing, drafts, dual-slug, FAQs, tags, categories |
| `seo` | `@ibalzam/codejitsu-core/seo` | Sitemap helpers, schema.org JSON-LD builders, safe `jsonLd()` injection, `Head.astro` template |
| `images` | `codejitsu-optimize-images` CLI | PNG/JPG→WebP optimizer + `autoBlogImages` (one image per post slug) |
| `deploy` | (templates only) | GH Action daily-deploy + Cloudflare wrangler templates |
| `llms` | `codejitsu-llms` CLI | Generates `/llms.txt` + `/llms-full.txt`. Config-driven or content-scan modes |

Plus `checklist/` — sitewide invariants Claude verifies after any non-trivial change (`codejitsu-check` CLI).

## Unified config

Every module reads from one file at the site root: `codejitsu.config.ts` (or `.mjs`, `.json`, or `codejitsu` key in `package.json`).

```ts
import { defineConfig } from '@ibalzam/codejitsu-core/config';

export default defineConfig({
  site: { url: 'https://...', name: '...', business: { /* ... */ } },
  blog: { mode: 'collection', dateField: 'pubDate', draftField: 'draft' },
  seo: { sitemap: { excludePatterns: [/\/lp\//] } },
  images: { /* ... */ },
  llms: { mode: 'content-scan', /* ... */ },
  deploy: { /* ... */ },
});
```

See `modules/config/CLAUDE.md` for the full shape.

## How Claude uses this package

In a site that depends on `@ibalzam/codejitsu-core`, when the user says **"implement codejitsu/core/blog"** (or animations, or deploy, etc.), Claude reads `node_modules/@ibalzam/codejitsu-core/modules/<name>/CLAUDE.md` for instructions, imports code from the matching subpath, copies any templates, and runs the module's `checklist.md` to verify the result.

Start at `CLAUDE.md` (the master entry).

## Updating a site after a core release

```bash
npm update @ibalzam/codejitsu-core
# Then tell Claude: "we just upgraded codejitsu/core, check MIGRATIONS for anything that needs applying"
```

Migration notes live in `MIGRATIONS/<version>.md` as prose Claude reads and applies (not jscodeshift codemods — Claude does the work).
