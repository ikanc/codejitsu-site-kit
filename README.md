# @ibalzam/codejitsu-core

Shared core for all Codejitsu sites. Two channels per module:

- **Code** — importable via `@ibalzam/codejitsu-core/<module>` (Astro/TS).
- **Instructions** — a `CLAUDE.md` per module that tells Claude how to wire it into a site, what to do, what to avoid.

Sites stay thin: configuration + content + brand. Everything else lives here.

## Modules

| Module | Subpath | What it provides |
|---|---|---|
| `blog` | `@ibalzam/codejitsu-core/blog` | Markdown-based blog system with scheduled publishing, FAQs, tags, categories |
| `seo` | `@ibalzam/codejitsu-core/seo` | Sitemap helpers, schema.org JSON-LD builders, meta tag patterns |
| `images` | `@ibalzam/codejitsu-core/images` + `codejitsu-optimize-images` CLI | PNG/JPG→WebP pre-pass + Astro sharp defaults |
| `deploy` | (templates only) | GH Action daily-deploy + Cloudflare wrangler templates |
| `llms` | `codejitsu-llms` CLI | Generates `/llms.txt` + `/llms-full.txt` from site content |

Plus `checklist/` — sitewide invariants Claude verifies after any non-trivial change.

## How Claude uses this package

In a site that depends on `@ibalzam/codejitsu-core`, when the user says **"implement codejitsu/core/blog"** (or animations, or deploy, etc.), Claude reads `node_modules/@ibalzam/codejitsu-core/modules/<name>/CLAUDE.md` for instructions, imports code from the matching subpath, copies any templates, and runs the module's `checklist.md` to verify the result.

Start at `CLAUDE.md` (the master entry).

## Updating a site after a core release

```bash
npm update @ibalzam/codejitsu-core
# Then tell Claude: "we just upgraded codejitsu/core, check MIGRATIONS for anything that needs applying"
```

Migration notes live in `MIGRATIONS/<version>.md` as prose Claude reads and applies (not jscodeshift codemods — Claude does the work).
