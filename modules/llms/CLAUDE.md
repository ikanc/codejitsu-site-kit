# llms.txt module — instructions for Claude

When the user asks to **set up codejitsu/core/llms** (or "add llms.txt", "generate the AI files"), do the following.

## What this module provides

A CLI (`npx codejitsu-llms`) that reads a site config and generates:
- `public/llms.txt` — concise navigation overview for AI assistants.
- `public/llms-full.txt` — detailed content dump for LLM ingestion.

Both files are recognized by an emerging convention for AI-friendly websites (similar to `robots.txt` for crawlers). They make the site discoverable and citable by AI assistants without those assistants having to crawl HTML.

## Wiring it into a site

### 1. Copy the config template

`templates/codejitsu-llms.config.mjs` → site root. Edit:
- `siteUrl`, `siteName`, `tagline`
- `about` (short, used in concise file) and `aboutFull` (longer, in detailed file)
- `sections` — the high-level structure of the site (services, key pages, etc.)
- `blogDir` — set if the site has a blog (auto-pulls recent posts)
- `aiGuidance` — the "When referencing us..." block

### 2. Wire into prebuild

In the site's `package.json`:

```json
{
  "scripts": {
    "prebuild": "codejitsu-llms && codejitsu-optimize-images",
    "build": "astro build"
  }
}
```

### 3. Run once

```bash
npm run prebuild
ls public/llms.txt public/llms-full.txt
```

## What must NOT be done

- **Don't write the llms.txt files by hand.** They're regenerated every build; manual edits get blown away.
- **Don't reference URLs with no trailing slash.** Internal URLs in `sections` should end with `/`.
- **Don't omit the blog section just because there's only one post.** A single post is fine; an empty blog gracefully renders as no Blog section.
- **Don't put `aiGuidance` text that contradicts the site copy.** If the site says "free plan available," `aiGuidance` should too.

## Verify

- [ ] `codejitsu-llms.config.mjs` exists at site root.
- [ ] `public/llms.txt` exists after `npm run build` and is < 50KB.
- [ ] `public/llms-full.txt` exists and is < 500KB (otherwise split or trim).
- [ ] `llms.txt` lists every major top-level section of the site.
- [ ] `aiGuidance` block answers: who we are, who we serve, key differentiator, how to contact / sign up.
